const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

// GET all destinations
router.get('/', (req, res) => {
  try {
    const destinations = db.prepare(`
      SELECT * FROM rtmp_destinations 
      ORDER BY created_at DESC
    `).all();
    
    // Convert is_active from integer to boolean
    const result = destinations.map(d => ({
      ...d,
      is_active: Boolean(d.is_active)
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single destination
router.get('/:id', (req, res) => {
  try {
    const destination = db.prepare('SELECT * FROM rtmp_destinations WHERE id = ?').get(req.params.id);
    
    if (!destination) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    
    res.json({
      ...destination,
      is_active: Boolean(destination.is_active)
    });
  } catch (error) {
    console.error('Error fetching destination:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create destination
router.post('/', (req, res) => {
  try {
    const { name, platform, rtmp_url, stream_key, is_active = true } = req.body;
    
    if (!name || !platform || !rtmp_url || !stream_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO rtmp_destinations (id, name, platform, rtmp_url, stream_key, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, platform, rtmp_url, stream_key, is_active ? 1 : 0);
    
    const destination = db.prepare('SELECT * FROM rtmp_destinations WHERE id = ?').get(id);
    
    res.status(201).json({
      ...destination,
      is_active: Boolean(destination.is_active)
    });
  } catch (error) {
    console.error('Error creating destination:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update destination
router.put('/:id', (req, res) => {
  try {
    const { name, platform, rtmp_url, stream_key, is_active } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (platform !== undefined) { updates.push('platform = ?'); values.push(platform); }
    if (rtmp_url !== undefined) { updates.push('rtmp_url = ?'); values.push(rtmp_url); }
    if (stream_key !== undefined) { updates.push('stream_key = ?'); values.push(stream_key); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    
    const stmt = db.prepare(`
      UPDATE rtmp_destinations 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    
    const destination = db.prepare('SELECT * FROM rtmp_destinations WHERE id = ?').get(req.params.id);
    
    res.json({
      ...destination,
      is_active: Boolean(destination.is_active)
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE destination
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM rtmp_destinations WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting destination:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
