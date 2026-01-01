/**
 * =============================================================================
 * AUTH CONTEXT - Discord OAuth2 Authentication
 * =============================================================================
 * 
 * Provides authentication state and methods throughout the React application.
 * Uses Discord OAuth2 for user authentication via the yume-api backend.
 * 
 * Features:
 * - Automatic session check on app load
 * - Discord OAuth2 login/logout flows
 * - Permission-based access control (docs, cruddy, admin, etc.)
 * - Loading states for auth operations
 * 
 * Usage:
 *   const { user, isAdmin, login, logout } = useAuth();
 *   if (!user) return <LoginButton onClick={login} />;
 * 
 * @module AuthContext
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, User } from '@/lib/api';

/**
 * User access permissions from the API
 * These determine which features the user can access
 */
interface Access {
  docs: boolean;      // Can access documentation pages
  cruddy: boolean;    // Can access Cruddy Panel (attendance tracking)
  devops?: boolean;   // Can access DevOps panel
  events?: boolean;   // Can access Events admin panel (manage tile events)
  admin?: boolean;    // Full admin access (optional, for backwards compat)
}

/**
 * Shape of the authentication context
 * Provides user data, loading state, and auth methods
 */
interface AuthContextType {
  user: User | null;           // Current Discord user or null if not logged in
  loading: boolean;            // True while checking authentication status
  error: string | null;        // Error message if auth check failed
  access: Access | null;       // User's feature permissions
  isAdmin: boolean;            // Computed: does user have admin privileges?
  isEventsAdmin: boolean;      // Computed: can access events admin panel?
  login: () => void;           // Redirect to Discord OAuth login
  logout: () => void;          // Clear session and redirect to logout
  refresh: () => Promise<void>; // Re-check authentication status
}

// Create context with undefined default (enforces Provider usage)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 * 
 * Wraps the application to provide auth state to all child components.
 * Automatically checks authentication status on mount.
 * 
 * @param children - Child components that need auth access
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);  // Start loading until we check
  const [error, setError] = useState<string | null>(null);

  /**
   * Check current authentication status with the API
   * Called on mount and can be triggered manually via refresh()
   */
  const checkAuth = async () => {
    setLoading(true);
    setError(null);
    
    // Call the /auth/me endpoint to get current session
    const result = await auth.me();
    
    // API returns { authenticated, user, access } - extract the data
    if (result.success && result.data && result.data.authenticated && result.data.user) {
      setUser(result.data.user);
      setAccess(result.data.access || null);
    } else {
      // Not authenticated or error
      setUser(null);
      setAccess(null);
      // Only show errors for actual failures, not "not logged in"
      if (result.error && result.error !== 'Not authenticated') {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  // Check auth on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Initiate Discord OAuth2 login flow
   * Redirects user to Discord authorization page
   */
  const login = () => {
    window.location.href = auth.getLoginUrl();
  };

  /**
   * Log out the current user
   * Clears session cookie and redirects back to home
   */
  const logout = () => {
    window.location.href = auth.getLogoutUrl();
  };

  /**
   * Manually refresh authentication status
   * Useful after permission changes or token refresh
   */
  const refresh = async () => {
    await checkAuth();
  };

  // Compute admin status:
  // - Explicit admin flag, OR
  // - Has both docs AND cruddy access (legacy admin detection)
  const isAdmin = access?.admin === true || (access?.docs === true && access?.cruddy === true);
  
  // Events admin: has events permission or is general admin
  const isEventsAdmin = access?.events === true || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, error, access, isAdmin, isEventsAdmin, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 * 
 * @returns AuthContextType - Current auth state and methods
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * const { user, isAdmin, login } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
