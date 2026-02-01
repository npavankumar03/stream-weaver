const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db/database');

const router = express.Router();

// Store active FFmpeg processes
const activeStreams = new Map();

// GET all streams with related data
router.get('/', (req, res) => {
  try {
    const streams = db.prepare(`
      SELECT s.*, v.title as video_title, v.file_path as video_file_path
      FROM streams s
      LEFT JOIN videos v ON s.video_id = v.id
      ORDER BY s.created_at DESC
    `).all();
    
    // Get destinations for each stream
    const result = streams.map(stream => {
      const destinations = db.prepare(`
        SELECT sd.*, rd.name, rd.platform, rd.rtmp_url, rd.stream_key, rd.is_active
        FROM stream_destinations sd
        JOIN rtmp_destinations rd ON sd.destination_id = rd.id
        WHERE sd.stream_id = ?
      `).all(stream.id);
      
      return {
        ...stream,
        loop_video: Boolean(stream.loop_video),
        video: stream.video_id ? {
          id: stream.video_id,
          title: stream.video_title,
          file_path: stream.video_file_path,
        } : null,
        destinations: destinations.map(d => ({
          id: d.id,
          stream_id: d.stream_id,
          destination_id: d.destination_id,
          status: d.status,
          error_message: d.error_message,
          created_at: d.created_at,
          destination: {
            id: d.destination_id,
            name: d.name,
            platform: d.platform,
            rtmp_url: d.rtmp_url,
            stream_key: d.stream_key,
            is_active: Boolean(d.is_active),
          }
        })),
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single stream
router.get('/:id', (req, res) => {
  try {
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json({
      ...stream,
      loop_video: Boolean(stream.loop_video),
    });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create stream
router.post('/', (req, res) => {
  try {
    const { title, description, video_id, scheduled_at, loop_video, destination_ids } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const id = uuidv4();
    const status = scheduled_at ? 'scheduled' : 'pending';
    
    const stmt = db.prepare(`
      INSERT INTO streams (id, title, description, video_id, scheduled_at, loop_video, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, title, description || null, video_id || null, scheduled_at || null, loop_video ? 1 : 0, status);
    
    // Add destinations
    if (destination_ids && destination_ids.length > 0) {
      const destStmt = db.prepare(`
        INSERT INTO stream_destinations (id, stream_id, destination_id)
        VALUES (?, ?, ?)
      `);
      
      for (const destId of destination_ids) {
        destStmt.run(uuidv4(), id, destId);
      }
    }
    
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(id);
    
    res.status(201).json({
      ...stream,
      loop_video: Boolean(stream.loop_video),
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update stream status
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'scheduled', 'live', 'completed', 'failed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updates = { status };
    
    if (status === 'live') {
      updates.started_at = new Date().toISOString();
    } else if (['completed', 'failed', 'cancelled'].includes(status)) {
      updates.ended_at = new Date().toISOString();
    }
    
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];
    
    const stmt = db.prepare(`
      UPDATE streams 
      SET ${setClauses}, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id);
    
    res.json({
      ...stream,
      loop_video: Boolean(stream.loop_video),
    });
  } catch (error) {
    console.error('Error updating stream status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE stream
router.delete('/:id', (req, res) => {
  try {
    // Stop if running
    if (activeStreams.has(req.params.id)) {
      const ffmpeg = activeStreams.get(req.params.id);
      ffmpeg.kill('SIGTERM');
      activeStreams.delete(req.params.id);
    }
    
    const result = db.prepare('DELETE FROM streams WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST start stream (FFmpeg)
router.post('/:id/start', (req, res) => {
  try {
    const streamId = req.params.id;
    
    if (activeStreams.has(streamId)) {
      return res.status(400).json({ error: 'Stream already running' });
    }
    
    // Get stream with video and destinations
    const stream = db.prepare(`
      SELECT s.*, v.file_path as video_file_path
      FROM streams s
      LEFT JOIN videos v ON s.video_id = v.id
      WHERE s.id = ?
    `).get(streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (!stream.video_file_path) {
      return res.status(400).json({ error: 'No video assigned to stream' });
    }
    
    // Get active destinations
    const destinations = db.prepare(`
      SELECT rd.* FROM stream_destinations sd
      JOIN rtmp_destinations rd ON sd.destination_id = rd.id
      WHERE sd.stream_id = ? AND rd.is_active = 1
    `).all(streamId);
    
    if (destinations.length === 0) {
      return res.status(400).json({ error: 'No active destinations' });
    }
    
    // Build FFmpeg command
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const videoPath = path.join(uploadDir, stream.video_file_path);
    
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
    
    // Add each destination
    for (const dest of destinations) {
      const rtmpUrl = `${dest.rtmp_url}/${dest.stream_key}`;
      args.push('-f', 'flv', rtmpUrl);
    }
    
    console.log(`Starting stream ${streamId} with FFmpeg:`, args.join(' '));
    
    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.stdout.on('data', (data) => {
      console.log(`[Stream ${streamId}] stdout:`, data.toString());
    });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`[Stream ${streamId}] stderr:`, data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      console.log(`[Stream ${streamId}] FFmpeg exited with code ${code}`);
      activeStreams.delete(streamId);
      
      db.prepare(`
        UPDATE streams 
        SET status = ?, ended_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(code === 0 ? 'completed' : 'failed', streamId);
    });
    
    ffmpeg.on('error', (err) => {
      console.error(`[Stream ${streamId}] FFmpeg error:`, err);
      activeStreams.delete(streamId);
      
      db.prepare(`
        UPDATE streams 
        SET status = 'failed', ended_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(streamId);
    });
    
    activeStreams.set(streamId, ffmpeg);
    
    // Update status to live
    db.prepare(`
      UPDATE streams 
      SET status = 'live', started_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(streamId);
    
    // Update destination statuses
    db.prepare(`
      UPDATE stream_destinations SET status = 'live' WHERE stream_id = ?
    `).run(streamId);
    
    res.json({ success: true, message: 'Stream started' });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST stop stream
router.post('/:id/stop', (req, res) => {
  try {
    const streamId = req.params.id;
    const ffmpeg = activeStreams.get(streamId);
    
    if (!ffmpeg) {
      return res.status(400).json({ error: 'Stream not running' });
    }
    
    ffmpeg.kill('SIGTERM');
    activeStreams.delete(streamId);
    
    db.prepare(`
      UPDATE streams 
      SET status = 'completed', ended_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(streamId);
    
    res.json({ success: true, message: 'Stream stopped' });
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET stream running status
router.get('/:id/status', (req, res) => {
  const isRunning = activeStreams.has(req.params.id);
  res.json({ running: isRunning });
});

// GET all active streams
router.get('/active/list', (req, res) => {
  const active = Array.from(activeStreams.keys());
  res.json({ streams: active });
});

module.exports = router;
