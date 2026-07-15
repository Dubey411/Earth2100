import express from 'express';
import cors from 'cors';

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Root API status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to the Earth 2100 - Climate Lens API',
    timestamp: new Date().toISOString()
  });
});

// Placeholder for routes (User to implement)
// app.use('/api/hotspots', hotspotRoutes);
// app.use('/api/live', liveDataRoutes);
// app.use('/api/news', newsRoutes);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error('[server error]:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
