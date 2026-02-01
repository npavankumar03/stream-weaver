# StreamFlow Self-Hosted Deployment Guide

This guide walks you through setting up StreamFlow on your own Linux server for multi-streaming videos to RTMP destinations.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│     FFmpeg      │
│   (React App)   │     │   (Node.js)      │     │   (Streaming)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │    Database      │
                        │  (Lovable Cloud) │
                        └──────────────────┘
```

---

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ (recommended)
- Node.js 18+ 
- FFmpeg
- Git
- At least 2GB RAM
- Sufficient bandwidth for streaming

---

## Step 1: Install System Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Verify installations
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
ffmpeg -version   # Should show ffmpeg version info

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx
```

---

## Step 2: Clone and Build the Frontend

```bash
# Create application directory
sudo mkdir -p /var/www/streamflow
sudo chown $USER:$USER /var/www/streamflow
cd /var/www/streamflow

# Clone your repository (replace with your actual repo URL)
git clone <YOUR_GITHUB_REPO_URL> frontend
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the 'dist' folder
```

---

## Step 3: Create the Backend Streaming Service

Create a new directory for the backend service:

```bash
mkdir -p /var/www/streamflow/backend
cd /var/www/streamflow/backend
npm init -y
npm install express cors @supabase/supabase-js dotenv
```

Create the backend service file:

