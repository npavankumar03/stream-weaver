#!/bin/bash

# StreamFlow Installation Script
# Self-hosted multi-destination streaming platform
# Usage: bash install.sh [OPTIONS]
#
# Options:
#   --port PORT        Backend port (default: 3001)
#   --ip IP            Server IP address (auto-detected if not provided)
#   --skip-nginx       Skip Nginx installation/configuration
#   --skip-pm2-setup   Skip PM2 startup configuration
#   --help             Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PORT=3001
SERVER_IP=""
SKIP_NGINX=false
SKIP_PM2_SETUP=false
INSTALL_DIR="/var/www/streamflow"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      PORT="$2"
      shift 2
      ;;
    --ip)
      SERVER_IP="$2"
      shift 2
      ;;
    --skip-nginx)
      SKIP_NGINX=true
      shift
      ;;
    --skip-pm2-setup)
      SKIP_PM2_SETUP=true
      shift
      ;;
    --help)
      head -20 "$0" | tail -15
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
  fi
}

detect_ip() {
  if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    log_info "Detected server IP: $SERVER_IP"
  fi
}

# Main installation
main() {
  echo ""
  echo "=========================================="
  echo "   StreamFlow Installation Script"
  echo "=========================================="
  echo ""

  check_root
  detect_ip

  log_info "Starting installation..."
  log_info "Install directory: $INSTALL_DIR"
  log_info "Backend port: $PORT"
  log_info "Server IP: $SERVER_IP"
  echo ""

  # Update system
  log_info "Updating system packages..."
  apt update -y
  apt upgrade -y
  log_success "System updated"

  # Install Node.js 20.x
  log_info "Installing Node.js 20.x..."
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  else
    log_warn "Node.js already installed: $(node --version)"
  fi
  log_success "Node.js installed: $(node --version)"

  # Install FFmpeg
  log_info "Installing FFmpeg..."
  apt install -y ffmpeg
  log_success "FFmpeg installed: $(ffmpeg -version 2>&1 | head -n1)"

  # Install build tools (required for better-sqlite3)
  log_info "Installing build tools..."
  apt install -y build-essential python3
  log_success "Build tools installed"

  # Install PM2
  log_info "Installing PM2..."
  npm install -g pm2
  log_success "PM2 installed"

  # Create installation directory
  log_info "Creating installation directory..."
  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"

  # Check if this is a fresh install or update
  if [ -f "package.json" ]; then
    log_info "Existing installation found. Updating..."
    git pull 2>/dev/null || log_warn "Not a git repository, skipping pull"
  else
    log_info "Fresh installation. Please copy your project files to $INSTALL_DIR"
    log_warn "After copying files, run this script again"
    
    # Create placeholder structure
    mkdir -p server/uploads server/data
    
    cat > install-continue.sh << 'CONTINUE_SCRIPT'
#!/bin/bash
# Run this after copying project files

cd /var/www/streamflow

# Install frontend dependencies
npm install
npm run build

# Install backend dependencies
cd server
npm install

# Create .env file
if [ ! -f .env ]; then
  cat > .env << EOF
PORT=3001
FRONTEND_URL=http://$(hostname -I | awk '{print $1}')
DATABASE_PATH=./data/streamflow.db
UPLOAD_DIR=./uploads
MAX_RETRIES=3
RETRY_DELAY=5000
NODE_ENV=production
EOF
fi

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "Installation complete!"
CONTINUE_SCRIPT
    chmod +x install-continue.sh
    
    exit 0
  fi

  # Install frontend dependencies and build
  log_info "Installing frontend dependencies..."
  npm install
  log_success "Frontend dependencies installed"

  log_info "Building frontend..."
  npm run build
  log_success "Frontend built"

  # Install backend dependencies
  log_info "Installing backend dependencies..."
  cd server
  npm install
  log_success "Backend dependencies installed"

  # Create directories
  mkdir -p uploads data

  # Create/update .env file
  log_info "Creating environment configuration..."
  cat > .env << EOF
PORT=$PORT
FRONTEND_URL=http://$SERVER_IP
DATABASE_PATH=./data/streamflow.db
UPLOAD_DIR=./uploads
MAX_RETRIES=3
RETRY_DELAY=5000
NODE_ENV=production
EOF
  log_success "Environment configured"

  # Stop existing PM2 processes
  pm2 delete all 2>/dev/null || true

  # Start services with PM2
  log_info "Starting services with PM2..."
  pm2 start ecosystem.config.js
  log_success "Services started"

  # Save PM2 configuration
  pm2 save

  # Setup PM2 startup
  if [ "$SKIP_PM2_SETUP" = false ]; then
    log_info "Configuring PM2 startup..."
    pm2 startup systemd -u root --hp /root
    log_success "PM2 startup configured"
  fi

  # Install and configure Nginx
  if [ "$SKIP_NGINX" = false ]; then
    log_info "Installing Nginx..."
    apt install -y nginx
    log_success "Nginx installed"

    log_info "Configuring Nginx..."
    cat > /etc/nginx/sites-available/streamflow << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Increase upload size limit for videos (10GB)
    client_max_body_size 10G;
    
    # Increase timeouts for large uploads
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;

    # Frontend
    location / {
        root $INSTALL_DIR/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Serve uploaded videos
    location /uploads/ {
        alias $INSTALL_DIR/server/uploads/;
        
        # Enable range requests for video seeking
        add_header Accept-Ranges bytes;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/streamflow /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    systemctl enable nginx
    log_success "Nginx configured"
  fi

  # Set permissions
  log_info "Setting permissions..."
  chown -R www-data:www-data "$INSTALL_DIR/server/uploads"
  chmod -R 755 "$INSTALL_DIR/server/uploads"
  log_success "Permissions set"

  # Final output
  echo ""
  echo "=========================================="
  echo "   Installation Complete!"
  echo "=========================================="
  echo ""
  log_success "StreamFlow is now running!"
  echo ""
  echo "Access your application at:"
  echo -e "  ${GREEN}http://$SERVER_IP${NC}"
  echo ""
  echo "API endpoint:"
  echo -e "  ${GREEN}http://$SERVER_IP/api${NC}"
  echo ""
  echo "Useful commands:"
  echo "  pm2 list                 - View running processes"
  echo "  pm2 logs                 - View all logs"
  echo "  pm2 logs streamflow-api  - View API logs"
  echo "  pm2 restart all          - Restart all services"
  echo "  pm2 stop all             - Stop all services"
  echo ""
  echo "Locations:"
  echo "  Install dir: $INSTALL_DIR"
  echo "  Uploads:     $INSTALL_DIR/server/uploads"
  echo "  Database:    $INSTALL_DIR/server/data/streamflow.db"
  echo "  Logs:        pm2 logs"
  echo ""
  log_info "Check server health: curl http://localhost:$PORT/api/system/health"
  echo ""
}

# Run main function
main "$@"
