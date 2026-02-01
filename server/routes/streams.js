const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../db/database');
const { getInstance: getStreamManager } = require('../lib/streamManager');

const router = express.Router();

// Get stream manager instance
const getManager = () => getStreamManager(db, {
  uploadDir: process.env.UPLOAD_DIR || './uploads',
});

// GET all streams with related data
router.get('/', (req, res) => {
  try {
    const streams = db.prepare(`
      SELECT s.*, v.title as video_title, v.file_path as video_file_path
      FROM streams s
      LEFT JOIN videos v ON s.video_id = v.id
      ORDER BY s.created_at DESC
    `).all();
    
    const manager = getManager();
    const activeStreams = manager.getActiveStreams();
    const activeIds = new Set(activeStreams.map(s => s.streamId));
    
    // Get destinations for each stream
    const result = streams.map(stream => {
      const destinations = db.prepare(`
        SELECT sd.*, rd.name, rd.platform, rd.rtmp_url, rd.stream_key, rd.is_active
        FROM stream_destinations sd
        JOIN rtmp_destinations rd ON sd.destination_id = rd.id
        WHERE sd.stream_id = ?
      `).all(stream.id);
      
      // Check if stream is actually running
      const isRunning = activeIds.has(stream.id);
      const activeState = activeStreams.find(s => s.streamId === stream.id);
      
      return {
        ...stream,
        loop_video: Boolean(stream.loop_video),
        is_running: isRunning,
        recovery_status: activeState?.status || null,
        retry_count: activeState?.retryCount || 0,
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
    const manager = getManager();
    
    // Stop if running
    try {
      manager.stopStream(req.params.id);
    } catch (e) {
      // Ignore if not running
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

// POST start stream (with auto-recovery)
router.post('/:id/start', async (req, res) => {
  try {
    const manager = getManager();
    const result = await manager.startStream(req.params.id);
    res.json({ success: true, message: 'Stream started', ...result });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST stop stream
router.post('/:id/stop', (req, res) => {
  try {
    const manager = getManager();
    const result = manager.stopStream(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET stream running status
router.get('/:id/status', (req, res) => {
  const manager = getManager();
  const state = manager.getStreamState(req.params.id);
  res.json({ 
    running: !!state,
    status: state?.status || null,
    retryCount: state?.retryCount || 0,
  });
});

// GET all active streams
router.get('/active/list', (req, res) => {
  const manager = getManager();
  res.json({ streams: manager.getActiveStreams() });
});

module.exports = router;
