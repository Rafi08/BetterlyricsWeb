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
            result.push({ isGap: true, time: 0.5 } as any); // Start almost immediately
        }

        for (let i = 0; i < lyrics.length; i++) {
            result.push(lyrics[i]);

            // Check for gap
            if (i < lyrics.length - 1) {
                const currentEnd = lyrics[i].time;
                const nextStart = lyrics[i + 1].time;

                if (nextStart - currentEnd > GAP_THRESHOLD + 3) {
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
                        const isActive = index === activeLineIndex;
                        const isSung = index < activeLineIndex;

                        // Calculate duration regardless of line type
                        const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 5);
                        const duration = Math.max(1, nextLineTime - line.time);

                        // If GAP item:
                        if ('isGap' in line) {
                            return (
                                <div
                                    key={`gap-${index}`}
                                    ref={isActive ? activeLineRef : null}
                                    className={`VocalsGroup`} // removed sung check diff
                                    style={{ margin: '2rem 0', opacity: isSung ? 0.3 : 1 }}
                                >
                                    <span
                                        className={`Vocals ${isActive ? 'Active' : ''}`}
                                        style={{
                                            // Apply filling animation to the WHOLE block of dots
                                            fontSize: '2rem',
                                            '--duration': `${duration}s`,

                                            // Ensure the fill works like words
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            backgroundImage: isActive
                                                ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                : `linear-gradient(to right, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 50%)`, // Idle state color
                                            backgroundSize: '200% 100%',
                                            backgroundPosition: isActive ? '0 0' : '100% 0',
                                            // Use the global keyframe defined in SCSS
                                            animation: isActive ? `karaokeFill ${duration}s linear forwards` : 'none',

                                            color: 'transparent' // Important for background clip
                                        } as React.CSSProperties}
                                    >
                                        • • •
                                    </span>
                                </div>
                            );
                        }

                        // Normal Line Logic
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
                                        const wordDuration = (word.length / totalChars) * duration * 0.9; // 0.9 factor to finish slightly before next line
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
                                                    color: isSung ? 'white' : 'inherit',
                                                    opacity: isSung ? 0.5 : 1,
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
