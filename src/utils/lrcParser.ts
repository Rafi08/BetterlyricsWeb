export interface LyricWord {
    text: string;
    time: number; // Start time relative to track start (in seconds)
    duration: number; // Duration in seconds
    syllables?: LyricWord[]; // Syllables that make up this word
}

export interface LyricLine {
    time: number; // in seconds
    text: string;
    words?: LyricWord[];
    oppositeAligned?: boolean;
    isBackground?: boolean;
    backgroundLines?: LyricLine[]; // Background vocals attached to this line
}

export function parseLrc(lrc: string): LyricLine[] {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();

            if (text) { // Skip empty lines if desired, or keep for spacing
                result.push({ time, text });
            }
        }
    }

    return result;
}
