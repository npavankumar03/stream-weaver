-- StreamFlow SQLite Schema

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  duration REAL,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'ready' CHECK(status IN ('uploading', 'processing', 'ready', 'error')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- RTMP Destinations table
CREATE TABLE IF NOT EXISTS rtmp_destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  rtmp_url TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Streams table
CREATE TABLE IF NOT EXISTS streams (
  id TEXT PRIMARY KEY,
  video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'live', 'completed', 'failed', 'cancelled')),
  scheduled_at TEXT,
  started_at TEXT,
  ended_at TEXT,
  loop_video INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Stream Destinations junction table
CREATE TABLE IF NOT EXISTS stream_destinations (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL REFERENCES rtmp_destinations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'connecting', 'live', 'error', 'completed')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
CREATE INDEX IF NOT EXISTS idx_streams_scheduled_at ON streams(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_stream_destinations_stream_id ON stream_destinations(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_destinations_destination_id ON stream_destinations(destination_id);
