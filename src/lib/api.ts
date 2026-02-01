// API client for self-hosted backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Videos API
export const videosApi = {
  getAll: () => request<Video[]>('/videos'),
  
  get: (id: string) => request<Video>(`/videos/${id}`),
  
  upload: async (file: File, title?: string, description?: string): Promise<Video> => {
    const formData = new FormData();
    formData.append('video', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    
    const response = await fetch(`${API_URL}/videos`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
  
  update: (id: string, data: Partial<Video>) => 
    request<Video>(`/videos/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: string) => 
    request<{ success: boolean }>(`/videos/${id}`, { method: 'DELETE' }),
  
  getFileUrl: (filename: string) => 
    `${API_URL.replace('/api', '')}/uploads/${filename}`,
};

// Destinations API
export const destinationsApi = {
  getAll: () => request<RtmpDestination[]>('/destinations'),
  
  get: (id: string) => request<RtmpDestination>(`/destinations/${id}`),
  
  create: (data: Omit<RtmpDestination, 'id' | 'created_at' | 'updated_at'>) => 
    request<RtmpDestination>('/destinations', { method: 'POST', body: data }),
  
  update: (id: string, data: Partial<RtmpDestination>) => 
    request<RtmpDestination>(`/destinations/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: string) => 
    request<{ success: boolean }>(`/destinations/${id}`, { method: 'DELETE' }),
};

// Streams API
export const streamsApi = {
  getAll: () => request<Stream[]>('/streams'),
  
  get: (id: string) => request<Stream>(`/streams/${id}`),
  
  create: (data: CreateStreamData) => 
    request<Stream>('/streams', { method: 'POST', body: data }),
  
  updateStatus: (id: string, status: string) => 
    request<Stream>(`/streams/${id}/status`, { method: 'PUT', body: { status } }),
  
  delete: (id: string) => 
    request<{ success: boolean }>(`/streams/${id}`, { method: 'DELETE' }),
  
  start: (id: string) => 
    request<{ success: boolean; message: string }>(`/streams/${id}/start`, { method: 'POST' }),
  
  stop: (id: string) => 
    request<{ success: boolean; message: string }>(`/streams/${id}/stop`, { method: 'POST' }),
  
  getStatus: (id: string) => 
    request<{ running: boolean; status?: string; retryCount?: number }>(`/streams/${id}/status`),
  
  getActiveList: () => 
    request<{ streams: ActiveStreamInfo[] }>('/streams/active/list'),
};

// System API
export const systemApi = {
  health: () => request<SystemHealth>('/system/health'),
  info: () => request<SystemInfo>('/system/info'),
};

// Logs API
export const logsApi = {
  getAll: (limit = 100, streamId?: string, level?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (streamId) params.append('streamId', streamId);
    if (level) params.append('level', level);
    return request<LogEntry[]>(`/logs?${params}`);
  },
  
  clear: (streamId?: string) => {
    const params = streamId ? `?streamId=${streamId}` : '';
    return request<{ success: boolean }>(`/logs${params}`, { method: 'DELETE' });
  },
  
  getStats: () => request<LogStats>('/logs/stats'),
};

// Health check (legacy)
export const healthApi = {
  check: () => request<{ status: string; timestamp: string; version: string }>('/health'),
};

// Types
export interface Video {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  duration: number | null;
  thumbnail_url: string | null;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

export interface RtmpDestination {
  id: string;
  name: string;
  platform: string;
  rtmp_url: string;
  stream_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stream {
  id: string;
  video_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'failed' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  loop_video: boolean;
  is_running?: boolean;
  recovery_status?: string | null;
  retry_count?: number;
  created_at: string;
  updated_at: string;
  video?: Video | null;
  destinations?: StreamDestination[];
}

export interface StreamDestination {
  id: string;
  stream_id: string;
  destination_id: string;
  status: 'pending' | 'connecting' | 'live' | 'error' | 'completed';
  error_message: string | null;
  created_at: string;
  destination?: RtmpDestination;
}

export interface CreateStreamData {
  title: string;
  description?: string;
  video_id?: string;
  scheduled_at?: string;
  loop_video?: boolean;
  destination_ids: string[];
}

export interface ActiveStreamInfo {
  streamId: string;
  status: string;
  startedAt: string;
  retryCount: number;
  pid: number | null;
}

export interface SystemHealth {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  uptimeFormatted: string;
  ffmpeg: 'available' | 'not found';
  ffmpegVersion: string | null;
  memory: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  };
  system: {
    platform: string;
    arch: string;
    cpus: number;
    totalMemory: string;
    freeMemory: string;
    loadAvg: number[];
  };
  streams: {
    active: number;
    list: ActiveStreamInfo[];
  };
}

export interface SystemInfo {
  node: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: {
    total: string;
    free: string;
    used: string;
  };
  uptime: {
    system: string;
    process: string;
  };
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  streamId: string | null;
}

export interface LogStats {
  activeCount: number;
  streams: ActiveStreamInfo[];
  totalLogs: number;
}
