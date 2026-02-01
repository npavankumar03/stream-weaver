# StreamFlow Self-Hosted Deployment Guide

Complete guide to deploy StreamFlow on your own Linux server with SQLite database.

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

## Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Node.js 18+
- FFmpeg
- Git
- At least 2GB RAM

---

## Step 1: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg and build tools (for SQLite)
sudo apt install -y ffmpeg build-essential python3

# Verify installations
node --version    # v20.x.x
ffmpeg -version

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

---

## Step 2: Clone and Setup Project

```bash
# Create application directory
sudo mkdir -p /var/www/streamflow
sudo chown $USER:$USER /var/www/streamflow
cd /var/www/streamflow

# Clone repository (replace with your repo URL)
git clone <YOUR_GITHUB_REPO_URL> .

# Install frontend dependencies and build
npm install
npm run build

# Install backend dependencies
cd server
npm install
```

---

## Step 3: Configure Backend

```bash
cd /var/www/streamflow/server

# Create environment file
cp .env.example .env

# Edit configuration
nano .env
```

Update `.env` with your settings:

```env
PORT=3001
FRONTEND_URL=http://your-domain.com
DATABASE_PATH=./data/streamflow.db
UPLOAD_DIR=./uploads
```

---

## Step 4: Start Services with PM2

```bash
cd /var/www/streamflow/server

# Start both API and scheduler
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/streamflow
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Increase upload size limit for videos
    client_max_body_size 10G;

    # Frontend
    location / {
        root /var/www/streamflow/dist;
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
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Serve uploaded videos
    location /uploads/ {
        alias /var/www/streamflow/server/uploads/;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/streamflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 6: Update Frontend API URL

Create production environment file:

```bash
cd /var/www/streamflow
echo "VITE_API_URL=http://your-domain.com/api" > .env.production
npm run build
```

---

## Usage

### Service Management

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
| `/api/videos` | GET, POST | List/upload videos |
| `/api/videos/:id` | GET, PUT, DELETE | Manage video |
| `/api/destinations` | GET, POST | List/create RTMP destinations |
| `/api/destinations/:id` | GET, PUT, DELETE | Manage destination |
| `/api/streams` | GET, POST | List/create streams |
| `/api/streams/:id/start` | POST | Start streaming |
| `/api/streams/:id/stop` | POST | Stop streaming |
| `/api/health` | GET | Health check |

---

## Troubleshooting

### Check Logs

```bash
# Backend logs
pm2 logs streamflow-api

# Scheduler logs
pm2 logs streamflow-scheduler

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Common Issues

1. **Video upload fails**: Check `client_max_body_size` in Nginx
2. **Stream not starting**: Verify FFmpeg is installed and video file exists
3. **CORS errors**: Check `FRONTEND_URL` in backend `.env`

---

## Enable HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

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
