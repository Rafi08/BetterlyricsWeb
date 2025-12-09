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

        // Check if lyrics are static (all 0 or only one line 0)
        const isStatic = lyrics.every(l => l.time === 0);
        if (isStatic) {
            setActiveLineIndex(-1);
            return;
        }

        // Find the active line (lines are sorted by time)
        const index = processedLyrics.findIndex((line, i) => {
            const nextLine = processedLyrics[i + 1];
            return effectivePosition >= line.time && (!nextLine || effectivePosition < nextLine.time);
        });

        if (index !== -1 && index !== activeLineIndex) {
            console.log(`[LyricsView] Update Active Index: ${index} (Pos: ${effectivePosition.toFixed(2)})`);
            setActiveLineIndex(index);
        } else if (index === -1 && processedLyrics.length > 0) {
            console.log(`[LyricsView] No active line found. Pos: ${effectivePosition.toFixed(2)}. First: ${processedLyrics[0].time}, Last: ${processedLyrics[processedLyrics.length - 1].time}`);
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

                        // Gap Logic
                        if ('isGap' in line) {
                            // Calculate duration based on next line time or default
                            const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 5);
                            const duration = Math.max(1, nextLineTime - line.time);

                            return (
                                <div
                                    key={`gap-${index}`}
                                    ref={isActive ? activeLineRef : null}
                                    className={`VocalsGroup`}
                                    style={{ margin: '2rem 0', opacity: isSung ? 0.3 : 1 }}
                                >
                                    <span
                                        className={`Vocals ${isActive ? 'Active' : ''}`}
                                        style={{
                                            fontSize: '2rem',
                                            '--duration': `${duration}s`,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            backgroundImage: isActive
                                                ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                : `linear-gradient(to right, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 50%)`,
                                            backgroundSize: '200% 100%',
                                            backgroundPosition: isActive ? '0 0' : '100% 0',
                                            animation: isActive ? `karaokeFill ${duration}s linear forwards` : 'none',
                                            color: 'transparent'
                                        } as React.CSSProperties}
                                    >
                                        • • •
                                    </span>
                                </div>
                            );
                        }

                        // Normal Line Logic
                        // Calculate line duration (fallback for when no word timings)
                        const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 5);
                        const lineDuration = Math.max(1, nextLineTime - line.time);

                        // If we have real word timings, use them!
                        if (line.words && line.words.length > 0) {
                            return (
                                <div
                                    key={index}
                                    ref={isActive ? activeLineRef : null}
                                    className={`VocalsGroup`}
                                    onClick={() => seek && seek(line.time * 1000)}
                                    style={{
                                        textAlign: line.oppositeAligned ? 'right' : 'left',
                                        alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%', // Create visual separation
                                        width: 'fit-content' // Allow it to shrink if line is short
                                    }}
                                >
                                    <span className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}>
                                        {line.words.map((word, wIndex) => {
                                            // word.time is absolute (seconds)
                                            // line.time is absolute (seconds)
                                            // We want delay relative to line start.
                                            // HOWEVER: CSS animation-delay starts counting when the class is added.
                                            // The class 'Active' is added roughly at `line.time`.
                                            // So `word.time - line.time` is the correct delay.
                                            let delay = Math.max(0, word.time - line.time);

                                            // Safety: Ensure delay isn't negative or huge if timestamps are weird.

                                            // Status within line
                                            const isWordActive = delay <= 0.2 && (delay + word.duration) > 0; // Approximate "playing now"
                                            // Better logic: The word is active if CurrentTime is within [word.time, word.endTime]
                                            // CurrentTime ~= effectivePosition

                                            // word.time is seconds. effectivePosition is seconds.
                                            // const isWordActive = effectivePosition >= word.time && effectivePosition < (word.time + word.duration);
                                            // Actually, we rely on the CSS delay which is derived from `word.time - line.time`.
                                            // The `Active` class (parent) starts at `line.time`.
                                            // Animation starts at `delay`.
                                            // So the word is "animating" from `delay` to `delay + word.duration`.

                                            const isWordSung = (effectivePosition > (word.time + word.duration));

                                            return (
                                                <span
                                                    key={wIndex}
                                                    className="Word"
                                                    style={{
                                                        display: 'inline-block',
                                                        marginRight: '0.3em',

                                                        // Combined Animation: Fill + Pop
                                                        // We can comma separate animations
                                                        animationName: isActive ? 'karaokeFill, wordPop' : 'none',
                                                        animationDuration: `${word.duration}s, ${word.duration}s`,
                                                        animationDelay: `${delay}s, ${delay}s`,
                                                        animationFillMode: 'forwards, none', // wordPop doesn't hold (returns to normal)
                                                        animationTimingFunction: 'linear, ease-in-out',

                                                        // Color Logic
                                                        color: isActive ? 'transparent' : 'white',
                                                        opacity: isSung || isWordSung ? 1 : (isActive ? 1 : 0.5), // Future words dimmed

                                                        // Gradient/Fill styles
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        backgroundImage: isActive
                                                            ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                            : 'none',
                                                        backgroundSize: '200% 100%',
                                                        backgroundPosition: '100% 0',

                                                        // Glow logic: "Only show on already sang words of the current line"
                                                        // Reduced glow as requested
                                                        textShadow: (isActive && isWordSung)
                                                            ? '0 0 10px rgba(255, 255, 255, 0.4)' // Reduced glow
                                                            : 'none',
                                                        transition: 'opacity 0.2s ease, text-shadow 0.2s ease'
                                                    }}
                                                >
                                                    {word.text}
                                                </span>
                                            );
                                        })}
                                    </span>
                                </div>
                            );
                        }

                        // Fallback: Simulated word sync (current behavior)
                        const words = line.text.split(' ');
                        const totalChars = line.text.length;
                        let accumulatedDelay = 0;

                        return (
                            <div
                                key={index}
                                ref={isActive ? activeLineRef : null}
                                className={`VocalsGroup`}
                                onClick={() => !('isGap' in line) && seek && seek(line.time * 1000)}
                                style={{
                                    textAlign: line.oppositeAligned ? 'right' : 'left',
                                    alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                    maxWidth: '70%',
                                    width: 'fit-content'
                                }}
                            >
                                <span className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}>
                                    {words.map((word, wIndex) => {
                                        const wordDuration = (word.length / totalChars) * lineDuration * 0.9;
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
