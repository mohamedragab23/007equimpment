import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

const INACTIVITY_MINUTES = 30;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    setUser(null);
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.me();
      if (res.ok && res.user) {
        setUser(res.user);
        lastActivityRef.current = Date.now();
        return true;
      }
    } catch (_) {}
    setUser(null);
    return false;
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login(username, password);
    if (!res.ok) throw new Error(res.error || 'فشل تسجيل الدخول');
    setUser(res.user);
    lastActivityRef.current = Date.now();
    return res.user;
  }, []);

  // تحميل الجلسة والإعدادات عند البدء
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, configRes] = await Promise.all([
          authApi.me().catch(() => ({ ok: false })),
          authApi.config().catch(() => ({ ok: false })),
        ]);
        if (!cancelled) {
          if (meRes.ok && meRes.user) setUser(meRes.user);
          if (configRes.ok) setConfig(configRes);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // انتهاء الجلسة بعد عدم النشاط
  useEffect(() => {
    if (!user) return;
    const intervalMs = 60 * 1000;
    const timeoutMs = INACTIVITY_MINUTES * 60 * 1000;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        logout();
      }, timeoutMs);
    };

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      resetTimer();
    };

    resetTimer();
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, logout]);

  const value = {
    user,
    loading,
    config: config?.zones ? config : null,
    inactivityMinutes: config?.inactivity_timeout_minutes ?? INACTIVITY_MINUTES,
    permissionModules: config?.permission_modules ?? [],
    roles: config?.roles ?? {},
    login,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
