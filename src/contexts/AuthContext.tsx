import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    setLoading(true);
    setError(null);
    
    const result = await auth.me();
    
    // API returns { authenticated, user } - extract the user object
    if (result.success && result.data && result.data.authenticated && result.data.user) {
      setUser(result.data.user);
    } else {
      setUser(null);
      // Don't set error for "not logged in" case
      if (result.error && result.error !== 'Not authenticated') {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    // Redirect to Discord OAuth
    window.location.href = auth.getLoginUrl();
  };

  const logout = () => {
    // Redirect to logout endpoint which clears cookies and redirects back
    window.location.href = auth.getLogoutUrl();
  };

  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

