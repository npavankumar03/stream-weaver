/**
 * Stream Manager - Production-grade FFmpeg process management with auto-recovery
 */

const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class StreamManager extends EventEmitter {
  constructor(db, options = {}) {
    super();
    this.db = db;
    this.activeStreams = new Map();
    this.streamLogs = new Map(); // Store logs per stream
    this.globalLogs = []; // Global logs
    this.maxLogs = options.maxLogs || 1000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.uploadDir = options.uploadDir || './uploads';
    
    this.log('info', 'StreamManager initialized');
  }

  log(level, message, streamId = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      streamId,
    };
    
    this.globalLogs.push(entry);
    if (this.globalLogs.length > this.maxLogs) {
      this.globalLogs.shift();
    }
    
    if (streamId) {
      if (!this.streamLogs.has(streamId)) {
        this.streamLogs.set(streamId, []);
      }
      const logs = this.streamLogs.get(streamId);
      logs.push(entry);
      if (logs.length > this.maxLogs) {
        logs.shift();
      }
    }
    
    const logFn = level === 'error' ? console.error : console.log;
    logFn(`[${level.toUpperCase()}]${streamId ? ` [Stream ${streamId}]` : ''} ${message}`);
    
    this.emit('log', entry);
  }

  getLogs(streamId = null, limit = 100) {
    const logs = streamId ? (this.streamLogs.get(streamId) || []) : this.globalLogs;
    return logs.slice(-limit);
  }

  clearLogs(streamId = null) {
    if (streamId) {
      this.streamLogs.delete(streamId);
    } else {
      this.globalLogs = [];
    }
  }

  getStreamState(streamId) {
    return this.activeStreams.get(streamId);
  }

  getActiveStreams() {
    const active = [];
    for (const [id, state] of this.activeStreams) {
      active.push({
        streamId: id,
        status: state.status,
        startedAt: state.startedAt,
        retryCount: state.retryCount,
        pid: state.process ? state.process.pid : null,
      });
    }
    return active;
  }

  async startStream(streamId) {
    if (this.activeStreams.has(streamId)) {
      const state = this.activeStreams.get(streamId);
      if (state.status === 'running') {
        throw new Error('Stream already running');
      }
    }

    // Get stream with video and destinations
    const stream = this.db.prepare(`
      SELECT s.*, v.file_path as video_file_path
      FROM streams s
      LEFT JOIN videos v ON s.video_id = v.id
      WHERE s.id = ?
    `).get(streamId);
    
    if (!stream) {
      throw new Error('Stream not found');
    }
    
    if (!stream.video_file_path) {
      throw new Error('No video assigned to stream');
    }
    
    // Get active destinations
    const destinations = this.db.prepare(`
      SELECT rd.* FROM stream_destinations sd
      JOIN rtmp_destinations rd ON sd.destination_id = rd.id
      WHERE sd.stream_id = ? AND rd.is_active = 1
    `).all(streamId);
    
    if (destinations.length === 0) {
      throw new Error('No active destinations');
    }

    // Initialize stream state
    this.activeStreams.set(streamId, {
      status: 'starting',
      startedAt: new Date().toISOString(),
      retryCount: 0,
      stream,
      destinations,
      process: null,
    });

    return this._spawnFFmpeg(streamId);
  }

  _spawnFFmpeg(streamId) {
    const state = this.activeStreams.get(streamId);
    if (!state) {
      throw new Error('Stream state not found');
    }

    const { stream, destinations } = state;
    const videoPath = path.join(this.uploadDir, stream.video_file_path);
    
    const args = [];
    
    if (stream.loop_video) {
      args.push('-stream_loop', '-1');
    }
    
    args.push(
      '-re',
      '-i', videoPath,
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
    
    // Add each destination with tee muxer for better multi-destination handling
    for (const dest of destinations) {
      const rtmpUrl = `${dest.rtmp_url}/${dest.stream_key}`;
      args.push('-f', 'flv', rtmpUrl);
    }
    
    this.log('info', `Starting FFmpeg: ffmpeg ${args.join(' ')}`, streamId);
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    state.process = ffmpeg;
    state.status = 'running';

    ffmpeg.stdout.on('data', (data) => {
      this.log('debug', `stdout: ${data.toString().trim()}`, streamId);
    });
    
    ffmpeg.stderr.on('data', (data) => {
      // FFmpeg outputs progress to stderr
      const msg = data.toString().trim();
      // Filter out progress lines for cleaner logs
      if (!msg.includes('frame=') && !msg.includes('size=')) {
        this.log('info', msg, streamId);
      }
    });
    
    ffmpeg.on('close', (code, signal) => {
      this.log('info', `FFmpeg exited with code ${code}, signal ${signal}`, streamId);
      this._handleExit(streamId, code, signal);
    });
    
    ffmpeg.on('error', (err) => {
      this.log('error', `FFmpeg error: ${err.message}`, streamId);
      this._handleError(streamId, err);
    });
    
    // Update database status
    this.db.prepare(`
      UPDATE streams 
      SET status = 'live', started_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(streamId);
    
    this.db.prepare(`
      UPDATE stream_destinations SET status = 'live' WHERE stream_id = ?
    `).run(streamId);
    
    this.log('info', `Stream started successfully (PID: ${ffmpeg.pid})`, streamId);
    this.emit('streamStarted', { streamId, pid: ffmpeg.pid });
    
    return { success: true, pid: ffmpeg.pid };
  }

  _handleExit(streamId, code, signal) {
    const state = this.activeStreams.get(streamId);
    if (!state) return;

    // If it was a graceful stop (we called stop)
    if (state.status === 'stopping') {
      this.activeStreams.delete(streamId);
      this.db.prepare(`
        UPDATE streams 
        SET status = 'completed', ended_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(streamId);
      this.log('info', 'Stream stopped gracefully', streamId);
      this.emit('streamStopped', { streamId });
      return;
    }

    // Check if we should retry
    if (code !== 0 && state.retryCount < this.maxRetries) {
      state.retryCount++;
      state.status = 'recovering';
      
      this.log('warn', `Stream crashed, attempting recovery (${state.retryCount}/${this.maxRetries})...`, streamId);
      this.emit('streamRecovering', { streamId, attempt: state.retryCount });
      
      setTimeout(() => {
        try {
          this._spawnFFmpeg(streamId);
          this.log('info', 'Stream recovered successfully', streamId);
          this.emit('streamRecovered', { streamId });
        } catch (err) {
          this.log('error', `Recovery failed: ${err.message}`, streamId);
          this._markFailed(streamId);
        }
      }, this.retryDelay);
    } else if (code === 0) {
      // Normal completion
      this.activeStreams.delete(streamId);
      this.db.prepare(`
        UPDATE streams 
        SET status = 'completed', ended_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(streamId);
      this.log('info', 'Stream completed successfully', streamId);
      this.emit('streamCompleted', { streamId });
    } else {
      // Max retries exceeded
      this._markFailed(streamId);
    }
  }

  _handleError(streamId, err) {
    const state = this.activeStreams.get(streamId);
    if (!state) return;

    if (state.retryCount < this.maxRetries) {
      state.retryCount++;
      state.status = 'recovering';
      
      this.log('warn', `Stream error, attempting recovery (${state.retryCount}/${this.maxRetries})...`, streamId);
      
      setTimeout(() => {
        try {
          this._spawnFFmpeg(streamId);
        } catch (err) {
          this.log('error', `Recovery failed: ${err.message}`, streamId);
          this._markFailed(streamId);
        }
      }, this.retryDelay);
    } else {
      this._markFailed(streamId);
    }
  }

  _markFailed(streamId) {
    this.activeStreams.delete(streamId);
    this.db.prepare(`
      UPDATE streams 
      SET status = 'failed', ended_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(streamId);
    this.log('error', 'Stream failed after max retries', streamId);
    this.emit('streamFailed', { streamId });
  }

  stopStream(streamId) {
    const state = this.activeStreams.get(streamId);
    
    if (!state || !state.process) {
      throw new Error('Stream not running');
    }
    
    state.status = 'stopping';
    state.process.kill('SIGTERM');
    
    // Force kill after 10 seconds if not stopped
    setTimeout(() => {
      if (this.activeStreams.has(streamId)) {
        const s = this.activeStreams.get(streamId);
        if (s.process) {
          this.log('warn', 'Force killing stream after timeout', streamId);
          s.process.kill('SIGKILL');
        }
        this.activeStreams.delete(streamId);
      }
    }, 10000);
    
    return { success: true, message: 'Stop signal sent' };
  }

  stopAllStreams() {
    const stopped = [];
    for (const [streamId] of this.activeStreams) {
      try {
        this.stopStream(streamId);
        stopped.push(streamId);
      } catch (err) {
        this.log('error', `Failed to stop stream ${streamId}: ${err.message}`);
      }
    }
    return stopped;
  }

  getStats() {
    return {
      activeCount: this.activeStreams.size,
      streams: this.getActiveStreams(),
      totalLogs: this.globalLogs.length,
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  StreamManager,
  getInstance: (db, options) => {
    if (!instance) {
      instance = new StreamManager(db, options);
    }
    return instance;
  },
};
