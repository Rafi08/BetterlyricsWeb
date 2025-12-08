import React, { createContext, useContext, useEffect, useState } from 'react';
import { authConfig } from './AuthConfig';

interface AuthContextType {
    token: string | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateRandomString = (length: number) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const generateCodeChallenge = async (codeVerifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            const codeVerifier = localStorage.getItem('code_verifier');

            if (codeVerifier) {
                const getToken = async () => {
                    try {
                        const response = await fetch('https://accounts.spotify.com/api/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                client_id: authConfig.clientId,
                                grant_type: 'authorization_code',
                                code,
                                redirect_uri: authConfig.redirectUri,
                                code_verifier: codeVerifier,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error('Failed to exchange token');
                        }

                        const data = await response.json();
                        const accessToken = data.access_token;

                        setToken(accessToken);
                        localStorage.setItem('spotify_token', accessToken);
                        localStorage.removeItem('code_verifier'); // Cleanup
                        window.history.replaceState({}, document.title, "/"); // Clear code from URL

                    } catch (err) {
                        console.error("Token exchange failed", err);
                    }
                };
                getToken();
            }
        }
    }, []);

    const login = async () => {
        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        localStorage.setItem('code_verifier', codeVerifier);

        const params = new URLSearchParams({
            client_id: authConfig.clientId,
            response_type: 'code',
            redirect_uri: authConfig.redirectUri,
            scope: authConfig.scopes.join(' '),
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('code_verifier');
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
