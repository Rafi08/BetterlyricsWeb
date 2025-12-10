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

    const effectivePosition = position + SYNC_OFFSET;

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
                                            fontSize: '3rem', // Bigger dots
                                            '--duration': `${duration}s`,
                                            // No gradient for dots, just color
                                            color: 'white',
                                            display: 'inline-flex',
                                            gap: '1rem',
                                            opacity: isSung ? 0.3 : 1
                                        } as React.CSSProperties}
                                    >
                                        {[0, 1, 2].map((_, dIndex) => (
                                            <span
                                                key={dIndex}
                                                style={{
                                                    display: 'inline-block',
                                                    animationName: isActive ? 'dotPulse' : 'none',
                                                    animationDuration: '2s', // Slow loop
                                                    animationDelay: `${dIndex * 0.5}s`, // Staggered
                                                    animationIterationCount: 'infinite',
                                                    animationTimingFunction: 'ease-in-out'
                                                }}
                                            >
                                                •
                                            </span>
                                        ))}
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
                                        maxWidth: '70%',
                                        width: 'fit-content',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <span
                                        className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}
                                    >
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
                                            // The word is "animating" from `delay` to `delay + word.duration`.

                                            const isWordSung = (effectivePosition > (word.time + word.duration));

                                            // CHAR SPLIT LOGIC - only for truly long words (>1s)
                                            const isLongWord = word.duration > 1.0;
                                            const chars = isLongWord ? word.text.split('') : null;

                                            // Word-level states for visual feedback
                                            const isWordActive = position >= word.time * 1000 &&
                                                position < (word.time + word.duration) * 1000;

                                            // Dynamic epic effect based on duration
                                            // Longer words = bigger pop and more glow
                                            const epicFactor = Math.min(1.5, word.duration / 0.5);
                                            const epicScale = 1 + (0.08 * epicFactor); // Max 1.12
                                            const epicY = -0.15 * epicFactor; // Max -0.225em
                                            const epicGlow = Math.min(20, 8 + (word.duration * 8)); // 8-20px glow

                                            return (
                                                <span
                                                    key={wIndex}
                                                    className="Word"
                                                    style={{
                                                        display: 'inline-block',
                                                        marginRight: '0.3em',

                                                        // Pass dynamic values to CSS for epic pop
                                                        '--pop-scale': epicScale,
                                                        '--pop-y': `${epicY}em`,

                                                        // Animation: Trigger on LINE active, with word delay
                                                        animationName: isActive ? 'karaokeFill, wordPop' : 'none',
                                                        animationDuration: `${word.duration}s, ${word.duration + 0.8}s`,
                                                        animationDelay: `${delay}s, ${delay}s`,
                                                        animationFillMode: 'forwards, none',
                                                        animationTimingFunction: 'linear, ease-out',

                                                        // Color Logic - transparent when line active so gradient shows
                                                        color: isActive ? 'transparent' : (isWordSung ? 'white' : 'rgba(255,255,255,0.5)'),
                                                        opacity: isWordSung ? 1 : (isActive ? 1 : 0.5),

                                                        // Gradient/Fill styles - always set when line active
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        backgroundImage: isActive
                                                            ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                            : (isWordSung ? 'none' : 'none'),
                                                        backgroundSize: '200% 100%',
                                                        backgroundPosition: '100% 0',

                                                        // Epic glow on sung words - intensity based on duration
                                                        textShadow: isWordSung
                                                            ? `0 0 ${epicGlow}px rgba(255, 255, 255, 0.6)`
                                                            : 'none',
                                                        transition: 'text-shadow 0.5s ease'
                                                    } as React.CSSProperties}
                                                >
                                                    {isLongWord && isWordActive ? chars!.map((char, cIndex) => {
                                                        const charDuration = word.duration / chars!.length;
                                                        const charDelay = cIndex * charDuration * 0.6;

                                                        return (
                                                            <span key={cIndex} style={{
                                                                display: 'inline-block',
                                                                animationName: 'wordPop',
                                                                animationDuration: `${charDuration + 0.4}s`,
                                                                animationDelay: `${charDelay}s`,
                                                                animationFillMode: 'none',
                                                                animationTimingFunction: 'ease-out',
                                                                background: 'transparent'
                                                            }}>
                                                                {char}
                                                            </span>
                                                        )
                                                    }) : word.text}
                                                </span>
                                            );
                                        })}
                                    </span>

                                    {/* Background Vocals - render below main line */}
                                    {line.backgroundLines && line.backgroundLines.map((bgLine, bgIndex) => {
                                        const bgIsActive = position >= bgLine.time * 1000 &&
                                            position < (bgLine.time + (bgLine.words?.[bgLine.words.length - 1]?.time || 0) + (bgLine.words?.[bgLine.words.length - 1]?.duration || 2)) * 1000;

                                        return (
                                            <span
                                                key={`bg-${bgIndex}`}
                                                className={`Vocals ${bgIsActive ? 'Active' : ''}`}
                                                style={{
                                                    fontSize: '100%',
                                                    fontWeight: 500,
                                                    opacity: 0.8,
                                                    alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                {bgLine.words?.map((word, wIndex) => {
                                                    const wordDelay = Math.max(0, word.time - bgLine.time);
                                                    const wordActive = bgIsActive &&
                                                        position >= word.time * 1000 &&
                                                        position < (word.time + word.duration) * 1000;
                                                    const wordSung = position >= (word.time + word.duration) * 1000;

                                                    return (
                                                        <span
                                                            key={wIndex}
                                                            className="Word"
                                                            style={{
                                                                display: 'inline-block',
                                                                marginRight: '0.3em',
                                                                // Combined animation: karaokeFill + wordPop
                                                                animationName: wordActive ? 'karaokeFill, wordPop' : 'none',
                                                                animationDuration: `${word.duration}s, ${word.duration + 0.4}s`,
                                                                animationDelay: `${wordDelay}s, ${wordDelay}s`,
                                                                animationFillMode: 'forwards, none',
                                                                animationTimingFunction: 'linear, ease-out',
                                                                color: wordActive ? 'transparent' : 'white',
                                                                opacity: wordSung ? 1 : (wordActive ? 1 : 0.5),
                                                                backgroundClip: 'text',
                                                                WebkitBackgroundClip: 'text',
                                                                backgroundImage: wordActive
                                                                    ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`
                                                                    : 'none',
                                                                backgroundSize: '200% 100%',
                                                                backgroundPosition: '100% 0',
                                                                textShadow: wordSung ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
                                                                transition: 'opacity 0.3s ease, text-shadow 0.3s ease'
                                                            } as React.CSSProperties}
                                                        >
                                                            {word.text}
                                                        </span>
                                                    );
                                                }) || bgLine.text}
                                            </span>
                                        );
                                    })}
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