```bash
cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Store active streams
const activeStreams = new Map();

// Get video public URL
function getVideoUrl(filePath) {
  const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
  return data.publicUrl;
}

// Build FFmpeg command for multi-streaming
function buildFFmpegCommand(videoUrl, destinations, loop = false) {
  const args = [];
  
  // Input options
  if (loop) {
    args.push('-stream_loop', '-1');
  }
  args.push('-re', '-i', videoUrl);
  
  // Video encoding settings
  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '3000k',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', '50',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100'
  );
  
  // Add each destination as a separate output
  destinations.forEach((dest, index) => {
    const rtmpUrl = `${dest.rtmp_url}/${dest.stream_key}`;
    args.push('-f', 'flv', rtmpUrl);
  });
  
  return args;
}

// Start a stream
app.post('/api/streams/:id/start', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get stream details with video and destinations
    const { data: stream, error } = await supabase
      .from('streams')
      .select(`
        *,
        video:videos(*),
        destinations:stream_destinations(
          *,
          destination:rtmp_destinations(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!stream) throw new Error('Stream not found');
    if (!stream.video) throw new Error('No video assigned to stream');
    
    // Check if already streaming
    if (activeStreams.has(id)) {
      return res.status(400).json({ error: 'Stream already running' });
    }
    
    // Get active destinations
    const destinations = stream.destinations
      .filter(d => d.destination?.is_active)
      .map(d => d.destination);
    
    if (destinations.length === 0) {
      throw new Error('No active destinations configured');
    }
    
    // Get video URL
    const videoUrl = getVideoUrl(stream.video.file_path);
    
    // Build FFmpeg command
    const ffmpegArgs = buildFFmpegCommand(videoUrl, destinations, stream.loop_video);
    
    console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));
    
    // Spawn FFmpeg process
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stdout.on('data', (data) => {
      console.log(`[Stream ${id}] stdout: ${data}`);
    });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`[Stream ${id}] stderr: ${data}`);
    });
    
    ffmpeg.on('close', async (code) => {
      console.log(`[Stream ${id}] FFmpeg exited with code ${code}`);
      activeStreams.delete(id);
      
      // Update stream status
      await supabase
        .from('streams')
        .update({ 
          status: code === 0 ? 'completed' : 'failed',
          ended_at: new Date().toISOString()
        })
        .eq('id', id);
    });
    
    ffmpeg.on('error', async (err) => {
      console.error(`[Stream ${id}] FFmpeg error:`, err);
      activeStreams.delete(id);
      
      await supabase
        .from('streams')
        .update({ 
          status: 'failed',
          ended_at: new Date().toISOString()
        })
        .eq('id', id);
    });
    
    // Store process reference
    activeStreams.set(id, ffmpeg);
    
    // Update stream status to live
    await supabase
      .from('streams')
      .update({ 
        status: 'live',
        started_at: new Date().toISOString()
      })
      .eq('id', id);
    
    // Update destination statuses
    for (const dest of stream.destinations) {
      await supabase
        .from('stream_destinations')
        .update({ status: 'live' })
        .eq('id', dest.id);
    }
    
    res.json({ success: true, message: 'Stream started' });
    
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop a stream
app.post('/api/streams/:id/stop', async (req, res) => {
  const { id } = req.params;
  
  const ffmpeg = activeStreams.get(id);
  
  if (!ffmpeg) {
    return res.status(400).json({ error: 'Stream not running' });
  }
  
  // Kill FFmpeg process
  ffmpeg.kill('SIGTERM');
  activeStreams.delete(id);
  
  // Update stream status
  await supabase
    .from('streams')
    .update({ 
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', id);
  
  res.json({ success: true, message: 'Stream stopped' });
});

// Get stream status
app.get('/api/streams/:id/status', (req, res) => {
  const { id } = req.params;
  const isRunning = activeStreams.has(id);
  res.json({ running: isRunning });
});

// List all active streams
app.get('/api/streams/active', (req, res) => {
  const active = Array.from(activeStreams.keys());
  res.json({ streams: active });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StreamFlow Backend running on port ${PORT}`);
});
EOF
```

Create environment file:

```bash
cat > .env << 'EOF'
# Supabase Configuration (get these from your Lovable project)
SUPABASE_URL=https://anlcgrwxjegkaujyqjoq.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Server Port
PORT=3001
EOF
```

**IMPORTANT**: Replace `your_service_role_key_here` with your actual Supabase service role key.

---

## Step 4: Create Scheduler Service

Create a scheduler to automatically start scheduled streams:

```bash
cat > scheduler.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BACKEND_URL = `http://localhost:${process.env.PORT || 3001}`;

async function checkScheduledStreams() {
  const now = new Date().toISOString();
  
  // Find streams that are scheduled and due to start
  const { data: streams, error } = await supabase
    .from('streams')
    .select('id, title, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);
  
  if (error) {
    console.error('Error fetching scheduled streams:', error);
    return;
  }
  
  for (const stream of streams) {
    console.log(`Starting scheduled stream: ${stream.title}`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/streams/${stream.id}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log(`Successfully started stream: ${stream.title}`);
      } else {
        const data = await response.json();
        console.error(`Failed to start stream: ${data.error}`);
      }
    } catch (err) {
      console.error(`Error starting stream ${stream.id}:`, err);
    }
  }
}

// Check every minute
console.log('Scheduler started - checking every minute');
setInterval(checkScheduledStreams, 60000);
checkScheduledStreams(); // Run immediately on start
EOF
```

---

## Step 5: Configure PM2 Process Manager

Create PM2 ecosystem file:

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'streamflow-api',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'streamflow-scheduler',
      script: 'scheduler.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start services with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Step 6: Configure Nginx

Create Nginx configuration:

```bash
sudo cat > /etc/nginx/sites-available/streamflow << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Frontend
    location / {
        root /var/www/streamflow/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/streamflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 7: Update Frontend to Use Local Backend

Update your frontend to call the local backend API. Add this to your `.env` file in the frontend:

```bash
VITE_BACKEND_URL=http://your-server-ip:3001
```

---

## Step 8: Get Your Supabase Service Key

1. Open your Lovable project
2. Click **Settings** → **Connectors** → **Lovable Cloud**
3. Click **View Backend**
4. Navigate to **Settings** → **API**
5. Copy the **service_role** key (keep this secret!)
6. Paste it in `/var/www/streamflow/backend/.env`

---

## Usage

### Starting/Stopping Services

```bash
# View running processes
pm2 list

# View logs
pm2 logs streamflow-api
pm2 logs streamflow-scheduler

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/streams/:id/start` | POST | Start a stream |
| `/api/streams/:id/stop` | POST | Stop a stream |
| `/api/streams/:id/status` | GET | Get stream status |
| `/api/streams/active` | GET | List active streams |
| `/api/health` | GET | Health check |

---

## Troubleshooting

### FFmpeg Issues

```bash
# Test FFmpeg installation
ffmpeg -version

# Test a simple stream
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://a.rtmp.youtube.com/live2/YOUR_KEY
```

### Check Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Common Issues

1. **Stream not starting**: Check if video URL is accessible
2. **Connection refused**: Verify backend is running with `pm2 list`
3. **RTMP errors**: Verify stream key and URL are correct

---

## Security Recommendations

1. **Enable HTTPS** with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **Firewall Configuration**:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Keep service key secret** - never commit to Git

---

## Updating the Application

```bash
cd /var/www/streamflow/frontend
git pull
npm install
npm run build
pm2 restart all
```
