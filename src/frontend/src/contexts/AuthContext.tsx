'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
  userId: string;
  role: 'member' | 'admin';
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (userId: string, role: string, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Builds a Set-Cookie string for the accessToken with the Secure flag on HTTPS. */
function buildAuthCookie(token: string): string {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  return `accessToken=${token}; path=/; SameSite=Lax; max-age=86400${secure}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role') as 'member' | 'admin' | null;
    if (token && userId && role) {
      // Keep the cookie in sync with localStorage so server components can
      // read a valid token on the first server render after page refresh.
      document.cookie = buildAuthCookie(token);
      setUser({ userId, role, accessToken: token });
    }
  }, []);

  function login(userId: string, role: string, accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);
    localStorage.setItem('role', role);
    // Mirror the token into a cookie so Next.js server components can read it
    // via `cookies()` in server-fetch.ts for authenticated SSR prefetching.
    document.cookie = buildAuthCookie(accessToken);
    setUser({ userId, role: role as 'member' | 'admin', accessToken });
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    // Clear the auth cookie.
    document.cookie = 'accessToken=; path=/; max-age=0';
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
