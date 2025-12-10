import React, { useEffect, useRef, useState, useMemo } from 'react';
import { type LyricLine } from '../utils/lrcParser';
import '../styles/Lyrics.scss';

interface LyricsViewProps {
    lyrics: LyricLine[];
    position: number; // in seconds
    seek: (pos: number) => void;
}

const SYNC_OFFSET = 0.5; // Seconds to compensate for "late" lyrics
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
                                                        backgroundImage: `linear-gradient(to right, white 50%, rgba(255,255,255,0.3) 50%)`,
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
                        // Estimate line end based on last word or next line
                        const lastWord = line.words && line.words.length > 0 ? line.words[line.words.length - 1] : null;
                        const lineEndTime = lastWord
                            ? (lastWord.time + lastWord.duration)
                            : (processedLyrics[index + 1]?.time || (line.time + 5));

                        const isActive = effectivePosition >= lineStartTime && effectivePosition < lineEndTime;
                        const isSung = effectivePosition >= lineEndTime;

                        // Fallback logic check
                        if (!line.words || line.words.length === 0) {
                            // Simulated sync fallback (simplified)
                            const words = line.text.split(' ');
                            const totalChars = line.text.length;
                            const lineDur = Math.max(1, lineEndTime - lineStartTime);
                            let accumulatedDelay = 0;

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
                                        width: 'fit-content'
                                    }}
                                >
                                    <span className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}>
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
                                                        // Fallback uses simple gradient fill
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
                                <span className={`Vocals ${isActive ? 'Active' : ''} ${isSung ? 'Sung' : ''}`}>
                                    {line.words.map((word, wIndex) => {
                                        const delay = Math.max(0, word.time - line.time);
                                        const isWordSung = effectivePosition > (word.time + word.duration);
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
                                                        const isSylSung = effectivePosition > (syl.time + syl.duration);
                                                        const isSylActive = effectivePosition >= syl.time && effectivePosition < (syl.time + syl.duration);

                                                        const sylEpicFactor = Math.min(1.5, syl.duration / 0.5);
                                                        const sylEpicScale = 1 + (0.05 * sylEpicFactor);
                                                        const sylEpicY = -0.1 * sylEpicFactor;

                                                        return (
                                                            <span
                                                                key={sIndex}
                                                                style={{
                                                                    display: 'inline-block',
                                                                    position: 'relative',
                                                                    '--pop-scale': sylEpicScale,
                                                                    '--pop-y': `${sylEpicY}em`,
                                                                    // Pop animation on CONTAINER
                                                                    animationName: isActive ? 'wordPop' : 'none',
                                                                    animationDuration: `${syl.duration + 0.8}s`,
                                                                    animationDelay: `${sylDelay}s`,
                                                                    animationFillMode: 'none',
                                                                    animationTimingFunction: 'ease-out',
                                                                } as React.CSSProperties}
                                                            >
                                                                {/* Backing Layer (Grey/Inactive) */}
                                                                <span style={{
                                                                    color: isSylSung ? 'white' : 'rgba(255,255,255,0.5)',
                                                                    opacity: isSylSung ? 1 : (isActive ? 1 : 0.5),
                                                                    transition: 'color 0.3s, opacity 0.3s'
                                                                }}>
                                                                    {syl.text}
                                                                </span>

                                                                {/* Overlay Layer (Active White + Glow + Fill) */}
                                                                {/* Only render if line is active to save resources, or always render and control opacity? */}
                                                                {isActive && !isSylSung && (
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        color: 'transparent',
                                                                        backgroundClip: 'text',
                                                                        WebkitBackgroundClip: 'text',
                                                                        // Hard stop gradient: White then Transparent
                                                                        backgroundImage: `linear-gradient(to right, white 50%, transparent 50%)`,
                                                                        backgroundSize: '200% 100%',
                                                                        // Fill animation
                                                                        animationName: 'karaokeFill',
                                                                        animationDuration: `${syl.duration}s`,
                                                                        animationDelay: `${sylDelay}s`,
                                                                        animationFillMode: 'forwards',
                                                                        animationTimingFunction: 'linear',
                                                                        // Apply Drop Shadow logic
                                                                        filter: `drop-shadow(0 0 ${epicGlow}px white)`,
                                                                        // Hide if not strictly active (though mapped by line active)
                                                                        opacity: isSylActive ? 1 : 0
                                                                    }}>
                                                                        {syl.text}
                                                                    </span>
                                                                )}
                                                                {/* Sung State Glow (simple text-shadow on container/backing? No, on backing) */}
                                                                {isSylSung && (
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        color: 'white',
                                                                        textShadow: `0 0 ${epicGlow}px rgba(255, 255, 255, 0.6)`,
                                                                        pointerEvents: 'none',
                                                                        opacity: 1
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
                                                            animationName: isActive ? 'wordPop' : 'none',
                                                            animationDuration: `${word.duration + 0.8}s`,
                                                            animationDelay: `${delay}s`,
                                                            animationFillMode: 'none',
                                                            animationTimingFunction: 'ease-out',
                                                        } as React.CSSProperties}
                                                    >
                                                        {/* Backing */}
                                                        <span style={{
                                                            color: isWordSung ? 'white' : 'rgba(255,255,255,0.5)',
                                                            opacity: isWordSung ? 1 : (isActive ? 1 : 0.5),
                                                            transition: 'color 0.3s, opacity 0.3s'
                                                        }}>
                                                            {word.text}
                                                        </span>

                                                        {/* Overlay Active */}
                                                        {isActive && !isWordSung && (
                                                            <span style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                color: 'transparent',
                                                                backgroundClip: 'text',
                                                                WebkitBackgroundClip: 'text',
                                                                backgroundImage: `linear-gradient(to right, white 50%, transparent 50%)`,
                                                                backgroundSize: '200% 100%',
                                                                animationName: 'karaokeFill',
                                                                animationDuration: `${word.duration}s`,
                                                                animationDelay: `${delay}s`,
                                                                animationFillMode: 'forwards',
                                                                animationTimingFunction: 'linear',
                                                                filter: `drop-shadow(0 0 ${epicGlow}px white)`,
                                                                opacity: isWordActive ? 1 : 0
                                                            }}>
                                                                {word.text}
                                                            </span>
                                                        )}
                                                        {isWordSung && (
                                                            <span style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                color: 'white',
                                                                textShadow: `0 0 ${epicGlow}px rgba(255, 255, 255, 0.6)`,
                                                                pointerEvents: 'none',
                                                                opacity: 1
                                                            }}>
                                                                {word.text}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </span>

                                {/* Background Vocals (Simplified for now, staying as is or updating?) */}
                                {/* Keeping existing logic for BG vocals to minimize risk, they usually don't need the precise glow */}
                                {line.backgroundLines && line.backgroundLines.map((bgLine, bgIndex) => {
                                    const lastBgWord = bgLine.words?.[bgLine.words.length - 1];
                                    const bgEndTime = lastBgWord ? (lastBgWord.time + lastBgWord.duration) : (bgLine.time + 3);

                                    const bgIsActive = effectivePosition >= bgLine.time && effectivePosition < bgEndTime;
                                    const bgIsSung = effectivePosition >= bgEndTime;

                                    return (
                                        <span
                                            key={`bg-${bgIndex}`}
                                            style={{
                                                display: 'inline-block',
                                                fontSize: '2.4rem',
                                                fontWeight: 500,
                                                opacity: bgIsActive ? 1 : (bgIsSung ? 0.7 : 0.5),
                                                filter: bgIsActive ? 'blur(0)' : 'blur(0.5px)',
                                                transform: bgIsActive ? 'scale(1.02)' : 'scale(0.98)',
                                                transformOrigin: 'left center',
                                                transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.4s ease',
                                                alignSelf: line.oppositeAligned ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {bgLine.words?.map((word, wIndex) => {
                                                const wordDelay = Math.max(0, word.time - bgLine.time);
                                                const wordSung = effectivePosition >= (word.time + word.duration);

                                                return (
                                                    <span
                                                        key={wIndex}
                                                        className="Word"
                                                        style={{
                                                            display: 'inline-block',
                                                            marginRight: '0.3em',
                                                            animationName: bgIsActive ? 'karaokeFill, wordPop' : 'none',
                                                            animationDuration: `${word.duration}s, ${word.duration + 0.5}s`,
                                                            animationDelay: `${wordDelay}s, ${wordDelay}s`,
                                                            animationFillMode: 'forwards, none',
                                                            animationTimingFunction: 'linear, ease-out',
                                                            color: bgIsActive ? 'transparent' : (wordSung ? 'white' : 'rgba(255,255,255,0.5)'),
                                                            opacity: wordSung ? 1 : (bgIsActive ? 1 : 0.5),
                                                            backgroundClip: 'text',
                                                            WebkitBackgroundClip: 'text',
                                                            backgroundImage: bgIsActive
                                                                ? `linear-gradient(to right, white 50%, rgba(255, 255, 255, 0.35) 50%)`
                                                                : 'none',
                                                            backgroundSize: '200% 100%',
                                                            backgroundPosition: '100% 0',
                                                            textShadow: wordSung ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                                                            transition: 'text-shadow 0.4s ease'
                                                        }}
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
                    })
                )}
            </div>
        </div>
    );
};

export default LyricsView;
