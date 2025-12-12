/**
 * =============================================================================
 * PROFILE PAGE - User Profile & Permissions
 * =============================================================================
 * 
 * Displays the logged-in user's Discord profile and application permissions.
 * Provides a central location for users to view their access levels and account info.
 * 
 * Features:
 * - Discord profile display (avatar, username, display name)
 * - Account information (Discord ID, username, account type)
 * - Permission status grid showing access to each app feature
 * - Activity statistics (if user has cruddy access)
 * - Quick action links to accessible features
 * - Sign out functionality
 * 
 * Visual Elements:
 * - Dynamic banner color based on user ID
 * - Admin badge overlay on avatar
 * - Color-coded permission status (granted/denied)
 * - Stats grid for activity tracking
 * 
 * Access Control:
 * - No specific permission required
 * - Redirects to home with login prompt if not authenticated
 * 
 * @module Profile
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * User statistics fetched from API
 */
interface UserStats {
  attendanceRecords?: number;  // Number of attendance records
  lastActive?: string;         // ISO timestamp of last activity
}

/**
 * Profile Page Component
 * 
 * User profile dashboard with Discord info, permissions overview,
 * and quick navigation to accessible features.
 */
export default function Profile() {
  // ==========================================================================
  // AUTH STATE
  // ==========================================================================
  
  const { user, loading, access, isAdmin, login, logout } = useAuth();
  
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  const [stats, setStats] = useState<UserStats>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Fetch user statistics when authenticated with cruddy access
   * Only users with cruddy access have meaningful stats to display
   */
  useEffect(() => {
    if (user && access?.cruddy) {
      fetchUserStats();
    }
  }, [user, access]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  /**
   * Fetch attendance statistics for the current user
   * Uses the cruddy panel API to get record counts
   */
  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      // Get attendance records count (requires cruddy access)
      const res = await fetch(`${API_BASE}/attendance/records`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          attendanceRecords: data.records?.length || 0,
          lastActive: new Date().toISOString()
        });
      }
    } catch {
      // Silently fail - stats are optional
    }
    setLoadingStats(false);
  };

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Get Discord avatar URL with proper formatting
   * Handles animated avatars (a_ prefix) and default avatars
   * 
   * @param userId - Discord user ID
   * @param avatarHash - Avatar hash from Discord (or null for default)
   * @param size - Image size (default 256)
   */
  const getAvatarUrl = (userId: string, avatarHash: string | null, size = 256) => {
    if (!avatarHash) {
      // Use default Discord avatar (based on user ID)
      const defaultIndex = parseInt(userId) % 5;
      return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }
    // Animated avatars start with 'a_'
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  };

  /**
   * Generate a banner gradient color based on user ID
   * Provides visual variety while being deterministic per user
   * 
   * @param userId - Discord user ID
   */
  const getBannerColor = (userId: string) => {
    const colors = [
      'from-purple-600 to-blue-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-purple-600',
      'from-cyan-500 to-blue-600',
      'from-yellow-500 to-orange-600',
    ];
    return colors[parseInt(userId) % colors.length];
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-panel p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // UNAUTHENTICATED STATE
  // ==========================================================================

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-panel p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
          <p className="text-gray-400 mb-6">
            Connect with Discord to view your profile
          </p>
          <button
            onClick={login}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            {/* Discord Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Sign in with Discord
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // AUTHENTICATED VIEW
  // ==========================================================================

  // Display name formatting
  const displayName = user.global_name || user.username;
  const fullUsername = `@${user.username}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ========== PROFILE HEADER ========== */}
      <div className="glass-panel overflow-hidden">
        {/* Dynamic Banner */}
        <div className={`h-32 bg-gradient-to-r ${getBannerColor(user.id)}`} />
        
        {/* Avatar & Name Section */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar with Admin Badge */}
            <div className="-mt-16 relative">
              <img
                src={getAvatarUrl(user.id, user.avatar)}
                alt={displayName}
                className="w-32 h-32 rounded-full border-4 border-yume-bg bg-yume-bg"
              />
              {isAdmin && (
                <div className="absolute -bottom-1 -right-1 bg-yume-accent text-black text-xs font-bold px-2 py-1 rounded-full">
                  ADMIN
                </div>
              )}
            </div>
            
            {/* Name & Username */}
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-gray-400">{fullUsername}</p>
            </div>

            {/* Sign Out Button */}
            <div className="flex gap-2">
              <button
                onClick={logout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== INFO GRID ========== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Info Card */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>👤</span> Account Info
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-yume-border">
              <span className="text-gray-400">Discord ID</span>
              <span className="text-white font-mono text-sm">{user.id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-yume-border">
              <span className="text-gray-400">Username</span>
              <span className="text-white">{fullUsername}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-yume-border">
              <span className="text-gray-400">Display Name</span>
              <span className="text-white">{displayName}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Account Type</span>
              <span className={`font-medium ${isAdmin ? 'text-yume-accent' : 'text-white'}`}>
                {isAdmin ? 'Administrator' : 'Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔑</span> Permissions
          </h2>
          <div className="space-y-3">
            {/* Cruddy Panel Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-yume-bg-light">
              <div className="flex items-center gap-3">
                <span className="text-xl">◉</span>
                <div>
                  <div className="text-white font-medium">Cruddy Panel</div>
                  <div className="text-xs text-gray-500">Attendance tracking</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                access?.cruddy 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {access?.cruddy ? 'Granted' : 'Denied'}
              </div>
            </div>

            {/* Documentation Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-yume-bg-light">
              <div className="flex items-center gap-3">
                <span className="text-xl">◫</span>
                <div>
                  <div className="text-white font-medium">Documentation</div>
                  <div className="text-xs text-gray-500">API guides & reference</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                access?.docs 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {access?.docs ? 'Granted' : 'Denied'}
              </div>
            </div>

            {/* Admin Panel Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-yume-bg-light">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙</span>
                <div>
                  <div className="text-white font-medium">Admin Panel</div>
                  <div className="text-xs text-gray-500">User management</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isAdmin 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isAdmin ? 'Granted' : 'Denied'}
              </div>
            </div>

            {/* DevOps Panel Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-yume-bg-light">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚀</span>
                <div>
                  <div className="text-white font-medium">DevOps Panel</div>
                  <div className="text-xs text-gray-500">Deployment controls</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isAdmin 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isAdmin ? 'Granted' : 'Denied'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ACTIVITY STATS ========== */}
      {/* Only show stats section for users with cruddy access */}
      {access?.cruddy && (
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Attendance Records */}
            <div className="bg-yume-bg-light rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {loadingStats ? '...' : (stats.attendanceRecords ?? '-')}
              </div>
              <div className="text-xs text-gray-500 mt-1">Attendance Records</div>
            </div>
            {/* Active Session */}
            <div className="bg-yume-bg-light rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">✓</div>
              <div className="text-xs text-gray-500 mt-1">Active Session</div>
            </div>
            {/* Permission Count */}
            <div className="bg-yume-bg-light rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {access?.docs && access?.cruddy ? '2' : access?.docs || access?.cruddy ? '1' : '0'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Active Permissions</div>
            </div>
            {/* Admin Status */}
            <div className="bg-yume-bg-light rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {isAdmin ? '★' : '○'}
              </div>
              <div className="text-xs text-gray-500 mt-1">{isAdmin ? 'Admin' : 'Member'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========== QUICK ACTIONS ========== */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔗</span> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cruddy Panel Link (if accessible) */}
          {access?.cruddy && (
            <Link
              to="/cruddy-panel"
              className="bg-yume-bg-light hover:bg-yume-card rounded-xl p-4 text-center transition-colors group"
            >
              <div className="text-2xl mb-2">◉</div>
              <div className="text-white text-sm group-hover:text-yume-accent transition-colors">Cruddy Panel</div>
            </Link>
          )}
          {/* Documentation Link (if accessible) */}
          {access?.docs && (
            <Link
              to="/docs"
              className="bg-yume-bg-light hover:bg-yume-card rounded-xl p-4 text-center transition-colors group"
            >
              <div className="text-2xl mb-2">◫</div>
              <div className="text-white text-sm group-hover:text-yume-accent transition-colors">Documentation</div>
            </Link>
          )}
          {/* Admin Links (if admin) */}
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className="bg-yume-bg-light hover:bg-yume-card rounded-xl p-4 text-center transition-colors group"
              >
                <div className="text-2xl mb-2">⚙</div>
                <div className="text-white text-sm group-hover:text-yume-accent transition-colors">Admin Panel</div>
              </Link>
              <Link
                to="/devops"
                className="bg-yume-bg-light hover:bg-yume-card rounded-xl p-4 text-center transition-colors group"
              >
                <div className="text-2xl mb-2">🚀</div>
                <div className="text-white text-sm group-hover:text-yume-accent transition-colors">DevOps</div>
              </Link>
            </>
          )}
          {/* Discord Profile (always visible) */}
          <a
            href="https://discord.com/users/@me"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yume-bg-light hover:bg-yume-card rounded-xl p-4 text-center transition-colors group"
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="text-white text-sm group-hover:text-yume-accent transition-colors">Discord Profile</div>
          </a>
        </div>
      </div>
    </div>
  );
}
