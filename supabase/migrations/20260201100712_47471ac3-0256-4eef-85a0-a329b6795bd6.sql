-- Create videos table for uploaded video files
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  duration INTEGER, -- duration in seconds
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RTMP destinations table
CREATE TABLE public.rtmp_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- youtube, twitch, facebook, custom
  rtmp_url TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streams table
CREATE TABLE public.streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  loop_video BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stream_destinations junction table for multi-streaming
CREATE TABLE public.stream_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.rtmp_destinations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'live', 'error', 'completed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stream_id, destination_id)
);

-- Enable RLS on all tables (public access for self-hosted)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rtmp_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_destinations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (self-hosted, no auth required)
CREATE POLICY "Allow all access to videos" ON public.videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rtmp_destinations" ON public.rtmp_destinations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to streams" ON public.streams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stream_destinations" ON public.stream_destinations FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rtmp_destinations_updated_at BEFORE UPDATE ON public.rtmp_destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON public.streams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for streams table
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_destinations;

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Storage policies for videos bucket
CREATE POLICY "Allow public read access to videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Allow public upload to videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Allow public update to videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "Allow public delete from videos" ON storage.objects FOR DELETE USING (bucket_id = 'videos');