import { useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from '../lib/api';

export function useRestAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const storedUsername = localStorage.getItem('obicei-username');
    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
    setLoading(false);
  }, []);

  const signup = useCallback(async (user: string, password: string, meta?: { website?: string; _t?: number }): Promise<boolean> => {
    setError(null);
    try {
      const data = await api.post<{ token: string; username: string }>('/auth/signup', {
        username: user,
        password,
        ...meta,
      });
      setToken(data.token);
      localStorage.setItem('obicei-username', data.username);
      setIsLoggedIn(true);
      setUsername(data.username);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      return false;
    }
  }, []);

  const login = useCallback(async (user: string, password: string, meta?: { website?: string; _t?: number }): Promise<boolean> => {
    setError(null);
    try {
      const data = await api.post<{ token: string; username: string }>('/auth/login', {
        username: user,
        password,
        ...meta,
      });
      setToken(data.token);
      localStorage.setItem('obicei-username', data.username);
      setIsLoggedIn(true);
      setUsername(data.username);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    clearToken();
    localStorage.removeItem('obicei-username');
    setIsLoggedIn(false);
    setUsername(null);
  }, []);

  return {
    isLoggedIn,
    username,
    loading,
    error,
    signup,
    login,
    logout,
  };
}
