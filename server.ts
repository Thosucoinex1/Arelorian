import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import admin from 'firebase-admin';

const { Pool } = pg;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized.');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
  }
}

const PORT = 5000;

let pool: any;
let dbAvailable = false;

const memoryStore = {
  agents: new Map<string, any>(),
  worldState: new Map<string, any>()
};

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: false
  });
  console.log('PostgreSQL Pool initialized (Replit DB).');
} else if (process.env.DB_HOST) {
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 5000,
    ssl: {
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
    }
  });
  console.log('PostgreSQL Pool initialized (external DB).');
}

async function initDb(retries = 3, delay = 2000) {
  if (!pool) {
    console.log('No database configuration found. Persistence disabled (Memory Mode).');
    return;
  }
  
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbAvailable = true;
    console.log('Database connected successfully. Persistence: ACTIVE');
  } catch (err: any) {
    if (retries > 0 && (err.code === 'ETIMEDOUT' || err.message?.includes('timeout'))) {
      console.warn(`Database connection timed out. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return initDb(retries - 1, delay * 1.5);
    }
    console.error('Database initialization failed. Switching to Memory Mode:', err);
    dbAvailable = false;
  }
}

async function startServer() {
  await initDb();
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
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

  app.get('/api/health', async (_, res) => {
    let dbStatus = dbAvailable ? 'CONNECTED' : 'MEMORY_MODE';
    let error = null;
    
    if (dbAvailable) {
      try {
        const client = await pool.connect();
        client.release();
      } catch (err: any) {
        dbStatus = 'DEGRADED';
        error = err.message;
      }
    }

    const worldState = dbAvailable
      ? (await pool.query('SELECT * FROM world_state ORDER BY id DESC LIMIT 1')).rows[0] || {}
      : {};

    res.json({ 
      status: dbStatus, 
      error,
      service: 'Ouroboros Axiom Engine',
      database: dbAvailable ? 'PostgreSQL' : 'In-Memory',
      playerCount: wss.clients.size,
      worldState
    });
  });

  app.get('/api/agents', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT * FROM agents ORDER BY name');
      res.json({ success: true, agents: result.rows });
    } catch (err: any) {
      console.error('Agents fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync/agents', async (req, res) => {
    const { agents } = req.body;
    if (!Array.isArray(agents)) return res.status(400).json({ error: 'Invalid agents data' });

    if (!dbAvailable) {
      agents.forEach(agent => memoryStore.agents.set(agent.uid || agent.id, agent));
      return res.json({ success: true, mode: 'memory' });
    }

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const agent of agents) {
          await client.query(
            `INSERT INTO agents (uid, name, npc_class, level, hp, max_hp, exp, pos_x, pos_y, pos_z, inventory, dna_history, memory_cache, awakened, last_update)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
             ON CONFLICT (uid) DO UPDATE SET
               name = EXCLUDED.name, npc_class = EXCLUDED.npc_class, level = EXCLUDED.level,
               hp = EXCLUDED.hp, max_hp = EXCLUDED.max_hp, exp = EXCLUDED.exp,
               pos_x = EXCLUDED.pos_x, pos_y = EXCLUDED.pos_y, pos_z = EXCLUDED.pos_z,
               inventory = EXCLUDED.inventory, dna_history = EXCLUDED.dna_history,
               memory_cache = EXCLUDED.memory_cache, awakened = EXCLUDED.awakened, last_update = NOW()`,
            [
              agent.uid, agent.name, agent.npc_class || 'NEURAL_EMERGENT',
              agent.level || 1, agent.hp || 100, agent.max_hp || 100, agent.exp || 0,
              agent.pos_x || 0, agent.pos_y || 0.5, agent.pos_z || 0,
              JSON.stringify(agent.inventory || []), JSON.stringify(agent.dna_history || []),
              JSON.stringify(agent.memory_cache || []), agent.awakened || false
            ]
          );
        }
        await client.query('COMMIT');
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Agents sync failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sync/agents', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT * FROM agents ORDER BY name');
      res.json({ success: true, agents: result.rows });
    } catch (err: any) {
      console.error('Agents fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/chronicles', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, chronicles: [], mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT * FROM chronicles ORDER BY created_at DESC');
      res.json({ success: true, chronicles: result.rows });
    } catch (err: any) {
      console.error('Chronicles fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/duden', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, entries: [], mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT * FROM duden_register ORDER BY created_at DESC LIMIT 100');
      res.json({ success: true, entries: result.rows });
    } catch (err: any) {
      console.error('Duden register fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/world-state', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, state: { stability_index: 1.0, active_players: 0 }, mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT * FROM world_state ORDER BY id DESC LIMIT 1');
      res.json({ success: true, state: result.rows[0] || { stability_index: 1.0, active_players: 0 } });
    } catch (err: any) {
      console.error('World state fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/data', async (_, res) => {
    if (!dbAvailable) {
      return res.json({ success: true, data: [{ current_time: new Date() }], mode: 'memory' });
    }
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      console.error('Data fetch failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server with WebSocket support running on http://localhost:${PORT}`);
  });
}

startServer();
