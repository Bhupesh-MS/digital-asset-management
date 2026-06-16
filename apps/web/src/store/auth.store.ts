import { create } from "zustand";

const TOKEN_KEY = "dam_admin_token";

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  syncFromStorage: () => void;
}

function readToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isJwtExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  return token;
}

export function isJwtExpired(token: string): boolean {
  const [, payload] = token.split(".");
  if (!payload) {
    return true;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    if (!decoded.exp) {
      return true;
    }

    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const token = readToken();

  return {
    token,
    isLoggedIn: Boolean(token),
    setToken: (nextToken: string) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      set({ token: nextToken, isLoggedIn: true });
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, isLoggedIn: false });
    },
    syncFromStorage: () => {
      const nextToken = readToken();
      set({ token: nextToken, isLoggedIn: Boolean(nextToken) });
    }
  };
});
