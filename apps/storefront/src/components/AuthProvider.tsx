"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, AppUser } from '@/lib/api';

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  refresh: () => Promise<AppUser | null>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest<{ user: AppUser }>('/auth/me', { method: 'GET', headers: {} });
      setUser(result.user);
      return result.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiRequest('/auth/logout', { method: 'POST', body: '{}' }); }
    catch { /* Clear the local UI even if the API is temporarily unavailable. */ }
    finally { setUser(null); window.location.assign('/login'); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
