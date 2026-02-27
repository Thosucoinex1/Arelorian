import type { Express } from 'express';
import type { WebSocketServer } from 'ws';
import { getPool, isDbAvailable, memoryStore, queryDb } from './db.js';
import { withTransaction } from './transaction-wrapper.js';
import { loadOrGenerateChunk, getChunksInRadius, extractResource } from './chunk-engine.js';
import { resolveCombat, getCombatLogs } from './combat-system.js';
import { generateLoot } from './loot-generator.js';
import {
  getAllPrices, getMarketListings, createMarketListing, getEconomicSummary
} from './economic-aggregator.js';
import { getHierarchyEntities, createHierarchyEntity, addMember, validateHierarchy } from './hierarchy-validator.js';
import { getAllTransactions, getTransactionHistory, getBalance, transferEnergy } from './matrix-accounting.js';
import { getTickState, getCurrentTick, isTickRunning } from './tick-engine.js';
import { KAPPA, CHUNK_SIZE, TICK_INTERVAL_MS } from './math-engine.js';
import { hashPassword, verifyPassword } from './admin-security.js';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

function getUserJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('JWT secret not configured');
  }
  return 'USER_' + secret;
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'RATE_LIMIT', message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerRoutes(app: Express, wss: WebSocketServer): void {

  app.get('/api/health', async (_, res) => {
    let dbStatus = isDbAvailable() ? 'CONNECTED' : 'MEMORY_MODE';
    let error = null;

    if (isDbAvailable()) {
      try {
        const pool = getPool();
        const client = await pool!.connect();
        client.release();
      } catch (err: any) {
        dbStatus = 'DEGRADED';
        error = err.message;
      }
    }

    let worldState = {};
    if (isDbAvailable()) {
      const ws = await queryDb('SELECT * FROM world_state ORDER BY id DESC LIMIT 1');
      worldState = ws.rows?.[0] || {};
    }

    res.json({
      status: dbStatus,
      error,
      service: 'Ouroboros Axiom Engine',
      database: isDbAvailable() ? 'PostgreSQL' : 'In-Memory',
      playerCount: wss.clients.size,
      worldState,
      tickEngine: { running: isTickRunning(), currentTick: getCurrentTick() },
      constants: { KAPPA, CHUNK_SIZE, TICK_INTERVAL_MS }
    });
  });

  app.get('/api/agents', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT * FROM agents ORDER BY name');
      res.json({ success: true, agents: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync/agents', async (req, res) => {
    const { agents } = req.body;
    if (!Array.isArray(agents)) return res.status(400).json({ error: 'Invalid agents data' });

    if (!isDbAvailable()) {
      agents.forEach(agent => memoryStore.agents.set(agent.uid || agent.id, agent));
      return res.json({ success: true, mode: 'memory' });
    }

    try {
      await withTransaction(async (client) => {
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
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sync/agents', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, agents: Array.from(memoryStore.agents.values()), mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT * FROM agents ORDER BY name');
      res.json({ success: true, agents: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/chunks', async (req, res) => {
    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const radius = Math.min(parseInt(req.query.radius as string) || 2, 5);
    try {
      const chunks = await getChunksInRadius(x, z, radius);
      res.json({ success: true, chunks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/chunks/:x/:z', async (req, res) => {
    const x = parseInt(req.params.x);
    const z = parseInt(req.params.z);
    try {
      const chunk = await loadOrGenerateChunk(x, z);
      res.json({ success: true, chunk });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/chunks/extract', async (req, res) => {
    const { chunkX, chunkZ, resourceType, amount } = req.body;
    try {
      const result = await extractResource(chunkX, chunkZ, resourceType, amount || 1);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/combat-logs', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    try {
      const logs = await getCombatLogs(limit);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/combat', async (req, res) => {
    const { attackerUid, defenderUid, defenderType } = req.body;
    try {
      const result = await resolveCombat(attackerUid, defenderUid, defenderType || 'AGENT', getCurrentTick());
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/marketplace', async (_, res) => {
    try {
      const listings = await getMarketListings();
      const prices = getAllPrices();
      res.json({ success: true, listings, prices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/marketplace', async (req, res) => {
    const { sellerUid, itemName, resourceType, quantity } = req.body;
    try {
      const listing = await createMarketListing(sellerUid, itemName, resourceType, quantity);
      res.json({ success: true, listing });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/economic-summary', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    try {
      const summaries = await getEconomicSummary(limit);
      res.json({ success: true, summaries });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/hierarchy', async (_, res) => {
    try {
      const entities = await getHierarchyEntities();
      res.json({ success: true, entities });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hierarchy', async (req, res) => {
    const { name, entityType, leaderUid } = req.body;
    try {
      const entity = await createHierarchyEntity(name, entityType, leaderUid);
      res.json({ success: true, entity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hierarchy/:entityId/join', async (req, res) => {
    const { memberUid } = req.body;
    try {
      const success = await addMember(req.params.entityId, memberUid);
      const validation = await validateHierarchy(req.params.entityId);
      res.json({ success, validation });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/matrix/transactions', async (req, res) => {
    const uid = req.query.uid as string;
    const limit = parseInt(req.query.limit as string) || 100;
    try {
      const transactions = uid
        ? await getTransactionHistory(uid, limit)
        : await getAllTransactions(limit);
      res.json({ success: true, transactions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/matrix/balance/:uid', async (req, res) => {
    try {
      const balance = await getBalance(req.params.uid);
      res.json({ success: true, balance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/matrix/transfer', async (req, res) => {
    const { fromUid, toUid, amount } = req.body;
    try {
      const result = await transferEnergy(fromUid, toUid, amount, getCurrentTick());
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/tick-state', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    try {
      const ticks = await getTickState(limit);
      res.json({
        success: true,
        currentTick: getCurrentTick(),
        running: isTickRunning(),
        interval: TICK_INTERVAL_MS,
        ticks
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/chronicles', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, chronicles: [], mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT * FROM chronicles ORDER BY created_at DESC');
      res.json({ success: true, chronicles: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/duden', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, entries: [], mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT * FROM duden_register ORDER BY created_at DESC LIMIT 100');
      res.json({ success: true, entries: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/world-state', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, state: { stability_index: 1.0, active_players: 0 }, mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT * FROM world_state ORDER BY id DESC LIMIT 1');
      res.json({ success: true, state: result.rows[0] || { stability_index: 1.0, active_players: 0 } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/data', async (_, res) => {
    if (!isDbAvailable()) {
      return res.json({ success: true, data: [{ current_time: new Date() }], mode: 'memory' });
    }
    try {
      const result = await queryDb('SELECT NOW() as current_time');
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/loot/generate', async (req, res) => {
    const level = parseInt(req.query.level as string) || 1;
    const count = Math.min(parseInt(req.query.count as string) || 1, 10);
    const seed = parseInt(req.query.seed as string) || Date.now();
    const loot = generateLoot(level, seed, count);
    res.json({ success: true, loot });
  });

  app.get('/api/axiom-compliance', async (_, res) => {
    const subsystems = [
      'MathEngine', 'ChunkEngine', 'TickEngine', 'CombatSystem',
      'LootGenerator', 'EconomicAggregator', 'HierarchyValidator',
      'MatrixAccounting', 'TransactionWrapper', 'Routes', 'Database'
    ];

    const matrix: any[] = [];

    for (const sub of subsystems) {
      const entry: any = {
        subsystem: sub,
        energy: 'PASS',
        erosion: 'PASS',
        punctuation: 'PASS',
        recursion: sub === 'MathEngine' || sub === 'ChunkEngine' || sub === 'EconomicAggregator' || sub === 'TickEngine' ? 'PASS' : 'N/A',
        duality: 'PASS',
        status: 'COMPLIANT'
      };

      if (sub === 'Database') {
        entry.energy = isDbAvailable() ? 'PASS' : 'WARN';
        entry.status = isDbAvailable() ? 'COMPLIANT' : 'DEGRADED';
      }

      if (sub === 'TickEngine') {
        entry.punctuation = isTickRunning() ? 'PASS' : 'WARN';
        entry.status = isTickRunning() ? 'COMPLIANT' : 'IDLE';
      }

      matrix.push(entry);
    }

    const allCompliant = matrix.every(m => m.status === 'COMPLIANT' || m.status === 'IDLE');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      kappa: KAPPA,
      overallStatus: allCompliant ? 'COMPLIANT' : 'PARTIAL',
      matrix
    });
  });


  app.use('/api/auth', authRateLimit);

  app.post('/api/auth/register', async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email, username, and password are required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' });
      return;
    }

    if (username.length < 2 || username.length > 30) {
      res.status(400).json({ error: 'INVALID_USERNAME', message: 'Username must be 2-30 characters.' });
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_\- ]+$/;
    if (!usernameRegex.test(username)) {
      res.status(400).json({ error: 'INVALID_USERNAME', message: 'Username can only contain letters, numbers, spaces, hyphens and underscores.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!isDbAvailable()) {
      res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not available.' });
      return;
    }

    try {
      const existingEmail = await queryDb('SELECT uid FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingEmail.rows && existingEmail.rows.length > 0) {
        res.status(409).json({ error: 'EMAIL_EXISTS', message: 'An account with this email already exists.' });
        return;
      }

      const existingUsername = await queryDb('SELECT uid FROM users WHERE LOWER(username) = $1', [cleanUsername.toLowerCase()]);
      if (existingUsername.rows && existingUsername.rows.length > 0) {
        res.status(409).json({ error: 'USERNAME_EXISTS', message: 'This username is already taken.' });
        return;
      }

      const hashedPw = await hashPassword(password);
      const result = await queryDb(
        `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING uid, username, email, matrix_energy, subscription_tier, created_at`,
        [cleanUsername, cleanEmail, hashedPw]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { userId: user.uid, email: user.email, username: user.username, type: 'user' },
        getUserJwtSecret(),
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          matrixEnergy: user.matrix_energy,
          tier: user.subscription_tier,
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err.message);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Registration failed.' });
    }
  });


  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isDbAvailable()) {
      res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not available.' });
      return;
    }

    try {
      const result = await queryDb(
        'SELECT uid, username, email, password_hash, matrix_energy, subscription_tier FROM users WHERE LOWER(email) = $1',
        [cleanEmail]
      );

      if (!result.rows || result.rows.length === 0) {
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
        return;
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        res.status(401).json({ error: 'NO_PASSWORD', message: 'This account has no password set. Please register again.' });
        return;
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
        return;
      }

      await queryDb('UPDATE users SET last_login = NOW() WHERE uid = $1', [user.uid]);

      const token = jwt.sign(
        { userId: user.uid, email: user.email, username: user.username, type: 'user' },
        getUserJwtSecret(),
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          matrixEnergy: user.matrix_energy,
          tier: user.subscription_tier,
        }
      });
    } catch (err: any) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Login failed.' });
    }
  });


  app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'NO_TOKEN', message: 'Not authenticated.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, getUserJwtSecret()) as any;

      if (decoded.type !== 'user') {
        res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid token type.' });
        return;
      }

      const result = await queryDb(
        'SELECT uid, username, email, matrix_energy, subscription_tier FROM users WHERE uid = $1',
        [decoded.userId]
      );

      if (!result.rows || result.rows.length === 0) {
        res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
        return;
      }

      const user = result.rows[0];
      res.json({
        success: true,
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          matrixEnergy: user.matrix_energy,
          tier: user.subscription_tier,
        }
      });
    } catch {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token expired or invalid.' });
    }
  });
}
