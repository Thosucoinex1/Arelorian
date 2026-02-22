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
const dbConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new Pool({
  ...dbConfig,
  ssl: (process.env.DB_HOST || process.env.DATABASE_URL) ? {
    ca: fs.existsSync(path.join(process.cwd(), 'certs/server-ca.pem')) 
      ? fs.readFileSync(path.join(process.cwd(), 'certs/server-ca.pem')) 
      : undefined,
    key: fs.existsSync(path.join(process.cwd(), 'certs/client-key.pem'))
      ? fs.readFileSync(path.join(process.cwd(), 'certs/client-key.pem'))
      : undefined,
    cert: fs.existsSync(path.join(process.cwd(), 'certs/client-cert.pem'))
      ? fs.readFileSync(path.join(process.cwd(), 'certs/client-cert.pem'))
      : undefined,
    rejectUnauthorized: false
  } : false
});

// Initialize Database Tables
async function initDb() {
  if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    console.log('No database configuration found. Persistence disabled.');
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS world_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
}

async function startServer() {
  await initDb();
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Basic WebSocket connection logic
  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (e) {
        console.error('WS Message Parse Error:', e);
      }
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
    let error = null;
    try {
      const client = await pool.connect();
      dbStatus = 'HEALTHY';
      client.release();
    } catch (err: any) {
      console.error('Database health check failed:', err.message);
      error = err.message;
    }

    res.json({ 
      status: dbStatus, 
      error,
      service: 'Ouroboros Axiom Engine',
      database: 'PostgreSQL',
      playerCount: wss.clients.size 
    });
  });

  // Persistence Endpoints
  app.post('/api/sync/agents', async (req, res) => {
    const { agents } = req.body;
    if (!Array.isArray(agents)) return res.status(400).json({ error: 'Invalid agents data' });

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const agent of agents) {
          await client.query(
            'INSERT INTO agents (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
            [agent.id, agent]
          );
        }
        await client.query('COMMIT');
        res.json({ success: true });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Agents sync failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sync/agents', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM agents');
      res.json({ success: true, agents: result.rows.map(r => r.data) });
    } catch (err: any) {
      console.error('Agents fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/data', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      console.error('Data fetch failed:', err.message);
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
