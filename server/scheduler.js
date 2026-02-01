require('dotenv').config();

const db = require('./db/database');

const BACKEND_URL = `http://localhost:${process.env.PORT || 3001}`;

async function checkScheduledStreams() {
  try {
    const now = new Date().toISOString();
    
    // Find streams that are scheduled and due to start
    const streams = db.prepare(`
      SELECT id, title, scheduled_at 
      FROM streams 
      WHERE status = 'scheduled' AND scheduled_at <= ?
    `).all(now);
    
    for (const stream of streams) {
      console.log(`Starting scheduled stream: ${stream.title}`);
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/streams/${stream.id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          console.log(`Successfully started stream: ${stream.title}`);
        } else {
          const data = await response.json();
          console.error(`Failed to start stream ${stream.title}:`, data.error);
        }
      } catch (err) {
        console.error(`Error starting stream ${stream.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}

// Check every minute
console.log('StreamFlow Scheduler started - checking every minute');
setInterval(checkScheduledStreams, 60000);
checkScheduledStreams(); // Run immediately on start
