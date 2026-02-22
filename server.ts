import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;
const PORT = 3000;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_HOST ? {
    ca: fs.readFileSync(path.join(process.cwd(), 'certs/server-ca.pem')),
    key: fs.readFileSync(path.join(process.cwd(), 'certs/client-key.pem')),
    cert: fs.readFileSync(path.join(process.cwd(), 'certs/client-cert.pem')),
    rejectUnauthorized: false
  } : false
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Basic WebSocket connection logic
  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // API routes
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'OFFLINE';
    try {
      const client = await pool.connect();
      dbStatus = 'HEALTHY';
      client.release();
    } catch (err) {
      console.error('Database health check failed:', err);
    }

    res.json({ 
      status: dbStatus, 
      service: 'Ouroboros Axiom Engine',
      database: 'Cloud SQL (PostgreSQL)',
      playerCount: wss.clients.size 
    });
  });

  app.get('/api/data', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      console.error('Data fetch failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built static files
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server with WebSocket support running on http://localhost:${PORT}`);
  });
}

startServer();
