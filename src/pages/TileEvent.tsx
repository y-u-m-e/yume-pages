/**
 * =============================================================================
 * TILE EVENT PAGE - Snake-Style Progression Game
 * =============================================================================
 * 
 * Displays a single tile event with a snake-pattern game board.
 * Users can:
 * - View event details and tiles
 * - Join/leave events
 * - Track their progress through tiles
 * - View tile details (description, image)
 * - Upload screenshot proof to unlock tiles
 * 
 * The tiles are displayed in a snake pattern (left-to-right, then right-to-left)
 * and users must unlock tiles sequentially - completing one unlocks the next.
 * 
 * Screenshot Verification Flow:
 * 1. User clicks on their current tile
 * 2. User uploads a screenshot proving completion
 * 3. System runs OCR/AI to check for keywords (if configured)
 * 4. If high confidence match, tile auto-unlocks
 * 5. Otherwise, submission goes to admin review queue
 * 
 * Visual states for tiles:
 * - Locked (gray): Cannot be accessed yet
 * - Accessible (highlighted): Previous tile completed, can work on this
 * - Current (pulsing): The tile user should focus on
 * - Completed (green): Already done
 * 
 * @module TileEvent
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage, MAX_AI_SIZE } from '@/utils/imageCompression';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// Rate limit cooldown in seconds
const SUBMISSION_COOLDOWN = 60;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Individual tile in the event
 * Each tile represents a task/challenge to complete
 */
interface Tile {
  id: number;           // Database ID
  position: number;     // Position in snake path (0-indexed)
  title: string;        // Short title displayed on tile
  description?: string; // Detailed description shown in modal
  image_url?: string;   // Optional image for the tile
  is_start: number;     // 1 if this is the first tile
  is_end: number;       // 1 if this is the final tile
  required_submissions?: number; // Number of approved submissions needed (default 1)
}

/**
 * Progress for a tile (submission counts)
 */
interface TileProgress {
  submitted: number;  // Total non-rejected submissions (pending + approved)
  approved: number;   // Approved submissions only
  required: number;   // Required submissions to unlock
}

/**
 * Event metadata from the database
 */
interface TileEventData {
  id: number;                 // Event ID
  name: string;               // Display name
  description?: string;       // Event description
  is_active: number;          // 1 if event is ongoing, 0 if ended
  google_sheet_id?: string;   // Source sheet (if synced from Google Sheets)
}

/**
 * User's progress on an event
 * Tracks which tiles they've unlocked
 */
interface UserProgress {
  current_tile: number;       // Highest tile position unlocked
  tiles_unlocked: number[];   // Array of unlocked tile positions
  completed_at?: string;      // ISO timestamp if event is completed
  skips_used: number;         // Number of skips used (earn 1 at start, 1 more after 10 tiles)
}

/**
 * Tile Event Page Component
 * 
 * Main page for viewing and participating in a tile event.
 * Handles:
 * - Loading event data and tiles
 * - User join/leave functionality
 * - Progress tracking
 * - Interactive tile board
 */
