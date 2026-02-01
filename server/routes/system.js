const express = require('express');
const os = require('os');
const { execSync } = require('child_process');
const router = express.Router();

// Reference to stream manager - will be set by index.js
let streamManager = null;

function setStreamManager(sm) {
  streamManager = sm;
}

// GET system health
router.get('/health', (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Check FFmpeg availability
    let ffmpegVersion = null;
    try {
      ffmpegVersion = execSync('ffmpeg -version 2>&1 | head -n1', { encoding: 'utf-8' }).trim();
    } catch (e) {
      ffmpegVersion = null;
    }
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      ffmpeg: ffmpegVersion ? 'available' : 'not found',
      ffmpegVersion: ffmpegVersion,
      memory: {
        rss: formatBytes(memUsage.rss),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: formatBytes(os.totalmem()),
        freeMemory: formatBytes(os.freemem()),
        loadAvg: os.loadavg(),
      },
      streams: streamManager ? {
        active: streamManager.getActiveStreams().length,
        list: streamManager.getActiveStreams(),
      } : { active: 0, list: [] },
    };
    
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET system info
router.get('/info', (req, res) => {
  try {
    const info = {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memory: {
        total: formatBytes(os.totalmem()),
        free: formatBytes(os.freemem()),
        used: formatBytes(os.totalmem() - os.freemem()),
      },
      uptime: {
        system: formatUptime(os.uptime()),
        process: formatUptime(process.uptime()),
      },
    };
    
    res.json(info);
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: error.message });
  }
});

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = router;
module.exports.setStreamManager = setStreamManager;
