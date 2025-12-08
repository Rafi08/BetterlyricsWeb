import React, { useEffect, useRef, useState, useMemo } from 'react';
import { type LyricLine } from '../utils/lrcParser';
import '../styles/Lyrics.scss';

interface LyricsViewProps {
    lyrics: LyricLine[];
    position: number; // in seconds
    seek: (pos: number) => void;
}

const SYNC_OFFSET = 0.5; // Seconds to compensate for "late" lyrics (advances internal time)
const GAP_THRESHOLD = 5; // Seconds to consider a gap "instrumental"

const LyricsView: React.FC<LyricsViewProps> = ({ lyrics, position, seek }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);

    // Process lyrics to include visual gaps
    const processedLyrics = useMemo(() => {
        if (!lyrics || lyrics.length === 0) return [];

        const result: (LyricLine | { isGap: true, time: number })[] = [];

        for (let i = 0; i < lyrics.length; i++) {
            result.push(lyrics[i]);

            // Check for gap
            if (i < lyrics.length - 1) {
                const currentEnd = lyrics[i].time;
                const nextStart = lyrics[i + 1].time;

                // If there is a significant instrumental gap
                if (nextStart - currentEnd > GAP_THRESHOLD) {
                    // Approximate time for the dots to appear
                    result.push({ isGap: true, time: currentEnd + 2 } as any);
                }
            }
        }
        return result;
    }, [lyrics]);

    useEffect(() => {
        if (!lyrics) return;

        // Use compensated position
        const effectivePosition = position + SYNC_OFFSET;

        // Find the active line (lines are sorted by time)
        const index = processedLyrics.findIndex((line, i) => {
            const nextLine = processedLyrics[i + 1];
            return effectivePosition >= line.time && (!nextLine || effectivePosition < nextLine.time);
        });

        if (index !== -1 && index !== activeLineIndex) {
            setActiveLineIndex(index);
        }
    }, [position, processedLyrics]); // Removed activeLineIndex to avoid redundant updates, logic is sound

    useEffect(() => {
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [activeLineIndex]);

    return (
        <div className="LyricsScrollContainer" ref={containerRef}>
            <div className="Lyrics">
                {processedLyrics.length === 0 ? (
                    <div className="VocalsGroup">
                        <span className="Vocals">...</span>
                    </div>
                ) : (
                    processedLyrics.map((line, index) => {
                        // Check if it's a gap filler
                        if ('isGap' in line) {
                            return (
                                <div
                                    key={`gap-${index}`}
                                    className={`VocalsGroup ${index <= activeLineIndex ? 'Sung' : ''}`}
                                    style={{ opacity: 0.3, fontSize: '2rem', margin: '2rem 0' }}
                                >
                                    <span className="Vocals">• • •</span>
                                </div>
                            );
                        }

                        const isActive = index === activeLineIndex;
                        const isSung = index < activeLineIndex;

                        const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 3);
                        // Ensure a minimum duration of 1s to avoid glitchy super-fast fills
                        const duration = Math.max(1, nextLineTime - line.time);

                        return (
                            <div
                                key={index}
                                ref={isActive ? activeLineRef : null}
                                className={`VocalsGroup`}
                                onClick={() => !('isGap' in line) && seek && seek(line.time * 1000)}
                            >
                                <span
                                    className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}
                                    style={{ '--duration': `${duration}s` } as React.CSSProperties}
                                >
                                    {line.text}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LyricsView;
