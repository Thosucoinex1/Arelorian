import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { queryDb } from './db.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;

function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error('CRITICAL: ADMIN_JWT_SECRET not set. Admin auth will use degraded security.');
    return 'OUROBOROS_EMERGENCY_' + (process.env.DATABASE_URL || '').slice(-16);
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(adminId: number, email: string, role: string): string {
  return jwt.sign(
    { adminId, email, role, type: 'access' },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(adminId: number): string {
  return jwt.sign(
    { adminId, type: 'refresh' },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): any {
  return jwt.verify(token, getJwtSecret());
}

export interface AdminRequest extends Request {
  admin?: {
    adminId: number;
    email: string;
    role: string;
  };
}

export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'access') {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid token type' });
      return;
    }

    const tokenHash = await hashString(token);
    const session = await queryDb(
      'SELECT * FROM admin_sessions WHERE admin_id = $1 AND token_hash = $2 AND revoked = FALSE AND expires_at > NOW() LIMIT 1',
      [decoded.adminId, tokenHash]
    );
    if (!session.rows || session.rows.length === 0) {
      const anySession = await queryDb(
        'SELECT * FROM admin_sessions WHERE admin_id = $1 AND revoked = FALSE AND expires_at > NOW() LIMIT 1',
        [decoded.adminId]
      );
      if (anySession.rows && anySession.rows.length > 0) {
        res.status(401).json({ error: 'TOKEN_MISMATCH', message: 'Token does not match active session' });
      } else {
        res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Session expired or revoked' });
      }
      return;
    }

    const admin = await queryDb('SELECT id, email, role FROM admins WHERE id = $1', [decoded.adminId]);
    if (!admin.rows || admin.rows.length === 0) {
      res.status(401).json({ error: 'ADMIN_NOT_FOUND', message: 'Admin account not found' });
      return;
    }

    req.admin = {
      adminId: decoded.adminId,
      email: admin.rows[0].email,
      role: admin.rows[0].role
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Access token expired' });
    } else {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token verification failed' });
    }
  }
}

async function hashString(str: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(str).digest('hex');
}

export async function checkBruteForce(identifier: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  const result = await queryDb(
    'SELECT attempts, locked_until FROM security_lockouts WHERE identifier = $1 AND lockout_type = $2 ORDER BY created_at DESC LIMIT 1',
    [identifier, 'LOGIN']
  );

  if (result.rows && result.rows.length > 0) {
    const lockout = result.rows[0];
    if (lockout.locked_until && new Date(lockout.locked_until) > new Date()) {
      return { locked: true, attemptsLeft: 0 };
    }
    if (lockout.attempts >= MAX_LOGIN_ATTEMPTS) {
      await queryDb(
        'UPDATE security_lockouts SET locked_until = $1 WHERE identifier = $2 AND lockout_type = $3',
        [new Date(Date.now() + LOCKOUT_DURATION_MS), identifier, 'LOGIN']
      );
      return { locked: true, attemptsLeft: 0 };
    }
    return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS - lockout.attempts };
  }

  return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS };
}

export async function recordLoginAttempt(identifier: string, success: boolean): Promise<void> {
  if (success) {
    await queryDb(
      'DELETE FROM security_lockouts WHERE identifier = $1 AND lockout_type = $2',
      [identifier, 'LOGIN']
    );
    return;
  }

  const existing = await queryDb(
    'SELECT id, attempts FROM security_lockouts WHERE identifier = $1 AND lockout_type = $2 ORDER BY created_at DESC LIMIT 1',
    [identifier, 'LOGIN']
  );

  if (existing.rows && existing.rows.length > 0) {
    const newAttempts = existing.rows[0].attempts + 1;
    const lockedUntil = newAttempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
    await queryDb(
      'UPDATE security_lockouts SET attempts = $1, locked_until = $2 WHERE id = $3',
      [newAttempts, lockedUntil, existing.rows[0].id]
    );
  } else {
    await queryDb(
      'INSERT INTO security_lockouts (identifier, lockout_type, attempts, locked_until, created_at) VALUES ($1, $2, 1, NULL, NOW())',
      [identifier, 'LOGIN']
    );
  }
}

export async function logAuditAction(
  adminId: number,
  action: string,
  targetType: string,
  targetId: string,
  details: any,
  ipAddress: string
): Promise<void> {
  await queryDb(
    'INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress]
  );
}

export async function logAnomaly(sourceIp: string, pattern: string, severity: string, details: any): Promise<void> {
  await queryDb(
    'INSERT INTO anomaly_logs (source_ip, pattern, severity, details, timestamp) VALUES ($1, $2, $3, $4, NOW())',
    [sourceIp, pattern, severity, JSON.stringify(details)]
  );
}

export async function createSession(
  adminId: number,
  accessToken: string,
  refreshToken: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const tokenHash = await hashString(accessToken);
  const refreshHash = await hashString(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await queryDb(
    `INSERT INTO admin_sessions (admin_id, token_hash, refresh_token_hash, ip_address, user_agent, created_at, expires_at, revoked)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, FALSE)`,
    [adminId, tokenHash, refreshHash, ipAddress, userAgent, expiresAt]
  );
}

export async function revokeAllSessions(adminId: number): Promise<void> {
  await queryDb(
    'UPDATE admin_sessions SET revoked = TRUE WHERE admin_id = $1',
    [adminId]
  );
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function adminRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    logAnomaly(ip, 'RATE_LIMIT_EXCEEDED', 'HIGH', { count: entry.count, endpoint: req.path });
    res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many requests. Try again later.' });
    return;
  }

  next();
}

export function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
}
