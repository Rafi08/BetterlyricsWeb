import React, { useEffect, useRef, useState, useMemo } from 'react';
import { type LyricLine } from '../utils/lrcParser';
import '../styles/Lyrics.scss';

interface LyricsViewProps {
    lyrics: LyricLine[];
    position: number; // in seconds
    seek: (pos: number) => void;
}

const SYNC_OFFSET = 0.4; // Seconds to compensate for "late" lyrics
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
            result.push({ isGap: true, time: 0.5 } as any);
        }

        for (let i = 0; i < lyrics.length; i++) {
            result.push(lyrics[i]);
            if (i < lyrics.length - 1) {
                const currentEnd = lyrics[i].time;
                const nextStart = lyrics[i + 1].time;
                if (nextStart - currentEnd > GAP_THRESHOLD + 3) {
                    result.push({ isGap: true, time: currentEnd + 2 } as any);
                }
            }
        }
        return result;
    }, [lyrics]);

    useEffect(() => {
        if (!lyrics) return;
        const effectivePosition = position + SYNC_OFFSET;
        const isStatic = lyrics.every(l => l.time === 0);
        if (isStatic) {
            setActiveLineIndex(-1);
            return;
        }

        const index = processedLyrics.findIndex((line, i) => {
            const nextLine = processedLyrics[i + 1];
            return effectivePosition >= line.time && (!nextLine || effectivePosition < nextLine.time);
        });

        if (index !== -1 && index !== activeLineIndex) {
            setActiveLineIndex(index);
        }
    }, [position, processedLyrics, activeLineIndex]);

    useEffect(() => {
        // Debounce scroll to prevent jitter? 
        // Or simply trust smooth scroll. 
        // The main jitter comes from layout shifts, which we are fixing below.
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
                        // Gap Logic
                        if ('isGap' in line) {
                            const nextLineTime = processedLyrics[index + 1]?.time || (line.time + 5);
                            const duration = Math.max(1, nextLineTime - line.time);
                            const isActive = effectivePosition >= line.time && effectivePosition < nextLineTime;
                            const isSung = effectivePosition >= nextLineTime;

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
                                            fontSize: '3rem',
                                            '--duration': `${duration}s`,
                                            display: 'inline-flex',
                                            gap: '1rem',
                                            opacity: isSung ? 0.3 : 1
                                        } as React.CSSProperties}
                                    >
                                        {[0, 1, 2].map((_, dIndex) => {
                                            const dotDuration = duration / 3;
                                            const dotDelay = dIndex * dotDuration;
                                            return (
                                                <span
                                                    key={dIndex}
                                                    style={{
                                                        display: 'inline-block',
                                                        animationName: isActive ? 'dotPulse, dotFill' : 'none',
                                                        animationDuration: isActive ? `1.5s, ${dotDuration}s` : '0s',
                                                        animationDelay: `${dIndex * 0.3}s, ${dotDelay}s`,
                                                        animationIterationCount: 'infinite, 1',
                                                        animationTimingFunction: 'ease-in-out, linear',
                                                        animationFillMode: 'none, forwards',
                                                        color: 'transparent',
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        backgroundImage: `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.36) 50%)`,
                                                        backgroundSize: '200% 100%',
                                                        backgroundPosition: '100% 0'
                                                    } as React.CSSProperties}
                                                >
                                                    •
                                                </span>
                                            );
                                        })}
                                    </span>
                                </div>
                            );
                        }

                        // Normal Line Logic
                        const lineStartTime = line.time;
                        const lastWord = line.words && line.words.length > 0 ? line.words[line.words.length - 1] : null;
                        const lineEndTime = lastWord
                            ? (lastWord.time + lastWord.duration)
                            : (processedLyrics[index + 1]?.time || (line.time + 5));

                        const isActive = effectivePosition >= lineStartTime && effectivePosition < lineEndTime;
                        const isSung = effectivePosition >= lineEndTime;

                        // Render background vocals independently with their own timing
                        const renderBackgroundVocals = () => {
                            if (!line.backgroundLines) return null;

                            return line.backgroundLines.map((bgLine, bgIndex) => {
                                const lastBgWord = bgLine.words?.[bgLine.words.length - 1];
                                const bgEndTime = lastBgWord ? (lastBgWord.time + lastBgWord.duration) : (bgLine.time + 3);

                                const bgIsActive = effectivePosition >= bgLine.time && effectivePosition < bgEndTime;
                                const bgIsSung = effectivePosition >= bgEndTime;

                                // Render with words if available and active
                                if (bgLine.words && bgLine.words.length > 0 && bgIsActive) {
                                    return (
                                        <span
                                            key={`bg-${bgIndex}`}
                                            style={{
                                                display: 'inline-block',
                                                fontSize: '2.4rem',
                                                fontWeight: 500,
                                                opacity: 1,
                                                filter: 'blur(0)',
                                                transform: 'scale(1.02)',
                                                transformOrigin: 'left center',
                                                transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.4s ease',
                                                alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {bgLine.words.map((word, wIndex) => {
                                                const wordDelay = Math.max(0, word.time - bgLine.time);
                                                const wordSung = effectivePosition >= (word.time + word.duration);

                                                // Ensure minimum animation duration for visibility
                                                const minAnimDuration = 0.15;
                                                const wordAnimDuration = Math.max(minAnimDuration, word.duration);

                                                return (
                                                    <span
                                                        key={wIndex}
                                                        className="Word"
                                                        style={{
                                                            display: 'inline-block',
                                                            marginRight: '0.3em',
                                                            animationName: 'karaokeFill, wordPop',
                                                            animationDuration: `${wordAnimDuration}s, ${word.duration + 0.5}s`,
                                                            animationDelay: `${wordDelay}s, ${wordDelay}s`,
                                                            animationFillMode: 'forwards, none',
                                                            animationTimingFunction: 'linear, ease-out',
                                                            color: 'transparent',
                                                            opacity: wordSung ? 1 : 1,
                                                            backgroundClip: 'text',
                                                            WebkitBackgroundClip: 'text',
                                                            backgroundImage: `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.3) 50%)`,
                                                            backgroundSize: '200% 100%',
                                                            backgroundPosition: '100% 0',
                                                            textShadow: wordSung ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                                                            transition: 'text-shadow 0.4s ease'
                                                        }}
                                                    >
                                                        {word.text}
                                                    </span>
                                                );
                                            })}
                                        </span>
                                    );
                                }

                                // Simple rendering for non-active or text-only
                                return (
                                    <span
                                        key={`bg-${bgIndex}`}
                                        style={{
                                            display: 'inline-block',
                                            fontSize: '2.4rem',
                                            opacity: bgIsSung ? 0.7 : 0.5,
                                            marginLeft: '0',
                                            fontWeight: 500,
                                            filter: bgIsActive ? 'blur(0)' : 'blur(0.5px)',
                                            transform: bgIsActive ? 'scale(1.02)' : 'scale(0.98)',
                                            transformOrigin: 'left center',
                                            alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                            transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.4s ease'
                                        }}>
                                        {bgLine.text}
                                    </span>
                                );
                            });
                        };

                        // OPTIMIZATION: If line is not active, render simpler version
                        if (!isActive) {
                            const displayWords = (line.words && line.words.length > 0)
                                ? line.words.map(w => w.text)
                                : line.text.split(' ');

                            // Check if any background vocals are still active
                            const hasActiveBgVocals = line.backgroundLines?.some(bgLine => {
                                const lastBgWord = bgLine.words?.[bgLine.words.length - 1];
                                const bgEndTime = lastBgWord ? (lastBgWord.time + lastBgWord.duration) : (bgLine.time + 3);
                                return effectivePosition >= bgLine.time && effectivePosition < bgEndTime;
                            });

                            return (
                                <div
                                    key={index}
                                    className="VocalsGroup"
                                    onClick={() => seek && seek(line.time * 1000)}
                                    // MATCH ACTIVE LAYOUT: flex col, gap 0.25rem
                                    style={{
                                        textAlign: line.oppositeAligned ? 'right' : 'left',
                                        alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%',
                                        width: 'fit-content',
                                        // Don't dim if background vocals are still active
                                        opacity: (isSung && !hasActiveBgVocals) ? 0.5 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <span className={`Vocals ${isSung ? 'Sung' : ''}`}>
                                        {displayWords.map((txt, wIndex) => (
                                            <span
                                                key={wIndex}
                                                className="Word"
                                                style={{
                                                    display: 'inline-block',
                                                    marginRight: '0.3em',
                                                    color: isSung ? 'white' : 'white',
                                                    opacity: isSung ? 1 : 0.5
                                                }}
                                            >
                                                {txt}
                                            </span>
                                        ))}
                                    </span>
                                    {/* Render background vocals independently */}
                                    {renderBackgroundVocals()}
                                </div>
                            )
                        }

                        // ACTIVE LINE RENDER LOOP
                        if (!line.words || line.words.length === 0) {
                            // Active Fallback (Simulated)
                            const words = line.text.split(' ');
                            const totalChars = line.text.length;
                            const lineDur = Math.max(1, lineEndTime - lineStartTime);
                            let accumulatedDelay = 0;

                            return (
                                <div
                                    key={index}
                                    ref={activeLineRef}
                                    className={`VocalsGroup`}
                                    onClick={() => seek && seek(line.time * 1000)}
                                    style={{
                                        textAlign: line.oppositeAligned ? 'right' : 'left',
                                        alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%',
                                        width: 'fit-content'
                                    }}
                                >
                                    <span className={`Vocals Active`}>
                                        {words.map((word, wIndex) => {
                                            const wordDuration = (word.length / totalChars) * lineDur * 0.9;
                                            const currentDelay = accumulatedDelay;
                                            accumulatedDelay += wordDuration;

                                            return (
                                                <span
                                                    key={wIndex}
                                                    className="Word"
                                                    style={{
                                                        display: 'inline-block',
                                                        marginRight: '0.3em',
                                                        animationName: 'karaokeFill', // Simple fill for fallback
                                                        animationDuration: `${wordDuration}s`,
                                                        animationDelay: `${currentDelay}s`,
                                                        animationFillMode: 'forwards',
                                                        animationTimingFunction: 'linear',
                                                        color: 'rgba(255,255,255,0.5)', // Base
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        backgroundImage: `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.5) 50%)`,
                                                        backgroundSize: '200% 100%',
                                                        backgroundPosition: '100% 0'
                                                    }}
                                                >
                                                    {word}
                                                </span>
                                            );
                                        })}
                                    </span>
                                </div>
                            );
                        }

                        // Active Real Lyrics
                        return (
                            <div
                                key={index}
                                ref={activeLineRef}
                                className={`VocalsGroup`}
                                onClick={() => seek && seek(line.time * 1000)}
                                style={{
                                    textAlign: line.oppositeAligned ? 'right' : 'left',
                                    alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start',
                                    maxWidth: '70%',
                                    width: 'fit-content',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    willChange: 'transform, opacity' // Hint for compositing
                                }}
                            >
                                <span className={`Vocals Active`}>
                                    {line.words.map((word, wIndex) => {
                                        const delay = Math.max(0, word.time - line.time);
                                        const isWordSung = effectivePosition >= (word.time + word.duration);
                                        const isWordActive = effectivePosition >= word.time && effectivePosition < (word.time + word.duration);

                                        const epicFactor = Math.min(1.5, word.duration / 0.5);
                                        const epicScale = 1 + (0.08 * epicFactor);
                                        const epicY = -0.15 * epicFactor;
                                        const epicGlow = Math.min(20, 8 + (word.duration * 8));

                                        const hasSyllables = word.syllables && word.syllables.length > 0;

                                        return (
                                            <span
                                                key={wIndex}
                                                className="Word"
                                                style={{
                                                    display: 'inline-block',
                                                    marginRight: '0.3em',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {hasSyllables ? (
                                                    word.syllables!.map((syl, sIndex) => {
                                                        const sylDelay = Math.max(0, syl.time - line.time);
                                                        const isSylSung = effectivePosition >= (syl.time + syl.duration);
                                                        const isSylActive = effectivePosition >= syl.time && effectivePosition < (syl.time + syl.duration);

                                                        const sylEpicFactor = Math.min(1.5, syl.duration / 0.5);
                                                        const sylEpicScale = 1 + (0.05 * sylEpicFactor);
                                                        const sylEpicY = -0.1 * sylEpicFactor;

                                                        // Ensure minimum animation duration for visibility
                                                        const minAnimDuration = 0.15;
                                                        const sylAnimDuration = Math.max(minAnimDuration, syl.duration);

                                                        return (
                                                            <span
                                                                key={sIndex}
                                                                style={{
                                                                    display: 'inline-block',
                                                                    position: 'relative',
                                                                    '--pop-scale': sylEpicScale,
                                                                    '--pop-y': `${sylEpicY}em`,
                                                                    animationName: 'wordPop',
                                                                    animationDuration: `${syl.duration + 0.8}s`,
                                                                    animationDelay: `${sylDelay}s`,
                                                                    animationFillMode: 'none',
                                                                    animationTimingFunction: 'ease-out',
                                                                } as React.CSSProperties}
                                                            >
                                                                {/* Backing Layer */}
                                                                <span style={{
                                                                    color: isSylSung ? 'white' : 'rgba(255,255,255,0.5)',
                                                                    opacity: isSylSung ? 1 : (isSylActive ? 1 : 0.5),
                                                                    transition: 'color 0.1s'
                                                                }}>
                                                                    {syl.text}
                                                                </span>

                                                                {/* Overlay Layer (Heavy Effect) */}
                                                                {(isSylActive || isSylSung) && (
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        color: 'transparent',
                                                                        backgroundClip: 'text',
                                                                        WebkitBackgroundClip: 'text',
                                                                        backgroundImage: isSylSung
                                                                            ? `linear-gradient(to right, white 100%, white 100%)`
                                                                            : `linear-gradient(to right, white 50%, transparent 50%)`,
                                                                        backgroundSize: '200% 100%',

                                                                        animationName: isSylActive ? 'karaokeFill' : 'none',
                                                                        animationDuration: `${sylAnimDuration}s`,
                                                                        animationDelay: '0s',
                                                                        animationFillMode: 'forwards',
                                                                        animationTimingFunction: 'linear',

                                                                        filter: `drop-shadow(0 0 ${epicGlow}px white)`,
                                                                        // SMOOTHER FADE OUT: 2s
                                                                        opacity: isSylActive ? 1 : 0,
                                                                        transition: 'opacity 2s ease-out',
                                                                        willChange: 'opacity, background-position'
                                                                    }}>
                                                                        {syl.text}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    // Whole Word Fallback
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            position: 'relative',
                                                            '--pop-scale': epicScale,
                                                            '--pop-y': `${epicY}em`,
                                                            animationName: 'wordPop',
                                                            animationDuration: `${word.duration + 0.8}s`,
                                                            animationDelay: `${delay}s`,
                                                            animationFillMode: 'none',
                                                            animationTimingFunction: 'ease-out',
                                                        } as React.CSSProperties}
                                                    >
                                                        <span style={{
                                                            color: isWordSung ? 'white' : 'rgba(255,255,255,0.5)',
                                                            opacity: isWordSung ? 1 : 0.5,
                                                            transition: 'color 0.1s'
                                                        }}>
                                                            {word.text}
                                                        </span>

                                                        {(() => {
                                                            // Ensure minimum animation duration for visibility
                                                            const minAnimDuration = 0.15;
                                                            const wordAnimDuration = Math.max(minAnimDuration, word.duration);

                                                            return (isWordActive || isWordSung) && (
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    color: 'transparent',
                                                                    backgroundClip: 'text',
                                                                    WebkitBackgroundClip: 'text',
                                                                    backgroundImage: isWordSung
                                                                        ? `linear-gradient(to right, white 100%, white 100%)`
                                                                        : `linear-gradient(to right, white 50%, transparent 50%)`,
                                                                    backgroundSize: '200% 100%',

                                                                    animationName: isWordActive ? 'karaokeFill' : 'none',
                                                                    animationDuration: `${wordAnimDuration}s`,
                                                                    animationDelay: '0s',
                                                                    animationFillMode: 'forwards',
                                                                    animationTimingFunction: 'linear',

                                                                    filter: `drop-shadow(0 0 ${epicGlow}px white)`,
                                                                    opacity: isWordActive ? 1 : 0,
                                                                    transition: 'opacity 2s ease-out',
                                                                    willChange: 'opacity, background-position'

                                                                }}>
                                                                    {word.text}
                                                                </span>
                                                            );
                                                        })()}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </span>

                                {/* Render background vocals independently */}
                                {renderBackgroundVocals()}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LyricsView;
