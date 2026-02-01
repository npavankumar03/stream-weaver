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
  created_at: string;
  updated_at: string;
  video?: Video;
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

export type Platform = 'youtube' | 'twitch' | 'facebook' | 'custom';

export const platformConfigs: Record<Platform, { name: string; color: string; defaultUrl: string }> = {
  youtube: { 
    name: 'YouTube Live', 
    color: 'bg-red-600', 
    defaultUrl: 'rtmp://a.rtmp.youtube.com/live2' 
  },
  twitch: { 
    name: 'Twitch', 
    color: 'bg-purple-600', 
    defaultUrl: 'rtmp://live.twitch.tv/app' 
  },
  facebook: { 
    name: 'Facebook Live', 
    color: 'bg-blue-600', 
    defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp' 
  },
  custom: { 
    name: 'Custom RTMP', 
    color: 'bg-gray-600', 
    defaultUrl: '' 
  },
};
