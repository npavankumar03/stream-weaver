const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

// Configure multer for video uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB max
  },
});

// GET all videos
router.get('/', (req, res) => {
  try {
    const videos = db.prepare(`
      SELECT * FROM videos 
      ORDER BY created_at DESC
    `).all();
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single video
router.get('/:id', (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload video
router.post('/', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const id = uuidv4();
    const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');
    const description = req.body.description || null;
    
    const stmt = db.prepare(`
      INSERT INTO videos (id, title, description, file_path, file_size, status)
      VALUES (?, ?, ?, ?, ?, 'ready')
    `);
    
    stmt.run(id, title, description, req.file.filename, req.file.size);
    
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    
    res.status(201).json(video);
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update video
router.put('/:id', (req, res) => {
  try {
    const { title, description } = req.body;
    
    const stmt = db.prepare(`
      UPDATE videos 
      SET title = COALESCE(?, title), 
          description = COALESCE(?, description),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(title, description, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    res.json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE video
router.delete('/:id', (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Delete file from disk
    const filePath = path.join(uploadDir, video.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve video files
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(path.resolve(filePath));
});

module.exports = router;
