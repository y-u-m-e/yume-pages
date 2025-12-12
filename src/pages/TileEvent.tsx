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

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage, MAX_AI_SIZE } from '@/utils/imageCompression';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

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
  const [submissions, setSubmissions] = useState<{id: number; tile_id: number; status: string; created_at: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUploadError(data.error || 'Failed to submit');
        return;
      }
      
      setUploadSuccess(data.message + compressionNote);
      
      // Refresh progress and submissions
      await Promise.all([fetchProgress(), fetchSubmissions()]);
      
      // Auto-close modal after success
      if (data.auto_approved) {
        setTimeout(() => {
          setSelectedTile(null);
          setUploadSuccess(null);
        }, 2000);
      }
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

  // All tiles are now accessible from the start (no sequential unlocking required)
  const isTileAccessible = (_position: number) => {
    return true; // All tiles are always accessible
  };

  const getTileStatus = (position: number): 'accessible' | 'completed' | 'current' => {
    if (!progress) {
      // Not joined yet - all tiles are accessible but show first as "current"
      return position === 0 ? 'current' : 'accessible';
    }
    if (progress.tiles_unlocked.includes(position)) {
      return 'completed';
    }
    // Find the next uncompleted tile to mark as "current"
    const nextTile = tiles.find(t => !progress.tiles_unlocked.includes(t.position));
    if (nextTile && nextTile.position === position) {
      return 'current';
    }
    return 'accessible';
  };

  // Generate snake path coordinates
  const generateSnakePath = () => {
    const tilesPerRow = 5;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yume-accent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-gray-400 mb-6">This tile event doesn't exist or has been removed.</p>
        <Link to="/tile-events" className="btn-primary">
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

      {/* Snake Tile Board - only show if joined */}
      {joined && (
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6 overflow-x-auto">
        <div 
          className="relative mx-auto"
          style={{ 
            width: `${5 * 100 + 4 * 16}px`,
            minHeight: `${(Math.ceil(tiles.length / 5)) * 100 + (Math.ceil(tiles.length / 5) - 1) * 16}px`
          }}
        >
          {tiles.map((tile, index) => {
            const pos = snakePositions[index];
            const status = getTileStatus(tile.position);
            
            return (
              <button
                key={tile.id}
                onClick={() => setSelectedTile(tile)}
                className={`
                  absolute w-[100px] h-[100px] rounded-xl border-2 transition-all duration-300
                  flex flex-col items-center justify-center gap-1 text-center p-2 cursor-pointer
                  ${status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500/50 hover:border-emerald-400'
                    : status === 'current'
                    ? 'bg-yume-accent/20 border-yume-accent animate-pulse hover:scale-105'
                    : 'bg-yume-bg-light border-yume-border hover:border-yume-accent cursor-pointer hover:scale-105'
                  }
                `}
                style={{
                  left: `${pos.x * (100 + 16)}px`,
                  top: `${pos.y * (100 + 16)}px`
                }}
              >
                {/* Tile number */}
                <div className={`
                  text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center
                  ${status === 'completed' ? 'bg-emerald-500 text-white' : 
                    status === 'current' ? 'bg-yume-accent text-yume-bg' :
                    'bg-gray-600 text-gray-300'}
                `}>
                  {status === 'completed' ? '✓' : tile.position + 1}
                </div>
                
                {/* Tile title (truncated) */}
                <div className="text-xs font-medium line-clamp-2 text-white">
                  {tile.title}
                </div>
                
                {/* Start/End indicators */}
                {tile.is_start === 1 && (
                  <div className="absolute -top-2 -right-2 text-lg">🏁</div>
                )}
                {tile.is_end === 1 && (
                  <div className="absolute -top-2 -right-2 text-lg">🏆</div>
                )}
              </button>
            );
          })}
          
          {/* Connection lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              width: `${5 * 100 + 4 * 16}px`,
              height: `${(Math.ceil(tiles.length / 5)) * 100 + (Math.ceil(tiles.length / 5) - 1) * 16}px`
            }}
          >
            {tiles.slice(1).map((tile, index) => {
              const prevPos = snakePositions[index];
              const currPos = snakePositions[index + 1];
              const prevStatus = getTileStatus(index);
              const currStatus = getTileStatus(index + 1);
              const isCompleted = prevStatus === 'completed' && (currStatus === 'completed' || currStatus === 'current');
              
              const x1 = prevPos.x * (100 + 16) + 50;
              const y1 = prevPos.y * (100 + 16) + 50;
              const x2 = currPos.x * (100 + 16) + 50;
              const y2 = currPos.y * (100 + 16) + 50;
              
              return (
                <line
                  key={tile.id}
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
      )}

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
                  ${getTileStatus(selectedTile.position) === 'completed' 
                    ? 'bg-emerald-500 text-white' 
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
            
            {/* Submission Status & Upload Section */}
            <div className="mt-4 pt-4 border-t border-yume-border">
              {getTileStatus(selectedTile.position) === 'completed' ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-lg">✓</span>
                  <span>Completed!</span>
                </div>
              ) : getTileStatus(selectedTile.position) === 'current' ? (
                <div className="space-y-4">
                  {/* Check for pending submission */}
                  {(() => {
                    const submission = getTileSubmission(selectedTile.id);
                    if (submission?.status === 'pending') {
                      return (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-yellow-400 mb-2">
                            <span>⏳</span>
                            <span className="font-medium">Submission Pending Review</span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Your screenshot is being reviewed. You'll be notified once it's approved.
                          </p>
                        </div>
                      );
                    }
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
                  
                  {/* Upload Section - only show if no pending submission */}
                  {getTileSubmission(selectedTile.id)?.status !== 'pending' && (
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
                      
                      {/* Upload button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-yume-border hover:border-yume-accent 
                                   bg-yume-bg-light hover:bg-yume-accent/10 transition-all
                                   text-gray-400 hover:text-yume-accent disabled:opacity-50"
                      >
                        {uploading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>📷</span>
                            Click to upload screenshot
                          </span>
                        )}
                      </button>
                      
                      <p className="text-xs text-gray-500 text-center">
                        Supported: JPEG, PNG, WebP, GIF (max 5MB)
                      </p>
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
    </div>
  );
}

