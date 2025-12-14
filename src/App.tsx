import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import './styles/main.scss';

import LyricsView from './components/LyricsView';
import { useLyrics } from './hooks/useLyrics';
import Background from './components/Background';
import TrackInfo from './components/TrackInfo';
import { isTV } from './utils/deviceUtils';

const Content = () => {
  const { token, login, logout } = useAuth();
  const { deviceId, currentTrack, nextTracks, isActive, position, seek } = useSpotifyPlayer();
  const { lyrics } = useLyrics(currentTrack, token);

  // TV Logic: Add class and auto-fullscreen
  useEffect(() => {
    if (isTV()) {
      document.body.classList.add('is-tv');
    }
  }, []);

  useEffect(() => {
    if (isActive && isTV()) {
      document.body.requestFullscreen().catch((err) => {
        console.warn('Auto-fullscreen blocked:', err);
      });
    }
  }, [isActive]);

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h1>Beautiful Lyrics Web</h1>
        <small style={{ marginBottom: '2rem', opacity: 0.7 }}>v3.5 (animation fix)</small>
        <button onClick={login} style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}>
          Login with Spotify
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      {!isActive ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <h2>Ready to play!</h2>
          <button onClick={logout} style={{ marginLeft: '1rem' }}>Logout</button>
          <small style={{ marginBottom: '1rem', opacity: 0.7 }}>v3.5 (animation fix)</small>
          <p>Open Spotify and connect to <strong>Beautiful Lyrics Web</strong></p>
          <small>Device ID: {deviceId}</small>

        </div>
      ) : (
        <>
          <Background coverArt={currentTrack?.album?.images?.[0]?.url} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
            height: '100vh',
            maxWidth: '95vw', // Increased from 1600px for large screens
            margin: '0 auto'
          }}>
            <LyricsView lyrics={lyrics} position={position / 1000} seek={seek} />
            <TrackInfo track={currentTrack} nextTracks={nextTracks} />
          </div>
        </>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Content />
    </AuthProvider>
  );
};

export default App;
