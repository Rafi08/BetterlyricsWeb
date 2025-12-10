export const isTV = (): boolean => {
    const ua = navigator.userAgent.toLowerCase();

    // Check for common TV identifiers in User Agent
    if (ua.includes('tizen') || // Samsung
        ua.includes('web0s') || // LG (webOS)
        ua.includes('smarttv') || // Generic
        ua.includes('bravia') || // Sony
        ua.includes('crkey') || // Chromecast
        ua.includes('apple tv') || // Apple
        ua.includes('googletv') || // Google TV
        ua.includes('viera')) { // Panasonic
        return true;
    }

    return false;
};
