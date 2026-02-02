import { useState, useEffect, useCallback } from 'react';
import { gun, user } from '../lib/db';

interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
  pub: string | null;
}

function readAuthState(): AuthState {
  const is = user.is as { alias?: string; pub?: string } | undefined;
  if (is && is.pub) {
    return {
      isLoggedIn: true,
      username: (is.alias as string) ?? null,
      pub: is.pub,
    };
  }
  return { isLoggedIn: false, username: null, pub: null };
}

export function useGunAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    username: null,
    pub: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      setAuth(readAuthState());
      setLoading(false);
    };

    // gun.on('auth') is the reliable signal that auth completed (per Gun.js issue #958)
    gun.on('auth' as never, checkAuth as never);

    // Fallback: check after a delay for session recall
    const timer = setTimeout(checkAuth, 500);

    return () => {
      clearTimeout(timer);
      (gun as never as { off: () => void }).off();
    };
  }, []);

  const signup = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    return new Promise((resolve) => {
      // user.create() automatically authenticates on success.
      // Do NOT call user.auth() after create — it causes a double-auth
      // race condition that corrupts SEA signing state (Gun.js issue #958).
      user.create(username, password, (ack: { err?: string; ok?: number; pub?: string }) => {
        if (ack.err) {
          setError(ack.err);
          resolve(false);
        } else {
          // create() already authenticated us — read state directly.
          // If not ready yet, poll briefly (auth propagation can be async).
          let resolved = false;
          const tryResolve = () => {
            if (resolved) return;
            const state = readAuthState();
            if (state.isLoggedIn) {
              resolved = true;
              setAuth(state);
              resolve(true);
            }
          };
          tryResolve();
          if (!resolved) {
            setTimeout(() => {
              tryResolve();
              if (!resolved) {
                resolved = true;
                setError('Authentication failed after account creation');
                resolve(false);
              }
            }, 1000);
          }
        }
      });
    });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    return new Promise((resolve) => {
      user.auth(username, password, (ack: { err?: string; sea?: unknown }) => {
        if (ack.err) {
          setError(ack.err);
          resolve(false);
        } else {
          const state = readAuthState();
          setAuth(state);
          resolve(true);
        }
      });
    });
  }, []);

  const logout = useCallback(() => {
    user.leave();
    setAuth({ isLoggedIn: false, username: null, pub: null });
  }, []);

  return {
    ...auth,
    loading,
    error,
    signup,
    login,
    logout,
  };
}
