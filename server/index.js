require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const videosRouter = require('./routes/videos');
const destinationsRouter = require('./routes/destinations');
const streamsRouter = require('./routes/streams');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StreamFlow Backend running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
