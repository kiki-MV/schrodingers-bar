'use client';

import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'schrodingers_bar_token';
const REFRESH_KEY = 'schrodingers_bar_refresh';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    setTokenState(saved);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setTokenState(null);
  }, []);

  return { token, loading, isLoggedIn: !!token, logout };
}
