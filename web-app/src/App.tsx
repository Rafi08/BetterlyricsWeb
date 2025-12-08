// import { useEffect } from 'react'; // removed
import { AuthProvider, useAuth } from './auth/AuthContext';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import './styles/main.scss';

import LyricsView from './components/LyricsView';
import { useLyrics } from './hooks/useLyrics';
import Background from './components/Background';
import TrackInfo from './components/TrackInfo';

const Content = () => {
  const { token, login, logout } = useAuth();
  const { deviceId, currentTrack, nextTracks, isActive, position, seek } = useSpotifyPlayer();
  const { lyrics } = useLyrics(currentTrack);

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h1>Beautiful Lyrics Web</h1>
        <button onClick={login} style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}>
          Login with Spotify
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000 }}>
        {/* Controls Overlay */}
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '8px' }}>
          <small>{currentTrack ? currentTrack.name : 'Waiting for music...'}</small>
          <button onClick={logout} style={{ marginLeft: '1rem' }}>Logout</button>
        </div>
      </div>

      {!isActive ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <h2>Ready to play!</h2>
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
            maxWidth: '1600px',
            margin: '0 auto'
          }}>
            <LyricsView lyrics={lyrics} position={position / 1000} seek={seek} />
            <TrackInfo track={currentTrack} nextTracks={nextTracks} />
          </div>
        </>
      )}
    </>
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
