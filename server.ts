import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import helmet from 'helmet';
import cors from 'cors';

import { initPool, initDb, ensureSchema, seedAdminAccount } from './server/db.js';
import { registerRoutes } from './server/routes.js';
import { registerAdminRoutes } from './server/admin-routes.js';
import paypalRouter from './server/paypal.js';
import { startTickEngine } from './server/tick-engine.js';

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

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  initPool();
  await initDb();
  await ensureSchema();
  await seedAdminAccount();

  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://www.paypal.com", "https://*.paypal.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "https://www.paypal.com", "https://*.paypal.com"],
        frameAncestors: ["'self'"],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

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

  registerRoutes(app, wss);
  registerAdminRoutes(app, wss);
  app.use('/api/paypal', paypalRouter);

  startTickEngine();

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const distPath = path.join(__dirname, 'dist');
  const distExists = await import('fs').then(fs => fs.existsSync(distPath));

  if (distExists) {
    console.log('Production mode: serving static files from dist/');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/ws')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  } else {
    console.log('Development mode: using Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ouroboros Axiom Engine running on http://localhost:${PORT}`);
  });
}

startServer();
