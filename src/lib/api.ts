/**
 * API Client for yume-api Worker
 * Base URL: https://api.emuy.gg
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// Types
export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export interface AttendanceRecord {
  id: number;
  player_name: string;
  event_name: string;
  event_date: string;
  recorded_at: string;
}

export interface EventGroup {
  event_name: string;
  event_date: string;
  player_count: number;
  players: string[];
}

export interface LeaderboardEntry {
  player_name: string;
  total_events: number;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Fetch wrapper with credentials
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Auth API
export const auth = {
  async me(): Promise<ApiResponse<User>> {
    return apiFetch<User>('/auth/me');
  },

  getLoginUrl(returnUrl?: string): string {
    const url = returnUrl || window.location.href;
    return `${API_BASE}/auth/login?return_url=${encodeURIComponent(url)}`;
  },

  async logout(): Promise<ApiResponse<void>> {
    return apiFetch<void>('/auth/logout', { method: 'POST' });
  },
};

// Records API (Cruddy Panel)
export const records = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ records: AttendanceRecord[]; total: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return apiFetch(`/api/records${query ? `?${query}` : ''}`);
  },

  async add(record: {
    player_name: string;
    event_name: string;
    event_date: string;
  }): Promise<ApiResponse<AttendanceRecord>> {
    return apiFetch('/api/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiFetch(`/api/records/${id}`, {
      method: 'DELETE',
    });
  },

  async getEventGroups(params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ events: EventGroup[]; total: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return apiFetch(`/api/records/events${query ? `?${query}` : ''}`);
  },

  async getLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return apiFetch('/api/records/leaderboard');
  },
};

