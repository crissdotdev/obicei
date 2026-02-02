import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useGunAuth } from '../hooks/useGunAuth';

type AuthContextValue = ReturnType<typeof useGunAuth>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGunAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
