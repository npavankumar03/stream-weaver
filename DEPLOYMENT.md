# StreamFlow Self-Hosted Deployment Guide

Complete guide to deploy StreamFlow on your own Linux server.

## Quick Start (One Command)

```bash
# Clone your project to the server
cd /var/www
git clone <YOUR_REPO_URL> streamflow
cd streamflow

# Run the installer
sudo bash install.sh
```

The installer script handles everything automatically.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│     FFmpeg      │
│   (React App)   │     │   (Node.js)      │     │   (Streaming)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │     SQLite       │
                        │   (Local DB)     │
                        └──────────────────┘
```

---

## Features

### Production-Ready
- **Auto Recovery**: Crashed streams automatically restart (up to 3 retries)
- **Process Management**: PM2 ensures services stay running
- **Real-time Logs**: View FFmpeg and server logs from the UI
- **Health Monitoring**: Server status indicator in the dashboard

### Streaming
- Multi-destination RTMP streaming
- Video looping support
- Scheduled streams
- Concurrent stream management

---

## Manual Installation

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- At least 2GB RAM
- Root/sudo access

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg and build tools
sudo apt install -y ffmpeg build-essential python3

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2: Setup Project

```bash
# Create directory
sudo mkdir -p /var/www/streamflow
sudo chown $USER:$USER /var/www/streamflow
cd /var/www/streamflow

# Clone your project
git clone <YOUR_REPO_URL> .

# Install and build frontend
npm install
npm run build

# Install backend
cd server
npm install
```

### Step 3: Configure

```bash
cd /var/www/streamflow/server

# Create environment file
cat > .env << EOF
PORT=3001
FRONTEND_URL=http://YOUR_SERVER_IP
DATABASE_PATH=./data/streamflow.db
UPLOAD_DIR=./uploads
MAX_RETRIES=3
RETRY_DELAY=5000
NODE_ENV=production
EOF

# Create directories
mkdir -p uploads data
```

### Step 4: Start Services

```bash
cd /var/www/streamflow/server

# Start with PM2
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/streamflow
```

Add:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    client_max_body_size 10G;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        root /var/www/streamflow/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }

    location /uploads/ {
        alias /var/www/streamflow/server/uploads/;
        add_header Accept-Ranges bytes;
    }
}
```

Enable:

```bash
sudo ln -sf /etc/nginx/sites-available/streamflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## Management

### Service Commands

```bash
# View processes
pm2 list

# View logs
pm2 logs
pm2 logs streamflow-api
pm2 logs streamflow-scheduler

# Restart
pm2 restart all

# Stop
pm2 stop all
```

### Health Check

```bash
curl http://localhost:3001/api/system/health
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET, POST | List/upload videos |
| `/api/destinations` | GET, POST | Manage RTMP destinations |
| `/api/streams` | GET, POST | Manage streams |
| `/api/streams/:id/start` | POST | Start streaming |
| `/api/streams/:id/stop` | POST | Stop streaming |
| `/api/system/health` | GET | Server health |
| `/api/logs` | GET | System logs |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend port |
| `FRONTEND_URL` | - | Allowed CORS origin |
| `DATABASE_PATH` | ./data/streamflow.db | SQLite database path |
| `UPLOAD_DIR` | ./uploads | Video upload directory |
| `MAX_RETRIES` | 3 | Stream auto-recovery retries |
| `RETRY_DELAY` | 5000 | Delay between retries (ms) |

---

## Troubleshooting

### Stream not starting
1. Check FFmpeg: `ffmpeg -version`
2. Check video exists: `ls -la server/uploads/`
3. Check logs: `pm2 logs streamflow-api`

### Upload fails
- Increase Nginx limit: `client_max_body_size 10G`
- Check disk space: `df -h`

### Connection refused
- Check services: `pm2 list`
- Check port: `netstat -tlnp | grep 3001`
- Check Nginx: `sudo nginx -t`

---

## Updating

```bash
cd /var/www/streamflow
git pull
npm install
npm run build
cd server
npm install
pm2 restart all
```
