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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role') as 'member' | 'admin' | null;
    if (token && userId && role) {
      setUser({ userId, role, accessToken: token });
    }
  }, []);

  function login(userId: string, role: string, accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);
    localStorage.setItem('role', role);
    setUser({ userId, role: role as 'member' | 'admin', accessToken });
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
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