export default function TileEvent() {
  // Get event ID from URL params (/tile-events/:eventId)
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  const [event, setEvent] = useState<TileEventData | null>(null);  // Event data
  const [tiles, setTiles] = useState<Tile[]>([]);                  // All tiles
  const [progress, setProgress] = useState<UserProgress | null>(null); // User's progress
  const [joined, setJoined] = useState(false);      // Has user joined this event?
  const [joining, setJoining] = useState(false);    // Is join request in progress?
  const [loading, setLoading] = useState(true);     // Initial data loading
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null); // Tile detail modal
  
  // Screenshot submission state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<{
    id: number; 
    tile_id: number; 
    status: string; 
    created_at: string;
    image_url?: string;
    admin_notes?: string;
  }[]>([]);
  const [tileProgress, setTileProgress] = useState<Record<number, TileProgress>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cooldown state
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showSubmissionHistory, setShowSubmissionHistory] = useState(false);
  
  // Milestone celebration state
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [lastSeenMilestone, setLastSeenMilestone] = useState<number>(0);

  // ==========================================================================
  // HELPER FUNCTIONS - Skips & Ingots
  // ==========================================================================
  
  // Calculate available skips: 1 at start + 1 after 10 tiles
  const getSkipsAvailable = () => {
    if (!progress) return 0;
    const tilesCompleted = progress.tiles_unlocked.length;
    const maxSkips = tilesCompleted >= 10 ? 2 : 1;
    return maxSkips - (progress.skips_used || 0);
  };
  
  // Calculate ingots earned (50k per 6 tiles)
  const getIngotsEarned = () => {
    if (!progress) return 0;
    const tilesCompleted = progress.tiles_unlocked.length;
    const milestones = Math.floor(tilesCompleted / 6);
    return milestones * 50000;
  };
  
  // Handle skip tile
  const handleSkipTile = async (tilePosition: number) => {
    if (!event || getSkipsAvailable() <= 0) return;
    
    try {
      const res = await fetch(`${API_BASE}/tile-events/${event.id}/skip`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tile_position: tilePosition })
      });
      
      if (res.ok) {
        fetchProgress();
        fetchSubmissions();
        setSelectedTile(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to skip tile');
      }
    } catch (err) {
      console.error('Failed to skip tile:', err);
    }
  };

  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  
  // Fetch event data when eventId changes
  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  // Fetch user's progress when they're logged in
  useEffect(() => {
    if (eventId && user) {
      fetchProgress();
      fetchSubmissions();
    }
  }, [eventId, user]);

  // Auto-refresh progress every 30 seconds (only when tab is visible and user is joined)
  useEffect(() => {
    if (!eventId || !user || !joined) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchProgress();
        fetchSubmissions();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [eventId, user, joined]);

  // Calculate and update cooldown timer
  const updateCooldown = useCallback(() => {
    if (submissions.length === 0) {
      setCooldownRemaining(0);
      return;
    }
    
    // Find the most recent submission by parsing dates
    let latestTime = 0;
    for (const s of submissions) {
      const createdAt = s.created_at;
      let time: number;
      
      // Handle different timestamp formats from SQLite
      if (createdAt.includes('T')) {
        time = new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z').getTime();
      } else {
        // SQLite format: "2024-01-05 12:00:00" - treat as UTC
        time = new Date(createdAt.replace(' ', 'T') + 'Z').getTime();
      }
      
      if (!isNaN(time) && time > latestTime) {
        latestTime = time;
      }
    }
    
    if (latestTime === 0) {
      setCooldownRemaining(0);
      return;
    }
    
    const now = Date.now();
    const elapsed = (now - latestTime) / 1000;
    
    // Calculate remaining, but NEVER more than the cooldown period
    // This prevents crazy values from timestamp parsing issues
    const remaining = Math.min(SUBMISSION_COOLDOWN, Math.max(0, SUBMISSION_COOLDOWN - elapsed));
    
    setCooldownRemaining(Math.ceil(remaining));
  }, [submissions]);

  // Update cooldown on submissions change and tick every second
  useEffect(() => {
    updateCooldown();
    
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [submissions, updateCooldown, cooldownRemaining]);

  // Detect milestone hits (ingot rewards every 6 tiles)
  useEffect(() => {
    if (!progress || !event || !user) return;
    
    const tilesCompleted = progress.tiles_unlocked.length;
    const ingots = Math.floor(tilesCompleted / 6) * 50000;
    
    // Check if we hit a new milestone (6, 12, 18 tiles = 50k, 100k, 150k)
    if (tilesCompleted > 0 && tilesCompleted % 6 === 0 && ingots > lastSeenMilestone) {
      setShowMilestone(ingots);
      setLastSeenMilestone(ingots);
    }
  }, [progress?.tiles_unlocked.length, event, user, lastSeenMilestone]);

  const fetchEventData = async () => {
    try {
      const res = await fetch(`${API_BASE}/tile-events/${eventId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setTiles(data.tiles || []);
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`${API_BASE}/tile-events/${eventId}/progress`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        setJoined(data.joined === true);
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  /**
   * Fetch user's submissions for this event
   * Shows pending/approved/rejected status
   */
  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/tile-events/${eventId}/submissions`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setTileProgress(data.tileProgress || {});
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  /**
   * Handle screenshot upload for tile completion
   * Auto-compresses large images before uploading to R2
   * Triggers OCR verification for auto-approval
   */
  const handleSubmitProof = async (tileId: number, file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    try {
      // Auto-compress large images for better AI processing
      let uploadFile = file;
      let compressionNote = '';
      
      if (file.size > MAX_AI_SIZE) {
        try {
          const result = await compressImage(file);
          if (result.wasCompressed) {
            uploadFile = result.file;
            const savings = Math.round((1 - result.compressedSize / result.originalSize) * 100);
            compressionNote = ` (compressed ${savings}%)`;
            console.log(`Image compressed: ${Math.round(result.originalSize/1024)}KB → ${Math.round(result.compressedSize/1024)}KB`);
          }
        } catch (compressErr) {
          console.warn('Compression failed, using original:', compressErr);
        }
      }
      
      const formData = new FormData();
      formData.append('image', uploadFile);
      
      const res = await fetch(`${API_BASE}/tile-events/${eventId}/tiles/${tileId}/submit`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Handle rate limit specifically
        if (res.status === 429) {
          // Parse the wait time from error message if available
          const waitMatch = data.error?.match(/wait (\d+) seconds/);
          if (waitMatch) {
            setCooldownRemaining(parseInt(waitMatch[1]));
          } else {
            setCooldownRemaining(SUBMISSION_COOLDOWN);
          }
        }
        setUploadError(data.error || 'Failed to submit');
        return;
      }
      
      // Set cooldown after successful submission
      setCooldownRemaining(SUBMISSION_COOLDOWN);
      setUploadSuccess(data.message + compressionNote);
      
      // Refresh progress and submissions
      await Promise.all([fetchProgress(), fetchSubmissions()]);
      
      // Close modal after brief delay to show success message
      setTimeout(() => {
        setSelectedTile(null);
        setUploadSuccess(null);
      }, 1500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Get submission status for a specific tile
   */
  const getTileSubmission = (tileId: number) => {
    return submissions.find(s => s.tile_id === tileId);
  };

  const joinEvent = async () => {
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/tile-events/${eventId}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setJoined(true);
        fetchProgress();
      } else {
        alert(data.error || 'Failed to join event');
      }
    } catch (err) {
      console.error('Failed to join event:', err);
      alert('Failed to join event');
    } finally {
      setJoining(false);
    }
  };

  const leaveEvent = async () => {
    if (!confirm('Are you sure you want to leave this event? Your progress will be lost.')) return;
    
    try {
      const res = await fetch(`${API_BASE}/tile-events/${eventId}/leave`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        setJoined(false);
        setProgress(null);
      }
    } catch (err) {
      console.error('Failed to leave event:', err);
    }
  };

  /**
   * Determine tile status for visual display
   * Tiles are visible to everyone but locked until unlocked sequentially
   * 
   * Status meanings:
   * - 'locked': Cannot interact, previous tile not completed
   * - 'current': The next tile to work on (highlighted)
   * - 'pending': Submitted but awaiting approval (yellow)
   * - 'completed': Approved submission (green)
   */
  const getTileStatus = (tile: Tile): 'locked' | 'current' | 'pending' | 'completed' => {
    const requiredSubmissions = tile.required_submissions || 1;
    const progress_data = tileProgress[tile.id];
    const submittedCount = progress_data?.submitted || 0;
    const approvedCount = progress_data?.approved || 0;
    
    // For multi-submission tiles, check if fully complete
    if (requiredSubmissions > 1) {
      // All submissions approved = completed
      if (approvedCount >= requiredSubmissions) {
        return 'completed';
      }
      
      // Has enough submissions (pending or approved) but not all approved yet
      if (submittedCount >= requiredSubmissions && submittedCount > approvedCount) {
        return 'pending';
      }
      
      // Not enough submissions yet - check if tile is accessible
      if (!progress) {
        return tile.position === 0 ? 'current' : 'locked';
      }
      
      // Check if previous tiles are complete (can access this tile)
      const prevTileUnlocked = tile.position === 0 || progress.tiles_unlocked.includes(tile.position - 1);
      if (prevTileUnlocked || progress.tiles_unlocked.includes(tile.position)) {
        return 'current'; // Still need more submissions
      }
      
      return 'locked';
    }
    
    // Single submission tile - original logic
    const submission = submissions.find(s => s.tile_id === tile.id);
    
    // If there's an approved submission, it's completed
    if (submission?.status === 'approved') {
      return 'completed';
    }
    
    // If there's a pending submission, show as pending
    if (submission?.status === 'pending') {
      return 'pending';
    }
    
    if (!progress) {
      // Not joined yet - show first as current, rest as locked (preview mode)
      return tile.position === 0 ? 'current' : 'locked';
    }
    
    // Check if this tile position is in unlocked array (may include pending submissions)
    if (progress.tiles_unlocked.includes(tile.position)) {
      // Check if there's any submission - if pending, show pending
      if (submission?.status === 'pending') {
        return 'pending';
      }
      return 'completed';
    }
    
    // Check if this is the current tile (next to unlock)
    // First tile is accessible if nothing unlocked
    // Otherwise, current tile is one after the highest COMPLETED tile
    const maxUnlocked = progress.tiles_unlocked.length > 0 
      ? Math.max(...progress.tiles_unlocked) 
      : -1;
    
    if (tile.position === maxUnlocked + 1) {
      // Before showing as current, verify the previous tile is actually COMPLETE
      // (not just unlocked with pending submissions)
      if (maxUnlocked >= 0) {
        const prevTile = tiles.find(t => t.position === maxUnlocked);
        if (prevTile) {
          const prevRequired = prevTile.required_submissions || 1;
          const prevProgress = tileProgress[prevTile.id];
          const prevApproved = prevProgress?.approved || 0;
          
          // If previous tile needs more approvals, this tile stays locked
          if (prevApproved < prevRequired) {
            return 'locked';
          }
        }
      }
      return 'current';
    }
    
    // All other tiles are locked
    return 'locked';
  };

  // Responsive tile sizing
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tile dimensions based on screen size
  const tileSize = isMobile ? 70 : 100;
  const tileGap = isMobile ? 8 : 16;
  const tilesPerRow = isMobile ? 4 : 5;

  // Generate snake path coordinates
  const generateSnakePath = () => {
    const positions: { x: number; y: number; direction: 'right' | 'left' }[] = [];
    
    let row = 0;
    let col = 0;
    let direction: 'right' | 'left' = 'right';
    
    for (let i = 0; i < tiles.length; i++) {
      positions.push({ x: col, y: row, direction });
      
      if (direction === 'right') {
        if (col < tilesPerRow - 1) {
          col++;
        } else {
          row++;
          direction = 'left';
        }
      } else {
        if (col > 0) {
          col--;
        } else {
          row++;
          direction = 'right';
        }
      }
    }
    
    return positions;
  };

  const snakePositions = generateSnakePath();

  // Detect if on events subdomain for consistent theming
  const isEventsSubdomain = window.location.hostname.includes('ironforged-events');
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isEventsSubdomain ? 'border-orange-500' : 'border-yume-accent'}`}></div>
      </div>
    );
  }

  if (!event) {
    // Detect if on events subdomain to use correct route
    const isEventsSubdomain = window.location.hostname.includes('ironforged-events');
    const eventsPath = isEventsSubdomain ? '/events' : '/tile-events';
    
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-gray-400 mb-6">This tile event doesn't exist or has been removed.</p>
        <Link to={eventsPath} className="btn-primary">
          View All Events
        </Link>
      </div>
    );
  }

  const completedCount = progress?.tiles_unlocked?.length || 0;
  const progressPercent = tiles.length > 0 ? (completedCount / tiles.length) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{event.name}</h1>
              {event.is_active ? (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                  Ended
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-gray-400">{event.description}</p>
            )}
          </div>
          
          {/* Progress indicator - only show if joined */}
          {joined && (
            <div className="flex-shrink-0">
              <div className="text-right mb-2">
                <span className="text-2xl font-bold text-yume-accent">{completedCount}</span>
                <span className="text-gray-500">/{tiles.length} tiles</span>
              </div>
              <div className="w-48 h-2 bg-yume-bg-light rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yume-accent to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progress?.completed_at && (
                <div className="text-xs text-emerald-400 mt-1 text-right">
                  ✓ Completed!
                </div>
              )}
            </div>
          )}
          
          {/* Tile count for non-joined users */}
          {!joined && (
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-bold text-gray-400">{tiles.length}</div>
              <div className="text-sm text-gray-500">tiles</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar - Skips & Ingots */}
      {user && joined && progress && (
        <div className="flex flex-wrap gap-4">
          {/* Skips */}
          <div className="bg-yume-card rounded-xl border border-yume-border px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⏭️</span>
            <div>
              <div className="text-xs text-gray-400">Skips Available</div>
              <div className="text-lg font-bold text-white">
                {getSkipsAvailable()} / {progress.tiles_unlocked.length >= 10 ? 2 : 1}
              </div>
            </div>
            {getSkipsAvailable() > 0 && progress.tiles_unlocked.length < 10 && (
              <div className="text-xs text-gray-500 ml-2">
                +1 at tile 10
              </div>
            )}
          </div>
          
          {/* Ingots */}
          <div className="flex-1 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl border border-orange-500/30 px-4 py-3 flex items-center gap-3">
            <img src="/ingot_icon.png" alt="Ingot" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-xs text-orange-400">Ingots Earned</div>
              <div className="text-lg font-bold text-orange-300">
                {getIngotsEarned() > 0 ? `${(getIngotsEarned() / 1000).toFixed(0)}k` : '0'}
              </div>
            </div>
            {/* Next milestone indicator */}
            {getIngotsEarned() < 300000 && (
              <div className="text-xs text-gray-400 ml-auto">
                Next reward: Tile {(Math.floor(progress.tiles_unlocked.length / 6) + 1) * 6}
              </div>
            )}
            {getIngotsEarned() >= 300000 && (
              <div className="text-xs text-emerald-400 ml-auto">
                🏆 Max rewards earned!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snake Tile Board - responsive grid */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-4 sm:p-6 overflow-x-auto">
        {/* Submission History Toggle */}
        {user && joined && submissions.length > 0 && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-yume-border">
            <button
              onClick={() => setShowSubmissionHistory(!showSubmissionHistory)}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>📋</span>
              <span>Submission History ({submissions.length})</span>
              <span className={`transition-transform ${showSubmissionHistory ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {/* Cooldown indicator */}
            {cooldownRemaining > 0 && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <div className="relative w-6 h-6">
                  <svg className="w-6 h-6 transform -rotate-90">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#374151" strokeWidth="2" />
                    <circle 
                      cx="12" cy="12" r="10" fill="none" 
                      stroke="#f59e0b" strokeWidth="2"
                      strokeDasharray={`${(cooldownRemaining / SUBMISSION_COOLDOWN) * 62.8} 62.8`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
                <span>Wait {cooldownRemaining}s</span>
              </div>
            )}
          </div>
        )}
        
        {/* Submission History Panel */}
        {showSubmissionHistory && (
          <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
            {submissions
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(sub => {
                const tile = tiles.find(t => t.id === sub.tile_id);
                return (
                  <div 
                    key={sub.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      sub.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30' :
                      sub.status === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
                      'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    {sub.image_url && (
                      <img 
                        src={sub.image_url} 
                        alt="Submission" 
                        crossOrigin="use-credentials"
                        className="w-12 h-12 rounded object-cover cursor-pointer hover:opacity-80"
                        onClick={() => window.open(sub.image_url, '_blank')}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {tile?.title || `Tile #${sub.tile_id}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(sub.created_at).toLocaleString()}
                      </div>
                      {sub.admin_notes && sub.status === 'rejected' && (
                        <div className="text-xs text-red-400 mt-1">
                          Note: {sub.admin_notes}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      sub.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {sub.status === 'approved' ? '✓ Approved' :
                       sub.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
        
        {/* Tile Grid */}
        <div 
          className="relative mx-auto"
          style={{ 
            width: `${tilesPerRow * tileSize + (tilesPerRow - 1) * tileGap}px`,
            minHeight: `${(Math.ceil(tiles.length / tilesPerRow)) * tileSize + (Math.ceil(tiles.length / tilesPerRow) - 1) * tileGap}px`
          }}
        >
          {tiles.map((tile, index) => {
            const pos = snakePositions[index];
            const status = getTileStatus(tile);
            const isLocked = status === 'locked';
            
            return (
              <button
                key={tile.id}
                onClick={() => setSelectedTile(tile)}
                className={`
                  absolute rounded-xl border-2 transition-all duration-300
                  flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center p-1 sm:p-2 cursor-pointer
                  ${status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500/50 hover:border-emerald-400'
                    : status === 'pending'
                    ? 'bg-amber-500/20 border-amber-500/50 hover:border-amber-400'
                    : status === 'current'
                    ? 'bg-yume-accent/20 border-yume-accent animate-pulse hover:scale-105'
                    : 'bg-gray-800/50 border-gray-700 opacity-60 hover:opacity-80'
                  }
                `}
                style={{
                  width: `${tileSize}px`,
                  height: `${tileSize}px`,
                  left: `${pos.x * (tileSize + tileGap)}px`,
                  top: `${pos.y * (tileSize + tileGap)}px`
                }}
              >
                {/* Lock overlay for locked tiles */}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <span className={`${isMobile ? 'text-lg' : 'text-2xl'} opacity-40`}>🔒</span>
                  </div>
                )}
                
                {/* Tile number */}
                <div className={`
                  text-xs font-bold rounded-full flex items-center justify-center
                  ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}
                  ${status === 'completed' ? 'bg-emerald-500 text-white' : 
                    status === 'pending' ? 'bg-amber-500 text-white' :
                    status === 'current' ? 'bg-yume-accent text-yume-bg' :
                    'bg-gray-700 text-gray-400'}
                `}>
                  {status === 'completed' ? '✓' : status === 'pending' ? '⏳' : tile.position + 1}
                </div>
                
                {/* Tile title (truncated) - hide on very small screens */}
                <div className={`text-xs font-medium line-clamp-2 ${isLocked ? 'text-gray-500' : 'text-white'} ${isMobile ? 'hidden sm:block' : ''}`}>
                  {tile.title}
                </div>
                
                {/* Submission progress indicator for multi-submission tiles */}
                {(tile.required_submissions || 1) > 1 && tileProgress[tile.id] && (
                  <div className={`text-[10px] font-medium ${
                    tileProgress[tile.id].submitted >= tileProgress[tile.id].required 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {tileProgress[tile.id].submitted}/{tileProgress[tile.id].required}
                  </div>
                )}
                
                {/* Start/End indicators */}
                {tile.is_start === 1 && (
                  <div className={`absolute -top-1 -right-1 ${isMobile ? 'text-sm' : 'text-lg'}`}>🏁</div>
                )}
                {tile.is_end === 1 && (
                  <div className={`absolute -top-1 -right-1 ${isMobile ? 'text-sm' : 'text-lg'}`}>🏆</div>
                )}
              </button>
            );
          })}
          
          {/* Connection lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              width: `${tilesPerRow * tileSize + (tilesPerRow - 1) * tileGap}px`,
              height: `${(Math.ceil(tiles.length / tilesPerRow)) * tileSize + (Math.ceil(tiles.length / tilesPerRow) - 1) * tileGap}px`
            }}
          >
            {tiles.slice(1).map((_, index) => {
              const prevTile = tiles[index];
              const currTile = tiles[index + 1];
              const prevPos = snakePositions[index];
              const currPos = snakePositions[index + 1];
              const prevStatus = getTileStatus(prevTile);
              const currStatus = getTileStatus(currTile);
              const isCompleted = prevStatus === 'completed' && (currStatus === 'completed' || currStatus === 'current' || currStatus === 'pending');
              
              const x1 = prevPos.x * (tileSize + tileGap) + tileSize / 2;
              const y1 = prevPos.y * (tileSize + tileGap) + tileSize / 2;
              const x2 = currPos.x * (tileSize + tileGap) + tileSize / 2;
              const y2 = currPos.y * (tileSize + tileGap) + tileSize / 2;
              
              return (
                <line
                  key={currTile.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCompleted ? '#10b981' : '#374151'}
                  strokeWidth={isCompleted ? 3 : 2}
                  strokeDasharray={isCompleted ? undefined : '5,5'}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Tile Details Modal */}
      {selectedTile && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTile(null)}
        >
          <div 
            className="bg-yume-card rounded-2xl border border-yume-border max-w-lg w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold
                  ${getTileStatus(selectedTile) === 'completed' 
                    ? 'bg-emerald-500 text-white' 
                    : getTileStatus(selectedTile) === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-yume-accent text-yume-bg'}
                `}>
                  {selectedTile.position + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedTile.title}</h3>
                  {selectedTile.is_start === 1 && (
                    <span className="text-xs text-yume-accent">Starting Tile</span>
                  )}
                  {selectedTile.is_end === 1 && (
                    <span className="text-xs text-emerald-400">Final Tile!</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedTile(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {selectedTile.image_url && (
              <img 
                src={selectedTile.image_url} 
                alt={selectedTile.title}
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}
            
            {selectedTile.description && (
              <p className="text-gray-300 mb-4">{selectedTile.description}</p>
            )}
            
            {/* Multi-submission progress indicator */}
            {(selectedTile.required_submissions || 1) > 1 && user && joined && (
              <div className="bg-yume-bg-light/50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Submissions</span>
                  <span className={`text-sm font-bold ${
                    (tileProgress[selectedTile.id]?.submitted || 0) >= (selectedTile.required_submissions || 1)
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {tileProgress[selectedTile.id]?.submitted || 0} / {selectedTile.required_submissions || 1}
                    {(tileProgress[selectedTile.id]?.approved || 0) > 0 && (
                      <span className="text-emerald-400 ml-1">
                        (✓{tileProgress[selectedTile.id]?.approved})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (tileProgress[selectedTile.id]?.submitted || 0) >= (selectedTile.required_submissions || 1)
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, ((tileProgress[selectedTile.id]?.submitted || 0) / (selectedTile.required_submissions || 1)) * 100)}%` 
                    }}
                  />
                </div>
                {(tileProgress[selectedTile.id]?.submitted || 0) > (tileProgress[selectedTile.id]?.approved || 0) && (
                  <p className="text-xs text-amber-400 mt-2">
                    ⏳ {(tileProgress[selectedTile.id]?.submitted || 0) - (tileProgress[selectedTile.id]?.approved || 0)} pending review
                  </p>
                )}
              </div>
            )}
            
            {/* Submission Status & Upload Section */}
            <div className="mt-4 pt-4 border-t border-yume-border">
              {/* Not logged in */}
              {!user ? (
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4 text-center">
                  <div className="text-gray-400 mb-2">Sign in to participate</div>
                  <Link 
                    to="/"
                    className="text-yume-accent hover:underline text-sm"
                  >
                    Sign in with Discord →
                  </Link>
                </div>
              ) : !joined ? (
                /* Logged in but not joined */
                <div className="bg-yume-accent/10 border border-yume-accent/30 rounded-xl p-4 text-center">
                  <div className="text-yume-accent font-medium mb-2">Join to participate!</div>
                  <p className="text-gray-400 text-sm mb-3">
                    Join this event to track your progress and submit screenshots.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedTile(null);
                      joinEvent();
                    }}
                    disabled={joining || !event?.is_active}
                    className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {joining ? 'Joining...' : 'Join Event'}
                  </button>
                </div>
              ) : getTileStatus(selectedTile) === 'completed' ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-lg">✓</span>
                  <span>Approved & Completed!</span>
                </div>
              ) : getTileStatus(selectedTile) === 'pending' && (selectedTile.required_submissions || 1) === 1 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <span>⏳</span>
                    <span className="font-medium">Pending Approval</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your screenshot has been submitted and is awaiting review. 
                    You can continue to the next tile while waiting!
                  </p>
                </div>
              ) : (getTileStatus(selectedTile) === 'current' || getTileStatus(selectedTile) === 'pending') ? (
                <div className="space-y-4">
                  {/* Check for rejected submission */}
                  {(() => {
                    const submission = getTileSubmission(selectedTile.id);
                    if (submission?.status === 'rejected') {
                      return (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-2 text-red-400 mb-2">
                            <span>✕</span>
                            <span className="font-medium">Previous Submission Rejected</span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Please try again with a clearer screenshot.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Upload Section */}
                  {(
                    <div className="space-y-3">
                      <div className="text-yume-accent font-medium">
                        📸 Upload proof to complete this tile
                      </div>
                      
                      {/* Success message */}
                      {uploadSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400">
                          {uploadSuccess}
                        </div>
                      )}
                      
                      {/* Error message */}
                      {uploadError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                          {uploadError}
                        </div>
                      )}
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && selectedTile) {
                            handleSubmitProof(selectedTile.id, file);
                          }
                          e.target.value = ''; // Reset input
                        }}
                      />
                      
                      {/* Upload button with cooldown */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || cooldownRemaining > 0}
                        className={`w-full py-3 rounded-xl border-2 border-dashed transition-all
                          ${cooldownRemaining > 0 
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 cursor-not-allowed' 
                            : 'border-yume-border hover:border-yume-accent bg-yume-bg-light hover:bg-yume-accent/10 text-gray-400 hover:text-yume-accent'
                          } disabled:opacity-50`}
                      >
                        {uploading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Uploading...
                          </span>
                        ) : cooldownRemaining > 0 ? (
                          <span className="flex items-center justify-center gap-2">
                            <span>⏱️</span>
                            Wait {cooldownRemaining}s before next submission
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>📷</span>
                            Click to upload screenshot
                          </span>
                        )}
                      </button>
                      
                      <p className="text-xs text-gray-500 text-center">
                        Supported: JPEG, PNG, WebP, GIF (max 5MB) • 1 submission per minute
                      </p>
                    </div>
                  )}
                  
                  {/* Skip Tile Option */}
                  {getSkipsAvailable() > 0 && (
                    <div className="mt-4 pt-4 border-t border-yume-border">
                      <button
                        onClick={() => {
                          if (confirm(`Use a skip on "${selectedTile.title}"?\n\nYou have ${getSkipsAvailable()} skip(s) remaining.\nSkips: 1 at start + 1 after completing 10 tiles.`)) {
                            handleSkipTile(selectedTile.position);
                          }
                        }}
                        className="w-full py-2 rounded-xl border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <span>⏭️</span>
                        <span>Skip This Tile ({getSkipsAvailable()} remaining)</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">
                  Complete the previous tile to unlock this one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login prompt for guests */}
      {!user && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-6 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-white mb-2">Login to Track Progress</h3>
          <p className="text-gray-400 mb-4">
            Sign in with Discord to save your progress and unlock tiles.
          </p>
        </div>
      )}

      {/* Join prompt for logged-in users who haven't joined */}
      {user && !joined && (
        <div className="bg-gradient-to-r from-yume-accent/20 to-purple-500/20 rounded-2xl border border-yume-accent/30 p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-white mb-2">Join This Event!</h3>
          <p className="text-gray-300 mb-6 max-w-md mx-auto">
            Click below to join and start tracking your progress through this tile event.
          </p>
          <button
            onClick={joinEvent}
            disabled={joining || !event?.is_active}
            className="btn-primary text-lg px-8 py-3 disabled:opacity-50"
          >
            {joining ? 'Joining...' : !event?.is_active ? 'Event Ended' : 'Join Event'}
          </button>
        </div>
      )}

      {/* Leave event option for joined users */}
      {user && joined && (
        <div className="text-center">
          <button
            onClick={leaveEvent}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            Leave Event
          </button>
        </div>
      )}

      {/* Milestone Celebration Modal */}
      {showMilestone && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-orange-900/90 to-red-900/90 rounded-3xl border-2 border-orange-500 p-8 text-center max-w-md mx-4 animate-in zoom-in duration-300 shadow-2xl shadow-orange-500/20">
            <img src="/ingot_icon.png" alt="Ingot" className="w-20 h-20 mx-auto mb-4 animate-bounce object-contain" />
            <h2 className="text-3xl font-bold text-orange-300 mb-2">Milestone Reached!</h2>
            <p className="text-orange-100 text-xl mb-2">
              You've earned
            </p>
            <p className="text-4xl font-bold text-orange-200 mb-4">
              {(showMilestone / 1000).toFixed(0)}k Ingots!
            </p>
            <div className="text-5xl mb-6 space-x-2">
              <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>🎉</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '100ms' }}>✨</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '200ms' }}>🎊</span>
            </div>
            <p className="text-orange-200/70 text-sm mb-6">
              {showMilestone >= 300000 
                ? "You've earned all available ingots! Amazing!" 
                : `Next milestone: ${(showMilestone + 50000) / 1000}k at tile ${Math.floor(progress!.tiles_unlocked.length / 6) * 6 + 6}`
              }
            </p>
            <button
              onClick={() => setShowMilestone(null)}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl transition-colors text-lg"
            >
              Awesome! 🎯
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

