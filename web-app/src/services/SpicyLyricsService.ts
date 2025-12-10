
import type { LyricLine, LyricWord } from '../utils/lrcParser';

const SPICY_API_URL = 'https://api.spicylyrics.org/query';
// Use a CORS proxy to bypass "Access-Control-Allow-Origin" restriction on the client side.
const PROXY_URL = 'https://corsproxy.io/?';
const API_URL = `${PROXY_URL}${encodeURIComponent(SPICY_API_URL)}`;

interface SpicyLyricsResponse {
    jobs: {
        processId: string;
        result: {
            status: number;
            type: string;
            responseData: any;
        };
    }[];
}

interface SpicySyllable {
    Text: string;
    StartTime: number; // in seconds
    EndTime: number; // in seconds
    IsPartOfWord: boolean;
}



export const SpicyLyricsService = {
    async fetchLyrics(trackId: string, token: string): Promise<LyricLine[]> {
        // Prepare the job request
        const jobs = [{
            handler: "lyrics",
            args: {
                id: trackId,
                auth: "SpicyLyrics-WebAuth",
            },
        }];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SpicyLyrics-Version': '5.18.55',
                'SpicyLyrics-WebAuth': `Bearer ${token}`
            },
            body: JSON.stringify({
                jobs,
                client: {
                    version: '5.18.55'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Spicy Lyrics API error: ${response.status}`);
        }

        const data: SpicyLyricsResponse = await response.json();
        const lyricsJob = data.jobs.find(j => j.result.type === 'json' || j.result.responseData); // Sometimes type matches, sometimes check data

        if (!lyricsJob || lyricsJob.result.status !== 200) {
            // Fallback or error
            console.warn('SpicyLyrics job failed or ignored', lyricsJob);
            throw new Error('Lyrics not found or API error');
        }

        const lyricsData = lyricsJob.result.responseData;
        console.log('SpicyLyrics Raw Data:', lyricsData); // DEBUG LOG
        const parsed = this.parseSpicyLyrics(lyricsData);
        if (parsed.length > 0) {
            console.log('[SpicyLyricsService] Parsed Lines:', parsed.length, 'First Line Words:', parsed[0].words);
        }
        return parsed;
    },

    parseSpicyLyrics(data: any): LyricLine[] {
        if (data.Type === 'Syllable') {
            return this.parseSyllableLyrics(data);
        } else if (data.Type === 'Line') {
            return this.parseLineLyrics(data);
        } else if (data.Type === 'Static') {
            return this.parseStaticLyrics(data);
        }
        return [];
    },

    parseSyllableLyrics(data: any): LyricLine[] {
        const lines: LyricLine[] = [];

        for (const content of data.Content) {
            if (content.Type === 'Vocal' && content.Lead) {
                const syllables: SpicySyllable[] = content.Lead.Syllables;
                const words: LyricWord[] = [];

                let currentWordText = "";
                let currentWordStart = -1;
                let currentWordEnd = 0;
                let currentWordSyllables: LyricWord[] = [];

                // Group syllables into words
                for (let i = 0; i < syllables.length; i++) {
                    const syl = syllables[i];

                    if (currentWordStart === -1) currentWordStart = syl.StartTime;

                    currentWordText += syl.Text;
                    currentWordEnd = syl.EndTime;

                    // Add syllable to current word's syllable list
                    currentWordSyllables.push({
                        text: syl.Text,
                        time: syl.StartTime,
                        duration: syl.EndTime - syl.StartTime
                    });

                    // If not part of word (end of word) or last syllable
                    if (!syl.IsPartOfWord || i === syllables.length - 1) {
                        words.push({
                            text: currentWordText.trim(), // Remove trailing spaces from specific syllables if any
                            time: currentWordStart,
                            duration: currentWordEnd - currentWordStart,
                            syllables: currentWordSyllables
                        });
                        currentWordText = "";
                        currentWordStart = -1;
                        currentWordSyllables = [];
                    }
                }

                const rawText = syllables.map((s) => s.Text + (s.IsPartOfWord ? "" : " ")).join("").trim();

                // Parse Background Vocals (if any)
                const backgroundLines: LyricLine[] = [];
                if (content.Background && Array.isArray(content.Background)) {
                    for (const bg of content.Background) {
                        let bgWords: LyricWord[] = [];
                        let bgText = "";

                        if (bg.Syllables && Array.isArray(bg.Syllables)) {
                            let curText = "";
                            let curStart = -1;
                            let curSyllables: LyricWord[] = [];

                            for (let k = 0; k < bg.Syllables.length; k++) {
                                const s = bg.Syllables[k];
                                if (curStart === -1) curStart = s.StartTime;
                                curText += s.Text;

                                curSyllables.push({
                                    text: s.Text,
                                    time: s.StartTime,
                                    duration: s.EndTime - s.StartTime
                                });

                                if (!s.IsPartOfWord || k === bg.Syllables.length - 1) {
                                    bgWords.push({
                                        text: curText.trim(),
                                        time: curStart,
                                        duration: s.EndTime - curStart,
                                        syllables: curSyllables
                                    });
                                    curText = "";
                                    curStart = -1;
                                    curSyllables = [];
                                }
                            }
                            bgText = bg.Syllables.map((s: SpicySyllable) => s.Text + (s.IsPartOfWord ? "" : " ")).join("").trim();
                        } else {
                            bgText = bg.Text || "";
                            bgWords.push({
                                text: bgText,
                                time: bg.StartTime,
                                duration: bg.EndTime - bg.StartTime
                            });
                        }

                        backgroundLines.push({
                            time: bg.StartTime,
                            text: bgText,
                            words: bgWords,
                            isBackground: true
                        });
                    }
                }

                lines.push({
                    time: content.Lead.StartTime,
                    text: rawText,
                    words: words,
                    oppositeAligned: content.OppositeAligned === true,
                    backgroundLines: backgroundLines.length > 0 ? backgroundLines : undefined
                });
            }
        }

        // Sort by time just in case
        return lines.sort((a, b) => a.time - b.time);
    },

    parseLineLyrics(data: any): LyricLine[] {
        const lines: LyricLine[] = [];
        if (data.Content) {
            for (const content of data.Content) {
                if (content.Type === 'Vocal') {
                    const startTime = content.StartTime ?? 0;
                    const endTime = content.EndTime ?? (startTime + 2);
                    const text = content.Text ?? "";
                    const lineDuration = endTime - startTime;

                    // Simulate word sync: split text into words and distribute time evenly
                    const wordTexts = text.split(' ').filter((w: string) => w.length > 0);
                    const wordDuration = lineDuration / wordTexts.length;
                    const words: LyricWord[] = wordTexts.map((wordText: string, idx: number) => ({
                        text: wordText,
                        time: startTime + (idx * wordDuration),
                        duration: wordDuration * 0.9 // Slight gap between words
                    }));

                    lines.push({
                        time: startTime,
                        text: text,
                        words: words,
                        oppositeAligned: content.OppositeAligned === true
                    });
                }
            }
        }
        return lines.sort((a, b) => a.time - b.time);
    },

    parseStaticLyrics(data: any): LyricLine[] {
        if (!data.Lines) return [];
        return data.Lines.map((l: any) => ({
            time: 0,
            text: l.Text
        }));
    }
};
