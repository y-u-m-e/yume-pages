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
  name: string;
  event: string;
  date: string;
  recorded_at?: string;
}

export interface LeaderboardEntry {
  name: string;
  count: number;
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

// Auth response type
interface AuthMeResponse {
  authenticated: boolean;
  authorized?: boolean;
  access?: {
    docs: boolean;
    cruddy: boolean;
    admin?: boolean;
  };
  user?: User;
}

// Auth API
export const auth = {
  async me(): Promise<ApiResponse<AuthMeResponse>> {
    return apiFetch<AuthMeResponse>('/auth/me');
  },

  getLoginUrl(returnUrl?: string): string {
    const url = returnUrl || window.location.href;
    return `${API_BASE}/auth/login?return_url=${encodeURIComponent(url)}`;
  },

  getLogoutUrl(returnUrl?: string): string {
    const url = returnUrl || window.location.href;
    return `${API_BASE}/auth/logout?return_url=${encodeURIComponent(url)}`;
  },
};

// Records API (Cruddy Panel) - uses /attendance/records endpoints
export const records = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    name?: string;
    event?: string;
    start?: string;
    end?: string;
  }): Promise<ApiResponse<{ results: AttendanceRecord[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.name) searchParams.set('name', params.name);
    if (params?.event) searchParams.set('event', params.event);
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);

    const query = searchParams.toString();
    return apiFetch(`/attendance/records${query ? `?${query}` : ''}`);
  },

  async add(record: {
    name: string;
    event: string;
    date: string;
  }): Promise<ApiResponse<{ success: boolean; id: number }>> {
    return apiFetch('/attendance/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async update(id: number, record: {
    name: string;
    event: string;
    date: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return apiFetch(`/attendance/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  },

  async delete(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return apiFetch(`/attendance/records/${id}`, {
      method: 'DELETE',
    });
  },

  async getLeaderboard(params?: {
    top?: number;
    start?: string;
    end?: string;
  }): Promise<ApiResponse<LeaderboardEntry[]>> {
    const searchParams = new URLSearchParams();
    searchParams.set('top', (params?.top || 50).toString());
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);

    const query = searchParams.toString();
    // D1 returns { results: [...] }, so we need to extract the results array
    const response = await apiFetch<{ results: LeaderboardEntry[] }>(`/attendance?${query}`);
    if (response.success && response.data?.results) {
      return { success: true, data: response.data.results };
    }
    return { success: false, error: response.error || 'Failed to load leaderboard' };
  },
};
