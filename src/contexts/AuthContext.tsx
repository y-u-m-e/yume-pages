/**
 * =============================================================================
 * AUTH CONTEXT - Discord OAuth2 Authentication with RBAC
 * =============================================================================
 * 
 * Provides authentication state and methods throughout the React application.
 * Uses Discord OAuth2 for user authentication via the yume-api backend.
 * 
 * Features:
 * - Automatic session check on app load
 * - Discord OAuth2 login/logout flows
 * - RBAC (Role-Based Access Control) with granular permissions
 * - Permission checking helpers
 * - Loading states for auth operations
 * 
 * Usage:
 *   const { user, isAdmin, hasPermission, login, logout } = useAuth();
 *   if (hasPermission('view_cruddy')) return <CruddyPanel />;
 * 
 * @module AuthContext
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth, User } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

/**
 * User access permissions from the API (legacy)
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
 * RBAC Role object
 */
interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  priority: number;
}

/**
 * Shape of the authentication context
 * Provides user data, loading state, and auth methods
 */
interface AuthContextType {
  user: User | null;           // Current Discord user or null if not logged in
  loading: boolean;            // True while checking authentication status
  error: string | null;        // Error message if auth check failed
  access: Access | null;       // User's feature permissions (legacy)
  roles: Role[];               // User's RBAC roles
  permissions: string[];       // User's effective permissions (from roles + legacy)
  isAdmin: boolean;            // Computed: does user have admin privileges?
  isSuperAdmin: boolean;       // Computed: is hardcoded super admin?
  isEventsAdmin: boolean;      // Computed: can access events admin panel?
  hasPermission: (perm: string) => boolean;  // Check if user has permission
  hasAnyPermission: (perms: string[]) => boolean;  // Check if user has any of the permissions
  hasAllPermissions: (perms: string[]) => boolean; // Check if user has all permissions
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);  // Start loading until we check
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch RBAC permissions for the current user
   */
  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/permissions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
        setIsSuperAdmin(data.is_super_admin || false);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

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
      // Fetch RBAC permissions
      await fetchPermissions();
    } else {
      // Not authenticated or error
      setUser(null);
      setAccess(null);
      setRoles([]);
      setPermissions([]);
      setIsSuperAdmin(false);
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

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((perm: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(perm);
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.every(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  // Compute admin status - ONLY from RBAC now (no legacy access checks)
  const isAdmin = isSuperAdmin || hasPermission('view_admin');
  
  // Events admin: has events admin permission or is general admin
  const isEventsAdmin = hasPermission('view_events_admin') || isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      access, 
      roles,
      permissions,
      isAdmin, 
      isSuperAdmin,
      isEventsAdmin, 
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      login, 
      logout, 
      refresh 
    }}>
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
