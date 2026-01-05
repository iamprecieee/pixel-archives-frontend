import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_TARGET
    ? `${import.meta.env.VITE_API_TARGET}/api`
    : "/api";

const ACCESS_TOKEN_TTL_SECS = Number(import.meta.env.VITE_ACCESS_TOKEN_TTL_SECS) || 86400;
const REFRESH_BUFFER_SECS = Math.max(5, Math.floor(ACCESS_TOKEN_TTL_SECS * 0.1));
const REFRESH_INTERVAL_MS = Math.max(5000, (ACCESS_TOKEN_TTL_SECS - REFRESH_BUFFER_SECS) * 1000);

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshPromise: Promise<void> | null = null;

export const isRefreshing = (): boolean => refreshPromise !== null;

export const refreshToken = async (): Promise<void> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'auth.refresh',
                    params: {},
                    id: Date.now(),
                }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error.message || 'Token refresh failed');
            }
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

export const initTokenRefresh = (): void => {
    if (refreshTimer) return;

    refreshTimer = setInterval(async () => {
        try {
            await refreshToken();
        } catch {
            useAuthStore.getState().clearAuth();
        }
    }, REFRESH_INTERVAL_MS);
};

export const cleanupTokenRefresh = (): void => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
};
