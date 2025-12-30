/**
 * =============================================================================
 * EVENTS HOME - Ironforged Events Landing Page
 * =============================================================================
 * 
 * Landing page for the events subdomain.
 * Displays a hero section with login prompt for unauthenticated users,
 * or redirects to events list for authenticated users.
 * 
 * Features:
 * - Hero section with event branding
 * - Discord login CTA
 * - Event preview/teaser
 * - Mobile-friendly design
 * 
 * @module EventsHome
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

export default function EventsHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to events list
  useEffect(() => {
    if (!loading && user) {
      navigate('/events');
    }
  }, [user, loading, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Custom login that adds source parameter for auto-registration
  const handleLogin = () => {
    const returnUrl = `${window.location.origin}/events`;
    window.location.href = `${API_BASE}/auth/login?return_url=${encodeURIComponent(returnUrl)}&source=ironforged-events`;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24">
        {/* Event Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          Active Events Available
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Ironforged
          </span>
          <br />
          <span className="text-white">Clan Events</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          Complete tiles, track your progress, and compete with clanmates in 
          exciting event challenges. Login with Discord to get started!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleLogin}
            className="flex items-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5865F2]/25"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
            </svg>
            Login with Discord
          </button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-t border-yume-border">
        <h2 className="text-2xl font-bold text-white text-center mb-12">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center group">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              🔗
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              1. Connect Discord
            </h3>
            <p className="text-gray-400">
              Login with your Discord account to join events and track your progress
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center group">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              2. Complete Tiles
            </h3>
            <p className="text-gray-400">
              Work through event tiles in order - submit screenshots to prove completion
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center group">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              🏆
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              3. Claim Victory
            </h3>
            <p className="text-gray-400">
              Finish all tiles to complete the event and earn your place on the leaderboard
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-yume-border">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                📸
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Screenshot Verification
                </h3>
                <p className="text-gray-400 text-sm">
                  Upload your in-game screenshots to verify tile completions. 
                  Our AI-powered system automatically validates your progress.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                📊
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Progress Tracking
                </h3>
                <p className="text-gray-400 text-sm">
                  See your progress at a glance with visual tile boards. 
                  Track which tiles you've completed and what's next.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                👥
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Clan Competition
                </h3>
                <p className="text-gray-400 text-sm">
                  Compete with your clanmates to see who can complete events first. 
                  View participant leaderboards and race to the finish.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                🎮
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  OSRS Integration
                </h3>
                <p className="text-gray-400 text-sm">
                  Designed specifically for Old School RuneScape clan events. 
                  Drop verification, boss kills, skilling milestones, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 text-center">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Join?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Connect your Discord account to start participating in Ironforged clan events today!
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            Get Started
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

