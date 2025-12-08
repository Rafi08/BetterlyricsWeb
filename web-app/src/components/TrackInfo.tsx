import React from 'react';

interface TrackInfoProps {
    track: any;
    nextTracks?: any[];
}

const TrackInfo: React.FC<TrackInfoProps> = ({ track, nextTracks }) => {
    if (!track) return null;

    const coverUrl = track.album?.images?.[0]?.url;
    const title = track.name;
    const artist = track.artists?.map((a: any) => a.name).join(', ');

    const nextTrack = nextTracks && nextTracks.length > 0 ? nextTracks[0] : null;

    return (
        <div className="TrackInfo" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            padding: '4rem 2rem 2rem 2rem', // Top padding for balance
            textAlign: 'center',
            zIndex: 10,
            color: 'white',
            position: 'relative' // For absolute positioning of next track
        }}>
            {coverUrl && (
                <img
                    src={coverUrl}
                    alt="Album Art"
                    style={{
                        width: '70%',
                        maxWidth: '500px', // Larger cover
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        marginBottom: '2rem'
                    }}
                />
            )}
            <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{title}</h1>
            <h2 style={{ fontSize: '2rem', margin: 0, opacity: 0.8, fontWeight: 'normal' }}>{artist}</h2>

            {/* Next Track Info */}
            {nextTrack && (
                <div style={{
                    position: 'absolute',
                    bottom: '2rem',
                    right: '2rem',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center', // Align text and image
                    gap: '1rem',
                    opacity: 0.7,
                    transform: 'scale(0.9)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Up Next</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{nextTrack.name}</span>
                        <span style={{ fontSize: '0.9rem' }}>{nextTrack.artists[0].name}</span>
                    </div>
                    {nextTrack.album?.images?.[0]?.url && (
                        <img
                            src={nextTrack.album.images[0].url}
                            alt="Next Art"
                            style={{ width: '60px', height: '60px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackInfo;
