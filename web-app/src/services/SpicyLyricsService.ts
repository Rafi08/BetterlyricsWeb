
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

                // Group syllables into words
                for (let i = 0; i < syllables.length; i++) {
                    const syl = syllables[i];

                    if (currentWordStart === -1) currentWordStart = syl.StartTime;

                    currentWordText += syl.Text;
                    currentWordEnd = syl.EndTime;

                    // If not part of word (end of word) or last syllable
                    if (!syl.IsPartOfWord || i === syllables.length - 1) {
                        words.push({
                            text: currentWordText.trim(), // Remove trailing spaces from specific syllables if any
                            time: currentWordStart,
                            duration: currentWordEnd - currentWordStart
                        });
                        currentWordText = "";
                        currentWordStart = -1;
                    }
                }

                const rawText = syllables.map((s) => s.Text + (s.IsPartOfWord ? "" : " ")).join("").trim();


                lines.push({
                    time: content.Lead.StartTime,
                    text: rawText,
                    words: words,
                    oppositeAligned: content.OppositeAligned === true
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
                    lines.push({
                        time: content.Lead?.StartTime ?? 0,
                        text: content.Text ?? "",
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
