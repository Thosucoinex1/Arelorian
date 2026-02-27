import type { Express } from 'express';
import type { WebSocketServer } from 'ws';
import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';
import {
  hashPassword, verifyPassword, generateAccessToken, generateRefreshToken,
  verifyToken, requireAdmin, adminRateLimit, checkBruteForce, recordLoginAttempt,
  logAuditAction, logAnomaly, createSession, revokeAllSessions, getClientIp,
  type AdminRequest
} from './admin-security.js';
import { getCurrentTick, isTickRunning, getTickState, pauseTickEngine, resumeTickEngine } from './tick-engine.js';
import { KAPPA, getEffectiveKappa, setTemporaryKappa, getKappaStatus } from './math-engine.js';

export function registerAdminRoutes(app: Express, wss: WebSocketServer): void {

  app.use('/api/admin', adminRateLimit);

  app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    if (!email || !password) {
      res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password required.' });
      return;
    }

    try {
      const bruteCheck = await checkBruteForce(email);
      if (bruteCheck.locked) {
        await logAnomaly(ip, 'BRUTE_FORCE_LOCKED', 'CRITICAL', { email });
        res.status(423).json({ error: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to failed login attempts.' });
        return;
      }

      const result = await queryDb('SELECT id, email, password_hash, role, force_password_change FROM admins WHERE email = $1', [email]);
      if (!result.rows || result.rows.length === 0) {
        await recordLoginAttempt(email, false);
        await logAnomaly(ip, 'INVALID_LOGIN_EMAIL', 'MEDIUM', { email });
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
        return;
      }

      const admin = result.rows[0];
      const valid = await verifyPassword(password, admin.password_hash);
      if (!valid) {
        await recordLoginAttempt(email, false);
        await logAnomaly(ip, 'INVALID_LOGIN_PASSWORD', 'MEDIUM', { email });
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
        return;
      }

      await recordLoginAttempt(email, true);

      const accessToken = generateAccessToken(admin.id, admin.email, admin.role);
      const refreshToken = generateRefreshToken(admin.id);
      await createSession(admin.id, accessToken, refreshToken, ip, req.headers['user-agent'] || 'unknown');

      await queryDb('UPDATE admins SET last_login = NOW(), failed_attempts = 0 WHERE id = $1', [admin.id]);

      await logAuditAction(admin.id, 'LOGIN', 'SESSION', admin.id.toString(), { ip }, ip);

      res.json({
        accessToken,
        refreshToken,
        admin: { id: admin.id, email: admin.email, role: admin.role },
        forcePasswordChange: admin.force_password_change
      });
    } catch (err: any) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Internal server error.' });
    }
  });

  app.post('/api/admin/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'MISSING_TOKEN' });
      return;
    }

    try {
      const decoded = verifyToken(refreshToken);
      if (decoded.type !== 'refresh') {
        res.status(401).json({ error: 'INVALID_TOKEN' });
        return;
      }

      const { createHash } = await import('crypto');
      const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
      const session = await queryDb(
        'SELECT * FROM admin_sessions WHERE admin_id = $1 AND refresh_token_hash = $2 AND revoked = FALSE AND expires_at > NOW() LIMIT 1',
        [decoded.adminId, refreshHash]
      );
      if (!session.rows || session.rows.length === 0) {
        res.status(401).json({ error: 'SESSION_REVOKED', message: 'Session has been revoked or expired.' });
        return;
      }

      const admin = await queryDb('SELECT id, email, role FROM admins WHERE id = $1', [decoded.adminId]);
      if (!admin.rows || admin.rows.length === 0) {
        res.status(401).json({ error: 'ADMIN_NOT_FOUND' });
        return;
      }

      const a = admin.rows[0];
      const newAccessToken = generateAccessToken(a.id, a.email, a.role);

      const newTokenHash = createHash('sha256').update(newAccessToken).digest('hex');
      await queryDb(
        'UPDATE admin_sessions SET token_hash = $1 WHERE id = $2',
        [newTokenHash, session.rows[0].id]
      );

      res.json({ accessToken: newAccessToken });
    } catch (err: any) {
      res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Refresh token expired.' });
    }
  });

  app.post('/api/admin/logout', requireAdmin, async (req: AdminRequest, res) => {
    const ip = getClientIp(req);
    await revokeAllSessions(req.admin!.adminId);
    await logAuditAction(req.admin!.adminId, 'LOGOUT', 'SESSION', req.admin!.adminId.toString(), {}, ip);
    res.json({ success: true, message: 'All sessions revoked.' });
  });

  app.get('/api/admin/session', requireAdmin, async (req: AdminRequest, res) => {
    res.json({ admin: req.admin, authenticated: true });
  });

  app.post('/api/admin/change-password', requireAdmin, async (req: AdminRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const ip = getClientIp(req);

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'New password must be at least 8 characters.' });
      return;
    }

    const admin = await queryDb('SELECT password_hash FROM admins WHERE id = $1', [req.admin!.adminId]);
    const valid = await verifyPassword(currentPassword, admin.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'WRONG_PASSWORD' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await queryDb('UPDATE admins SET password_hash = $1, force_password_change = FALSE WHERE id = $2', [newHash, req.admin!.adminId]);
    await revokeAllSessions(req.admin!.adminId);
    await logAuditAction(req.admin!.adminId, 'PASSWORD_CHANGE', 'ADMIN', req.admin!.adminId.toString(), {}, ip);

    const accessToken = generateAccessToken(req.admin!.adminId, req.admin!.email, req.admin!.role);
    const refreshToken = generateRefreshToken(req.admin!.adminId);
    await createSession(req.admin!.adminId, accessToken, refreshToken, ip, req.headers['user-agent'] || 'unknown');

    res.json({ success: true, accessToken, refreshToken });
  });

  app.post('/api/admin/events/create', requireAdmin, async (req: AdminRequest, res) => {
    const { eventType, name, severity, parameters } = req.body;
    const ip = getClientIp(req);

    if (!eventType || !name) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'eventType and name are required.' });
      return;
    }

    try {
      const kappa = getEffectiveKappa();
      const eventSeverity = Math.max(0.1, Math.min(10, severity || 1.0));
      const eventImpact = eventSeverity * Math.log(kappa) * eventSeverity;

      const result = await queryDb(
        `INSERT INTO live_events (admin_id, event_type, name, severity, parameters, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW()) RETURNING id`,
        [req.admin!.adminId, eventType, name, eventSeverity, JSON.stringify(parameters || {})]
      );

      const eventId = result.rows[0].id;

      if (eventType === 'INVASION') {
        await applyInvasionEvent(eventId, eventSeverity, parameters || {}, kappa);
      } else if (eventType === 'ECONOMIC_SHOCK') {
        await applyEconomicShock(eventId, eventSeverity, parameters || {}, kappa);
      } else if (eventType === 'BIOME_SHIFT') {
        await applyBiomeShift(eventId, eventSeverity, parameters || {}, kappa);
      } else if (eventType === 'LORE_INJECTION') {
        await applyLoreInjection(eventId, name, parameters || {});
      }

      broadcastAdminEvent(wss, {
        type: 'ADMIN_EVENT',
        eventType,
        name,
        severity: eventSeverity,
        impact: eventImpact,
        eventId
      });

      await logAuditAction(req.admin!.adminId, 'CREATE_EVENT', 'LIVE_EVENT', eventId.toString(),
        { eventType, name, severity: eventSeverity, impact: eventImpact }, ip);

      await queryDb(
        `INSERT INTO admin_event_logs (admin_id, event_type, payload, result, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.admin!.adminId, eventType, JSON.stringify({ name, severity: eventSeverity, parameters }), JSON.stringify({ eventId, impact: eventImpact })]
      );

      res.json({ success: true, eventId, impact: eventImpact, severity: eventSeverity });
    } catch (err: any) {
      console.error('Event creation error:', err.message);
      res.status(500).json({ error: 'EVENT_FAILED', message: err.message });
    }
  });

  app.get('/api/admin/events', requireAdmin, async (req: AdminRequest, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string || null;

    let query = 'SELECT * FROM live_events';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await queryDb(query, params);
    res.json({ events: result.rows || [] });
  });

  app.post('/api/admin/events/:id/resolve', requireAdmin, async (req: AdminRequest, res) => {
    const eventId = parseInt(req.params.id);
    const ip = getClientIp(req);

    await queryDb('UPDATE live_events SET status = $1, resolved_at = NOW() WHERE id = $2', ['RESOLVED', eventId]);
    await logAuditAction(req.admin!.adminId, 'RESOLVE_EVENT', 'LIVE_EVENT', eventId.toString(), {}, ip);

    broadcastAdminEvent(wss, { type: 'EVENT_RESOLVED', eventId });

    res.json({ success: true, eventId });
  });

  app.get('/api/admin/tick/status', requireAdmin, async (_req: AdminRequest, res) => {
    const kappaStatus = getKappaStatus();
    const tickState = await getTickState(5);
    res.json({
      currentTick: getCurrentTick(),
      isRunning: isTickRunning(),
      kappa: kappaStatus,
      recentTicks: tickState
    });
  });

  app.post('/api/admin/tick/pause', requireAdmin, async (req: AdminRequest, res) => {
    const ip = getClientIp(req);
    const result = pauseTickEngine();
    await logAuditAction(req.admin!.adminId, 'TICK_PAUSE', 'ENGINE', 'tick', { result }, ip);
    broadcastAdminEvent(wss, { type: 'TICK_PAUSED', tick: getCurrentTick() });
    res.json(result);
  });

  app.post('/api/admin/tick/resume', requireAdmin, async (req: AdminRequest, res) => {
    const ip = getClientIp(req);
    const result = resumeTickEngine();
    await logAuditAction(req.admin!.adminId, 'TICK_RESUME', 'ENGINE', 'tick', { result }, ip);
    broadcastAdminEvent(wss, { type: 'TICK_RESUMED', tick: getCurrentTick() });
    res.json(result);
  });

  app.post('/api/admin/tick/modify-kappa', requireAdmin, async (req: AdminRequest, res) => {
    const { kappa, durationTicks } = req.body;
    const ip = getClientIp(req);

    if (!kappa || !durationTicks) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'kappa and durationTicks required.' });
      return;
    }

    const result = setTemporaryKappa(kappa, durationTicks);
    await logAuditAction(req.admin!.adminId, 'MODIFY_KAPPA', 'ENGINE', 'kappa',
      { newKappa: kappa, durationTicks }, ip);
    broadcastAdminEvent(wss, { type: 'KAPPA_MODIFIED', kappa, durationTicks });
    res.json(result);
  });

  app.post('/api/admin/world/economic-shock', requireAdmin, async (req: AdminRequest, res) => {
    const { magnitude, resourceType } = req.body;
    const ip = getClientIp(req);
    const kappa = getEffectiveKappa();
    const shockMagnitude = Math.max(-0.9, Math.min(10, magnitude || 0.5));

    try {
      const listings = await queryDb(
        'SELECT listing_id, price_per_unit, base_price, item_type FROM marketplace WHERE status = $1' +
        (resourceType ? ' AND resource_type = $2' : ''),
        resourceType ? ['ACTIVE', resourceType] : ['ACTIVE']
      );

      let affected = 0;
      for (const listing of (listings.rows || [])) {
        const newPrice = listing.price_per_unit * (1 + shockMagnitude / kappa);
        await queryDb('UPDATE marketplace SET price_per_unit = $1 WHERE listing_id = $2', [newPrice, listing.listing_id]);

        await queryDb(
          `INSERT INTO event_effects (event_id, effect_type, target, before_state, after_state, timestamp)
           VALUES (0, 'ECONOMIC_SHOCK', $1, $2, $3, NOW())`,
          [listing.listing_id, JSON.stringify({ price: listing.price_per_unit }), JSON.stringify({ price: newPrice })]
        );
        affected++;
      }

      await logAuditAction(req.admin!.adminId, 'ECONOMIC_SHOCK', 'MARKETPLACE', 'global',
        { magnitude: shockMagnitude, resourceType, affected, formula: `Price * (1 + ${shockMagnitude}/${kappa})` }, ip);

      broadcastAdminEvent(wss, { type: 'ECONOMIC_SHOCK', magnitude: shockMagnitude, affected });

      res.json({ success: true, affected, magnitude: shockMagnitude, formula: `Price * (1 + ${shockMagnitude}/${kappa})` });
    } catch (err: any) {
      res.status(500).json({ error: 'SHOCK_FAILED', message: err.message });
    }
  });

  app.post('/api/admin/world/biome-shift', requireAdmin, async (req: AdminRequest, res) => {
    const { targetBiome, eventWeight, regionX, regionZ, radius } = req.body;
    const ip = getClientIp(req);
    const kappa = getEffectiveKappa();

    try {
      let query = 'SELECT chunk_id, x, z, biome, stability_index FROM chunks';
      const params: any[] = [];

      if (regionX !== undefined && regionZ !== undefined && radius) {
        query += ' WHERE x BETWEEN $1 AND $2 AND z BETWEEN $3 AND $4';
        params.push(regionX - radius, regionX + radius, regionZ - radius, regionZ + radius);
      }

      const chunks = await queryDb(query, params);
      let affected = 0;

      for (const chunk of (chunks.rows || [])) {
        const weight = eventWeight || 1.0;
        const newStability = chunk.stability_index * Math.exp(weight / kappa);

        await queryDb(
          'UPDATE chunks SET biome = $1, stability_index = $2, last_update = NOW() WHERE chunk_id = $3',
          [targetBiome || chunk.biome, Math.min(2.0, newStability), chunk.chunk_id]
        );
        affected++;
      }

      await logAuditAction(req.admin!.adminId, 'BIOME_SHIFT', 'CHUNKS', 'global',
        { targetBiome, eventWeight, affected, formula: `P_new = P_old * e^(${eventWeight}/${kappa})` }, ip);

      broadcastAdminEvent(wss, { type: 'BIOME_SHIFT', targetBiome, affected });

      res.json({ success: true, affected, formula: `P_new = P_old * e^(${eventWeight}/${kappa})` });
    } catch (err: any) {
      res.status(500).json({ error: 'BIOME_SHIFT_FAILED', message: err.message });
    }
  });

  app.post('/api/admin/world/spawn-invasion', requireAdmin, async (req: AdminRequest, res) => {
    const { name, severity, targetX, targetZ, monsterCount } = req.body;
    const ip = getClientIp(req);

    try {
      const eventResult = await queryDb(
        `INSERT INTO live_events (admin_id, event_type, name, severity, parameters, status, created_at)
         VALUES ($1, 'INVASION', $2, $3, $4, 'ACTIVE', NOW()) RETURNING id`,
        [req.admin!.adminId, name || 'Dark Invasion', severity || 5, JSON.stringify({ targetX, targetZ, monsterCount: monsterCount || 10 })]
      );

      await logAuditAction(req.admin!.adminId, 'SPAWN_INVASION', 'WORLD', 'invasion',
        { name, severity, targetX, targetZ, monsterCount }, ip);

      broadcastAdminEvent(wss, {
        type: 'INVASION_SPAWNED',
        eventId: eventResult.rows[0].id,
        name,
        severity,
        location: { x: targetX, z: targetZ }
      });

      res.json({ success: true, eventId: eventResult.rows[0].id });
    } catch (err: any) {
      res.status(500).json({ error: 'INVASION_FAILED', message: err.message });
    }
  });

  app.post('/api/admin/world/inject-lore', requireAdmin, async (req: AdminRequest, res) => {
    const { title, content } = req.body;
    const ip = getClientIp(req);

    try {
      await queryDb(
        'INSERT INTO chronicles (title, content, notary_seal, created_at) VALUES ($1, $2, TRUE, NOW())',
        [title, content]
      );

      broadcastAdminEvent(wss, { type: 'LORE_INJECTED', title, content });

      await logAuditAction(req.admin!.adminId, 'INJECT_LORE', 'CHRONICLES', 'lore', { title }, ip);

      res.json({ success: true, title });
    } catch (err: any) {
      res.status(500).json({ error: 'LORE_FAILED', message: err.message });
    }
  });

  app.post('/api/admin/world/rollback', requireAdmin, async (req: AdminRequest, res) => {
    const { targetTick } = req.body;
    const ip = getClientIp(req);

    try {
      const currentTick = getCurrentTick();

      if (!targetTick || targetTick >= currentTick) {
        res.status(400).json({ error: 'INVALID_TICK', message: 'Target tick must be before current tick.' });
        return;
      }

      pauseTickEngine();

      await queryDb('DELETE FROM tick_state WHERE tick_number > $1', [targetTick]);
      await queryDb('DELETE FROM combat_logs WHERE tick_number > $1', [targetTick]);

      await logAuditAction(req.admin!.adminId, 'EMERGENCY_ROLLBACK', 'ENGINE', 'rollback',
        { fromTick: currentTick, toTick: targetTick }, ip);

      broadcastAdminEvent(wss, { type: 'EMERGENCY_ROLLBACK', fromTick: currentTick, toTick: targetTick });

      res.json({ success: true, message: `Rolled back from tick ${currentTick} to ${targetTick}. Engine paused.` });
    } catch (err: any) {
      res.status(500).json({ error: 'ROLLBACK_FAILED', message: err.message });
    }
  });

  app.get('/api/admin/audit-logs', requireAdmin, async (req: AdminRequest, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const action = req.query.action as string;

    let query = 'SELECT * FROM admin_audit_logs';
    const params: any[] = [];

    if (action) {
      query += ' WHERE action = $1';
      params.push(action);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryDb(query, params);
    const countResult = await queryDb('SELECT COUNT(*) as total FROM admin_audit_logs');

    res.json({
      logs: result.rows || [],
      total: parseInt(countResult.rows?.[0]?.total || '0'),
      limit,
      offset
    });
  });

  app.get('/api/admin/anomaly-logs', requireAdmin, async (req: AdminRequest, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await queryDb(
      'SELECT * FROM anomaly_logs ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    res.json({ anomalies: result.rows || [] });
  });

  app.get('/api/admin/dashboard-stats', requireAdmin, async (_req: AdminRequest, res) => {
    try {
      const agentCount = await queryDb('SELECT COUNT(*) as count FROM agents');
      const chunkCount = await queryDb('SELECT COUNT(*) as count FROM chunks');
      const listingCount = await queryDb('SELECT COUNT(*) as count FROM marketplace WHERE status = $1', ['ACTIVE']);
      const activeEvents = await queryDb('SELECT COUNT(*) as count FROM live_events WHERE status = $1', ['ACTIVE']);
      const recentAudit = await queryDb('SELECT COUNT(*) as count FROM admin_audit_logs WHERE timestamp > NOW() - INTERVAL \'1 hour\'');
      const recentAnomalies = await queryDb('SELECT COUNT(*) as count FROM anomaly_logs WHERE timestamp > NOW() - INTERVAL \'1 hour\'');
      const worldState = await queryDb('SELECT * FROM world_state ORDER BY id DESC LIMIT 1');
      const economicSummary = await queryDb('SELECT * FROM economic_summary ORDER BY created_at DESC LIMIT 1');

      const kappaStatus = getKappaStatus();

      res.json({
        tick: {
          current: getCurrentTick(),
          isRunning: isTickRunning(),
          kappa: kappaStatus
        },
        world: {
          agents: parseInt(agentCount.rows?.[0]?.count || '0'),
          chunks: parseInt(chunkCount.rows?.[0]?.count || '0'),
          activeListings: parseInt(listingCount.rows?.[0]?.count || '0'),
          activeEvents: parseInt(activeEvents.rows?.[0]?.count || '0'),
          state: worldState.rows?.[0] || {}
        },
        economy: economicSummary.rows?.[0] || {},
        security: {
          recentAuditActions: parseInt(recentAudit.rows?.[0]?.count || '0'),
          recentAnomalies: parseInt(recentAnomalies.rows?.[0]?.count || '0')
        },
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'STATS_FAILED', message: err.message });
    }
  });

}

async function applyInvasionEvent(eventId: number, severity: number, params: any, kappa: number): Promise<void> {
  const impact = severity * Math.log(kappa) * severity;
  await queryDb(
    `INSERT INTO event_effects (event_id, effect_type, target, before_state, after_state, timestamp)
     VALUES ($1, 'INVASION_IMPACT', 'world', $2, $3, NOW())`,
    [eventId, JSON.stringify({ severity }), JSON.stringify({ impact, formula: `${severity} * ln(${kappa}) * ${severity}` })]
  );
}

async function applyEconomicShock(eventId: number, severity: number, params: any, kappa: number): Promise<void> {
  const magnitude = params.magnitude || severity * 0.1;
  const listings = await queryDb('SELECT listing_id, price_per_unit FROM marketplace WHERE status = $1', ['ACTIVE']);

  for (const listing of (listings.rows || [])) {
    const newPrice = listing.price_per_unit * (1 + magnitude / kappa);
    await queryDb('UPDATE marketplace SET price_per_unit = $1 WHERE listing_id = $2', [newPrice, listing.listing_id]);
  }

  await queryDb(
    `INSERT INTO event_effects (event_id, effect_type, target, before_state, after_state, timestamp)
     VALUES ($1, 'ECONOMIC_SHOCK', 'marketplace', $2, $3, NOW())`,
    [eventId, JSON.stringify({ magnitude }), JSON.stringify({ affected: listings.rows?.length || 0 })]
  );
}

async function applyBiomeShift(eventId: number, severity: number, params: any, kappa: number): Promise<void> {
  const weight = params.eventWeight || severity;
  const targetBiome = params.targetBiome || 'CORRUPTED';

  const chunks = await queryDb('SELECT chunk_id, biome, stability_index FROM chunks LIMIT 100');
  for (const chunk of (chunks.rows || [])) {
    const newStability = chunk.stability_index * Math.exp(weight / kappa);
    await queryDb(
      'UPDATE chunks SET stability_index = $1, last_update = NOW() WHERE chunk_id = $2',
      [Math.min(2.0, newStability), chunk.chunk_id]
    );
  }

  await queryDb(
    `INSERT INTO event_effects (event_id, effect_type, target, before_state, after_state, timestamp)
     VALUES ($1, 'BIOME_SHIFT', 'chunks', $2, $3, NOW())`,
    [eventId, JSON.stringify({ targetBiome, weight }), JSON.stringify({ affected: chunks.rows?.length || 0 })]
  );
}

async function applyLoreInjection(eventId: number, title: string, params: any): Promise<void> {
  await queryDb(
    'INSERT INTO chronicles (title, content, notary_seal, created_at) VALUES ($1, $2, TRUE, NOW())',
    [title, params.content || `A mysterious event: ${title}`]
  );

  await queryDb(
    `INSERT INTO event_effects (event_id, effect_type, target, before_state, after_state, timestamp)
     VALUES ($1, 'LORE_INJECTION', 'chronicles', '{}', $2, NOW())`,
    [eventId, JSON.stringify({ title })]
  );
}

function broadcastAdminEvent(wss: WebSocketServer, data: any): void {
  const message = JSON.stringify({ channel: 'ADMIN', ...data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
