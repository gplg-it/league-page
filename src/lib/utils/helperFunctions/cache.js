import { browser } from '$app/environment';

const CACHE_PREFIX = 'lp_cache_';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getCached = (key) => {
    if (!browser) return null;
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

export const setCached = (key, data, ttlMs = DEFAULT_TTL_MS) => {
    if (!browser) return;
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            expiresAt: Date.now() + ttlMs,
        }));
    } catch {
        // storage full or unavailable
    }
};

export const clearCache = () => {
    if (!browser) return;
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch {
        // ignore
    }
};
