import { useState, useEffect } from 'react';
import type { LyricLine } from '../utils/lrcParser';
import { SpicyLyricsService } from '../services/SpicyLyricsService';

export const useLyrics = (track: any, token: string | null) => {
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [synced, setSynced] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!track || !token) {
            setLyrics([]);
            return;
        }

        const fetchLyrics = async () => {
            setLoading(true);
            setError(null);
            try {
                // Spicy Lyrics needs the Track URI or just ID. 
                // The service expects trackId. The App seems to have 'track' object.
                // Assuming track.id exists.
                const lyricsData = await SpicyLyricsService.fetchLyrics(track.id, token);

                setLyrics(lyricsData);
                // Check if we have any synced lines (lyricsData is always LyricLine[])
                // If the first line has time > 0 OR multiple lines exist with diff times, it's synced.
                // Spicy Lyrics usually returns synced data unless it is 'Static'.
                // If it's static, our service returns lines with time=0.
                const isSynced = lyricsData.length > 1 && lyricsData.some(l => l.time > 0);
                setSynced(isSynced);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setLyrics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLyrics();
    }, [track?.id, token]);

    return { lyrics, synced, loading, error };
};
