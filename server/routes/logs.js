const express = require('express');
const router = express.Router();

// Reference to stream manager - will be set by index.js
let streamManager = null;

function setStreamManager(sm) {
  streamManager = sm;
}

// GET all logs
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const streamId = req.query.streamId || null;
    const level = req.query.level || null;
    
    if (!streamManager) {
      return res.json([]);
    }
    
    let logs = streamManager.getLogs(streamId, limit);
    
    if (level) {
      logs = logs.filter(l => l.level === level);
    }
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE clear logs
router.delete('/', (req, res) => {
  try {
    const streamId = req.query.streamId || null;
    
    if (streamManager) {
      streamManager.clearLogs(streamId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET stream manager stats
router.get('/stats', (req, res) => {
  try {
    if (!streamManager) {
      return res.json({
        activeCount: 0,
        streams: [],
        totalLogs: 0,
      });
    }
    
    res.json(streamManager.getStats());
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.setStreamManager = setStreamManager;
