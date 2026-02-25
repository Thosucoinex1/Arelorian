import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
// import pg from 'pg';
// import mysql from 'mysql2/promise';
import admin from 'firebase-admin';

// Initialize Firebase Admin
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

// const { Pool } = pg;
const PORT = 3000;

// Database configuration
// const isMysql = process.env.DATABASE_URL?.startsWith('mysql://') || process.env.DB_PORT === '3306';

let pool: any;
let mysqlPool: any;
let dbAvailable = false;

// In-memory fallback storage
const memoryStore = {
  agents: new Map<string, any>(),
  worldState: new Map<string, any>()
};

// if (isMysql) {
//   const mysqlConfig = process.env.DATABASE_URL 
//     ? { uri: process.env.DATABASE_URL }
//     : {
//         host: process.env.DB_HOST,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//         database: process.env.DB_NAME,
//         port: parseInt(process.env.DB_PORT || '3306'),
//         connectTimeout: 5000, // 5 second timeout
//       };
//   mysqlPool = mysql.createPool(mysqlConfig as any);
//   console.log('MySQL Pool initialized.');
// } else {
//   const dbConfig = process.env.DATABASE_URL 
//     ? { connectionString: process.env.DATABASE_URL }
//     : {
//         host: process.env.DB_HOST,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//         database: process.env.DB_NAME,
//         port: parseInt(process.env.DB_PORT || '5432'),
//       };

//   pool = new Pool({
//     ...dbConfig,
//     connectionTimeoutMillis: 5000, // 5 second timeout
//     ssl: (process.env.DB_HOST || process.env.DATABASE_URL) ? {
//       ca: fs.existsSync(path.join(process.cwd(), 'certs/server-ca.pem')) 
//         ? fs.readFileSync(path.join(process.cwd(), 'certs/server-ca.pem')) 
//         : undefined,
//       key: fs.existsSync(path.join(process.cwd(), 'certs/client-key.pem'))
//         ? fs.readFileSync(path.join(process.cwd(), 'certs/client-key.pem'))
//         : undefined,
//       cert: fs.existsSync(path.join(process.cwd(), 'certs/client-cert.pem'))
//         ? fs.readFileSync(path.join(process.cwd(), 'certs/client-cert.pem'))
//         : undefined,
//       rejectUnauthorized: false
//     } : false
//   });
//   console.log('PostgreSQL Pool initialized.');
// }

// // Log connection attempt (masking sensitive info)
// const currentDbConfig = isMysql ? {
//   host: process.env.DB_HOST || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'unknown'),
//   port: process.env.DB_PORT || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : '3306'),
//   type: 'MySQL'
// } : {
//   host: process.env.DB_HOST || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'unknown'),
//   port: process.env.DB_PORT || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : '5432'),
//   type: 'PostgreSQL'
// };

// console.log('Database Connection Attempt:', currentDbConfig);

// Initialize Database Tables
async function initDb(retries = 3, delay = 2000) {
  if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    console.log('No database configuration found. Persistence disabled (Memory Mode).');
    return;
  }
  
  try {
    if (isMysql) {
      const connection = await mysqlPool.getConnection();
      await connection.query(`
        CREATE TABLE IF NOT EXISTS agents (
          id VARCHAR(255) PRIMARY KEY,
          data JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS world_state (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
      connection.release();
    } else {
      const client = await pool.connect();
      await client.query(`
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
      client.release();
    }
    dbAvailable = true;
    console.log('Database tables initialized successfully. Persistence: ACTIVE');
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
  // await initDb();
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
  app.get('/api/health', async (_, res) => {
    let dbStatus = 'MEMORY_MODE';
    let error = null;
    
    // if (dbAvailable) {
    //   try {
    //     if (isMysql) {
    //       await mysqlPool.query('SELECT 1');
    //     } else {
    //       const client = await pool.connect();
    //       client.release();
    //     }
    //   } catch (err: any) {
    //     dbStatus = 'DEGRADED';
    //     error = err.message;
    //   }
    // }

    res.json({ 
      status: dbStatus, 
      error,
      service: 'Ouroboros Axiom Engine',
      database: 'In-Memory',
      playerCount: wss.clients.size 
    });
  });

  // Persistence Endpoints
  app.post('/api/sync/agents', async (req, res) => {
    const { agents } = req.body;
    if (!Array.isArray(agents)) return res.status(400).json({ error: 'Invalid agents data' });

      agents.forEach(agent => memoryStore.agents.set(agent.id, agent));
      return res.json({ success: true, mode: 'memory' });

    // if (!dbAvailable) {
    //   agents.forEach(agent => memoryStore.agents.set(agent.id, agent));
    //   return res.json({ success: true, mode: 'memory' });
    // }

    // try {
    //   if (isMysql) {
    //     for (const agent of agents) {
    //       await mysqlPool.query(
    //         'INSERT INTO agents (id, data, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE data = ?, updated_at = NOW()',
    //         [agent.id, JSON.stringify(agent), JSON.stringify(agent)]
    //       );
    //     }
    //   } else {
    //     const client = await pool.connect();
    //     try {
    //       await client.query('BEGIN');
    //       for (const agent of agents) {
    //         await client.query(
    //           'INSERT INTO agents (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
    //           [agent.id, agent]
    //         );
    //       }
    //       await client.query('COMMIT');
    //     } catch (e: any) {
    //       await client.query('ROLLBACK');
    //       throw e;
    //     } finally {
    //       client.release();
    //     }
    //   }
    //   res.json({ success: true });
    // } catch (err: any) {
    //   console.error('Agents sync failed:', err.message);
    //   res.status(500).json({ success: false, error: err.message });
    // }
  });

  app.get('/api/sync/agents', async (_, res) => {
    return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });

    // if (!dbAvailable) {
    //   return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });
    // }

    // try {
    //   if (isMysql) {
    //     const [rows]: any = await mysqlPool.query('SELECT data FROM agents');
    //     res.json({ success: true, agents: rows.map((r: any) => typeof r.data === 'string' ? JSON.parse(r.data) : r.data) });
    //   } else {
    //     const result = await pool.query('SELECT data FROM agents');
    //     res.json({ success: true, agents: result.rows.map((r: { data: any }) => r.data) });
    //   }
    // } catch (err: any) {
    //   console.error('Agents fetch failed:', err.message);
    //   res.status(500).json({ success: false, error: err.message });
    // }
  });

  app.get('/api/data', async (_, res) => {
    return res.json({ success: true, data: [{ current_time: new Date() }], mode: 'memory' });

    // if (!dbAvailable) {
    //   return res.json({ success: true, data: [{ current_time: new Date() }], mode: 'memory' });
    // }
    // try {
    //   if (isMysql) {
    //     const [rows] = await mysqlPool.query('SELECT NOW() as current_time');
    //     res.json({ success: true, data: rows });
    //   } else {
    //     const result = await pool.query('SELECT NOW() as current_time');
    //     res.json({ success: true, data: result.rows });
    //   }
    // } catch (err: any) {
    //   console.error('Data fetch failed:', err.message);
    //   res.status(500).json({ success: false, error: err.message });
    // }
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
    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server with WebSocket support running on http://localhost:${PORT}`);
  });

  // Genkit initialization (if needed for server-side flows)
  // This is a placeholder; Genkit typically runs as a separate deployment.
  // You would define Genkit flows in genkitService.ts and deploy them.
  // For local development, you might run `genkit start` in a separate terminal.
  // If you intend to run Genkit flows directly from this Express server,
  // additional integration would be required here.
}

startServer();
