// Dynamically determine the redirect URI based on the current environment
const getRedirectUri = () => {
    // For GitHub Pages deployment
    if (window.location.hostname === 'rafi08.github.io') {
        return 'https://rafi08.github.io/BetterlyricsWeb/callback';
    }
    // For local development
    return 'http://127.0.0.1:5173/callback';
};

export const authConfig = {
    clientId: "d2e8554511a64cdf9d8a7ba5c44326ea",
    redirectUri: getRedirectUri(),
    scopes: [
        "streaming",
        "user-read-email",
        "user-read-private",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
    ],
};
