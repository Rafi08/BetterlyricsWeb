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

    // Process lyrics to include visual gaps & Intro gap
    const processedLyrics = useMemo(() => {
        if (!lyrics || lyrics.length === 0) return [];

        const result: (LyricLine | { isGap: true, time: number })[] = [];

        // 1. Intro Gap Detection
        if (lyrics[0].time > GAP_THRESHOLD) {
            result.push({ isGap: true, time: 2 } as any);
        }

        for (let i = 0; i < lyrics.length; i++) {
            result.push(lyrics[i]);

            // Check for gap
            if (i < lyrics.length - 1) {
                const currentEnd = lyrics[i].time; // Actually start time of current
                // Note: Standard LRC doesn't have end times, so we check diff between starts

                const nextStart = lyrics[i + 1].time;

                // If there is a significant instrumental gap
                // We assume line duration is roughy 3s if unknown, but here we just check start-to-start dist
                if (nextStart - currentEnd > GAP_THRESHOLD + 3) {
                    // Approximate time for the dots to appear
                    result.push({ isGap: true, time: currentEnd + 5 } as any);
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
    }, [position, processedLyrics]);

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
                                    {/* Added Start/End Dots animation class */}
                                    <span className="Vocals Dots">• • •</span>
                                </div>
                            );
                        }

                        const isActive = index === activeLineIndex;
                        const isSung = index < activeLineIndex;

                        const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 3);
                        const duration = Math.max(1, nextLineTime - line.time);

                        // Simulated Word-by-Word Sync
                        // Split line into words and distribute duration based on length
                        const words = line.text.split(' ');
                        const totalChars = line.text.length;
                        let accumulatedDelay = 0;

                        return (
                            <div
                                key={index}
                                ref={isActive ? activeLineRef : null}
                                className={`VocalsGroup`}
                                onClick={() => !('isGap' in line) && seek && seek(line.time * 1000)}
                            >
                                <span className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}>
                                    {words.map((word, wIndex) => {
                                        // Calculate roughly how much time this word takes
                                        const wordDuration = (word.length / totalChars) * duration;
                                        const currentDelay = accumulatedDelay;
                                        accumulatedDelay += wordDuration;

                                        return (
                                            <span
                                                key={wIndex}
                                                className="Word"
                                                style={{
                                                    display: 'inline-block',
                                                    marginRight: '0.3em',
                                                    animationName: isActive ? 'karaokeFill' : 'none',
                                                    animationDuration: `${wordDuration}s`,
                                                    animationDelay: `${currentDelay}s`,
                                                    animationFillMode: 'forwards',
                                                    animationTimingFunction: 'linear',
                                                    // Base state (before animation)
                                                    color: isSung ? 'white' : 'inherit',
                                                    opacity: isSung ? 0.5 : 1,

                                                    // We need to apply background clip to EACH WORD for this effect to work
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundImage: isActive
                                                        ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                        : 'none',
                                                    backgroundSize: '200% 100%',
                                                    backgroundPosition: '100% 0',
                                                }}
                                            >
                                                {word}
                                            </span>
                                        );
                                    })}
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
