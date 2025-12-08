import { useState, useEffect } from 'react';
import { parseLrc, type LyricLine } from '../utils/lrcParser';

export const useLyrics = (track: any) => {
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [synced, setSynced] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!track) {
            setLyrics([]);
            return;
        }

        const fetchLyrics = async () => {
            setLoading(true);
            setError(null);
            try {
                const query = new URLSearchParams({
                    track_name: track.name,
                    artist_name: track.artists[0].name,
                    album_name: track.album.name,
                    duration: (track.duration_ms / 1000).toString(),
                });

                const response = await fetch(`https://lrclib.net/api/get?${query.toString()}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Lyrics not found");
                    }
                    throw new Error("Failed to fetch lyrics");
                }

                const data = await response.json();

                if (data.syncedLyrics) {
                    setLyrics(parseLrc(data.syncedLyrics));
                    setSynced(true);
                } else if (data.plainLyrics) {
                    // Fake timestamps or just static
                    setLyrics([{ time: 0, text: data.plainLyrics }]);
                    setSynced(false);
                } else {
                    setLyrics([]);
                    setSynced(false);
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setLyrics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLyrics();
    }, [track?.id]);

    return { lyrics, synced, loading, error };
};
