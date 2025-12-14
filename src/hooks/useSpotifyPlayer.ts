import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export const useSpotifyPlayer = () => {
    const { token } = useAuth();
    const [player, setPlayer] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [paused, setPaused] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [position, setPosition] = useState(0);

    useEffect(() => {
        if (!token) return;

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'Beautiful Lyrics Web',
                getOAuthToken: (cb: (token: string) => void) => {
                    // Always fetch fresh token from localStorage
                    const freshToken = localStorage.getItem('spotify_token');
                    if (freshToken) {
                        cb(freshToken);
                    } else {
                        console.error('No token found in localStorage');
                    }
                },
                volume: 0.5,
            });

            setPlayer(player);

            player.addListener('initialization_error', ({ message }: { message: string }) => {
                console.error('Failed to initialize', message);
            });

            player.addListener('authentication_error', ({ message }: { message: string }) => {
                console.error('Failed to authenticate', message);
            });

            player.addListener('account_error', ({ message }: { message: string }) => {
                console.error('Failed to validate Spotify account', message);
            });

            player.addListener('playback_error', ({ message }: { message: string }) => {
                console.error('Failed to perform playback', message);
            });

            player.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
            });

            player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
                console.log('Device ID has gone offline', device_id);
            });

            player.addListener('player_state_changed', (state: any) => {
                if (!state) {
                    setIsActive(false);
                    return;
                }

                setIsActive(true);
                setCurrentTrack(state.track_window.current_track);
                setPaused(state.paused);

                // Immediate update on state change
                setPosition(state.position);
            });

            player.connect();
        };

        return () => {
            if (player) {
                player.disconnect();
            }
        };
    }, [token]);

    // Polling for position if playing (SDK doesn't emit every tick)
    useEffect(() => {
        if (paused || !player) return;
        const interval = setInterval(() => {
            player.getCurrentState().then((state: any) => {
                if (state) setPosition(state.position);
            });
        }, 200); // 200ms for smoother updates
        return () => clearInterval(interval);
    }, [paused, player]);

    const seek = (pos: number) => {
        if (player) player.seek(pos);
    };

    return { player, deviceId, currentTrack, nextTracks: currentTrack?.next_tracks || [], paused, isActive, position, seek };
};
