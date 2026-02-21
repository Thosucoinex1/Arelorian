
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- AXIOMATIC API ENDPOINTS (Mocking Experimental Backend) ---

  // Health Endpoint - PostgreSQL Duden-Register v2.0
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'HEALTHY',
      service: 'Ouroboros Axiom Engine v2.0',
      database: 'PostgreSQL Duden-Register (Axiomatic Cluster)',
      uptime: process.uptime(),
      axioms: [
        "Logic must persist.",
        "Data is sacred.",
        "Entropy is the enemy.",
        "Connectivity is evolution.",
        "Emergence is the goal."
      ]
    });
  });

  // World Grid Endpoint - 35x35 Grid
  app.get('/api/grid', (req, res) => {
    const grid = [];
    for (let x = -17; x <= 17; x++) {
      for (let z = -17; z <= 17; z++) {
        const isSanctuary = x === 0 && z === 0;
        grid.push({
          x,
          z,
          cell_type: isSanctuary ? 'SANCTUARY' : 'WILDERNESS',
          biome: isSanctuary ? 'CITY' : 'PLAINS',
          stability_index: isSanctuary ? 1.0 : 0.7,
          corruption_level: isSanctuary ? 0.0 : 0.1
        });
      }
    }
    res.json({ grid });
  });

  // Specific Cell Endpoint
  app.get('/api/grid/:x/:z', (req, res) => {
    const { x, z } = req.params;
    const isSanctuary = x === '0' && z === '0';
    res.json({
      x: parseInt(x),
      z: parseInt(z),
      cell_type: isSanctuary ? 'SANCTUARY' : 'WILDERNESS',
      biome: isSanctuary ? 'CITY' : 'PLAINS',
      stability_index: isSanctuary ? 1.0 : 0.7,
      corruption_level: isSanctuary ? 0.0 : 0.1
    });
  });

  // Stabilize Endpoint
  app.post('/api/grid/:x/:z/stabilize', (req, res) => {
    const { x, z } = req.params;
    res.json({
      x: parseInt(x),
      z: parseInt(z),
      stability_index: 0.9,
      corruption_level: 0.05,
      message: "Axiomatic stabilization complete."
    });
  });

  // Notary Registration
  app.post('/api/notaries', (req, res) => {
    const { user_id, email } = req.body;
    res.json({
      user_id,
      email,
      tier: 1,
      tier_name: 'Autosave',
      timestamp: Date.now()
    });
  });

  // Notary Upgrade
  app.post('/api/notaries/:id/upgrade', (req, res) => {
    const { id } = req.params;
    res.json({
      user_id: id,
      new_tier: 2,
      tier_name: 'Duden-Entry',
      timestamp: Date.now()
    });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
