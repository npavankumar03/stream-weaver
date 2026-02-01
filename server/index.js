require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db/database');
const { getInstance: getStreamManager } = require('./lib/streamManager');
const videosRouter = require('./routes/videos');
const destinationsRouter = require('./routes/destinations');
const streamsRouter = require('./routes/streams');
const logsRouter = require('./routes/logs');
const systemRouter = require('./routes/system');

const app = express();

// Initialize stream manager
const streamManager = getStreamManager(db, {
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,
});

// Pass stream manager to routes that need it
logsRouter.setStreamManager(streamManager);
systemRouter.setStreamManager(streamManager);

// CORS configuration
const corsOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json());

// Serve uploaded videos
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// API routes
app.use('/api/videos', videosRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/streams', streamsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/system', systemRouter);

// Legacy health check (for backwards compatibility)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Stream manager event logging
streamManager.on('streamStarted', ({ streamId, pid }) => {
  console.log(`Stream ${streamId} started with PID ${pid}`);
});

streamManager.on('streamRecovering', ({ streamId, attempt }) => {
  console.log(`Stream ${streamId} recovering (attempt ${attempt})`);
});

streamManager.on('streamRecovered', ({ streamId }) => {
  console.log(`Stream ${streamId} recovered successfully`);
});

streamManager.on('streamFailed', ({ streamId }) => {
  console.error(`Stream ${streamId} failed after max retries`);
});

streamManager.on('streamCompleted', ({ streamId }) => {
  console.log(`Stream ${streamId} completed`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping all streams...');
  streamManager.stopAllStreams();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping all streams...');
  streamManager.stopAllStreams();
  process.exit(0);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`StreamFlow Backend running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`System health: http://localhost:${PORT}/api/system/health`);
});

// Export for testing
module.exports = { app, streamManager };
