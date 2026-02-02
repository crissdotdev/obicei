import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useRestAuth } from '../hooks/useAuth';

type AuthContextValue = ReturnType<typeof useRestAuth>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useRestAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
