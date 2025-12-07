import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { records, AttendanceRecord, LeaderboardEntry, EventGroup } from '@/lib/api';

type Tab = 'records' | 'events' | 'leaderboard';

export default function CruddyPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [recordsData, setRecordsData] = useState<AttendanceRecord[]>([]);
  const [eventsData, setEventsData] = useState<EventGroup[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for adding records
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ player_name: '', event_name: '', event_date: '' });
  const [submitting, setSubmitting] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (activeTab === 'records') {
          const result = await records.getAll({ pageSize: 50 });
          if (result.success && result.data) {
            setRecordsData(result.data.records || []);
          } else {
            setError(result.error || 'Failed to load records');
          }
        } else if (activeTab === 'events') {
          const result = await records.getEventGroups({ pageSize: 50 });
          if (result.success && result.data) {
            setEventsData(result.data.events || []);
          } else {
            setError(result.error || 'Failed to load events');
          }
        } else if (activeTab === 'leaderboard') {
          const result = await records.getLeaderboard();
          if (result.success && result.data) {
            setLeaderboardData(result.data || []);
          } else {
            setError(result.error || 'Failed to load leaderboard');
          }
        }
      } catch (err) {
        setError('Network error');
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [activeTab, user]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const result = await records.add({
      player_name: newRecord.player_name,
      event_name: newRecord.event_name,
      event_date: newRecord.event_date,
    });
    
    if (result.success) {
      setNewRecord({ player_name: '', event_name: '', event_date: '' });
      setShowAddForm(false);
      // Refresh records
      const refreshResult = await records.getAll({ pageSize: 50 });
      if (refreshResult.success && refreshResult.data) {
        setRecordsData(refreshResult.data.records || []);
      }
    } else {
      setError(result.error || 'Failed to add record');
    }
    
    setSubmitting(false);
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    const result = await records.delete(id);
    if (result.success) {
      setRecordsData(recordsData.filter(r => r.id !== id));
    } else {
      setError(result.error || 'Failed to delete record');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'records', label: 'Records', icon: '📋' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-yume-accent">◉</span> Cruddy Panel
          </h1>
          <p className="text-gray-400">Track clan event attendance and leaderboards</p>
        </div>
        
        {activeTab === 'records' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <span>{showAddForm ? '✕' : '+'}</span>
            {showAddForm ? 'Cancel' : 'Add Record'}
          </button>
        )}
      </div>

      {/* Add Record Form */}
      {showAddForm && (
        <form onSubmit={handleAddRecord} className="bg-yume-card rounded-2xl border border-yume-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Record</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Name</label>
              <input
                type="text"
                value={newRecord.player_name}
                onChange={(e) => setNewRecord({ ...newRecord, player_name: e.target.value })}
                className="input"
                placeholder="Enter player name"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input
                type="text"
                value={newRecord.event_name}
                onChange={(e) => setNewRecord({ ...newRecord, event_name: e.target.value })}
                className="input"
                placeholder="Enter event name"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Date</label>
              <input
                type="date"
                value={newRecord.event_date}
                onChange={(e) => setNewRecord({ ...newRecord, event_date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding...' : 'Add Record'}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-yume-accent text-yume-bg'
                : 'bg-yume-card text-gray-400 hover:text-white border border-yume-border hover:border-yume-border-accent'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="bg-yume-card rounded-2xl border border-yume-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'records' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-yume-bg-light border-b border-yume-border">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Player</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Event</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Date</th>
                  <th className="text-right text-sm font-medium text-gray-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yume-border">
                {recordsData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No records found. Add your first record!
                    </td>
                  </tr>
                ) : (
                  recordsData.map((record) => (
                    <tr key={record.id} className="hover:bg-yume-bg-light/50 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{record.player_name}</td>
                      <td className="px-6 py-4 text-gray-300">{record.event_name}</td>
                      <td className="px-6 py-4 text-gray-400">{record.event_date}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'events' ? (
          <div className="p-6 grid gap-4">
            {eventsData.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No events found.</div>
            ) : (
              eventsData.map((event, i) => (
                <div key={i} className="bg-yume-bg-light rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{event.event_name}</h3>
                    <span className="badge-accent">{event.player_count} players</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{event.event_date}</div>
                  <div className="flex flex-wrap gap-2">
                    {event.players.map((player, j) => (
                      <span key={j} className="badge">{player}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-6">
            {leaderboardData.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No leaderboard data.</div>
            ) : (
              <div className="space-y-2">
                {leaderboardData.map((entry, i) => (
                  <div
                    key={entry.player_name}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      i === 0 ? 'bg-yume-accent/20 border border-yume-accent/30' :
                      i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                      i === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                      'bg-yume-bg-light'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yume-accent text-yume-bg' :
                        i === 1 ? 'bg-gray-400 text-gray-900' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-yume-card text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-white">{entry.player_name}</span>
                    </div>
                    <span className="text-yume-accent font-semibold">{entry.total_events} events</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
