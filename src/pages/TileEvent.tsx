import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

interface Tile {
  id: number;
  position: number;
  title: string;
  description?: string;
  image_url?: string;
  reward?: string;
  is_start: number;
  is_end: number;
}

interface TileEventData {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  google_sheet_id?: string;
}

interface UserProgress {
  current_tile: number;
  tiles_unlocked: number[];
  completed_at?: string;
}

export default function TileEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<TileEventData | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && user) {
      fetchProgress();
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
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const isTileUnlocked = (position: number) => {
    if (!progress) return position === 0; // First tile always visible
    return progress.tiles_unlocked.includes(position);
  };

  const isTileAccessible = (position: number) => {
    if (!progress) return position === 0;
    // Tile is accessible if the previous tile is unlocked
    if (position === 0) return true;
    return progress.tiles_unlocked.includes(position - 1);
  };

  const getTileStatus = (position: number): 'locked' | 'accessible' | 'completed' | 'current' => {
    if (!progress) {
      return position === 0 ? 'current' : 'locked';
    }
    if (progress.tiles_unlocked.includes(position)) {
      return 'completed';
    }
    if (isTileAccessible(position)) {
      return position === progress.current_tile + 1 ? 'current' : 'accessible';
    }
    return 'locked';
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
          
          {/* Progress indicator */}
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
        </div>
      </div>

      {/* Snake Tile Board */}
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
                onClick={() => status !== 'locked' && setSelectedTile(tile)}
                disabled={status === 'locked'}
                className={`
                  absolute w-[100px] h-[100px] rounded-xl border-2 transition-all duration-300
                  flex flex-col items-center justify-center gap-1 text-center p-2
                  ${status === 'locked' 
                    ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-50' 
                    : status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500/50 hover:border-emerald-400 cursor-pointer'
                    : status === 'current'
                    ? 'bg-yume-accent/20 border-yume-accent animate-pulse cursor-pointer hover:scale-105'
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
                <div className={`
                  text-xs font-medium line-clamp-2
                  ${status === 'locked' ? 'text-gray-500' : 'text-white'}
                `}>
                  {status === 'locked' ? '???' : tile.title}
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
            
            {selectedTile.reward && (
              <div className="bg-yume-bg-light rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Reward</div>
                <div className="text-yume-accent font-medium">{selectedTile.reward}</div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-yume-border">
              {getTileStatus(selectedTile.position) === 'completed' ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-lg">✓</span>
                  <span>Completed!</span>
                </div>
              ) : getTileStatus(selectedTile.position) === 'current' ? (
                <div className="text-yume-accent">
                  Complete this task to unlock the next tile!
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
    </div>
  );
}

