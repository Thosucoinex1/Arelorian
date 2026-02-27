import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbAvailable = false;

export function initPool(): pg.Pool | null {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      ssl: false
    });
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
  }

  return pool;
}

export function getPool(): pg.Pool | null {
  return pool;
}

export function isDbAvailable(): boolean {
  return dbAvailable;
}

export function setDbAvailable(val: boolean) {
  dbAvailable = val;
}

export async function initDb(retries = 3, delay = 2000): Promise<void> {
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

export async function ensureSchema(): Promise<void> {
  if (!pool || !dbAvailable) return;

  const ddl = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS agents (
      uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      npc_class VARCHAR(50) DEFAULT 'NEURAL_EMERGENT',
      level INTEGER DEFAULT 1,
      hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      exp BIGINT DEFAULT 0,
      pos_x FLOAT DEFAULT 0.0,
      pos_y FLOAT DEFAULT 0.5,
      pos_z FLOAT DEFAULT 0.0,
      inventory JSONB DEFAULT '[]',
      dna_history JSONB DEFAULT '[]',
      memory_cache JSONB DEFAULT '[]',
      awakened BOOLEAN DEFAULT FALSE,
      last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      selected_agent_uid UUID,
      matrix_energy FLOAT DEFAULT 100.0,
      subscription_tier VARCHAR(50) DEFAULT 'FREE',
      last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chunks (
      chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      x INTEGER NOT NULL,
      z INTEGER NOT NULL,
      seed BIGINT NOT NULL,
      biome VARCHAR(50) DEFAULT 'PLAINS',
      terrain_height FLOAT DEFAULT 0.0,
      entropy FLOAT DEFAULT 0.0,
      stability_index FLOAT DEFAULT 1.0,
      corruption_level FLOAT DEFAULT 0.0,
      resource_data JSONB DEFAULT '{}',
      logic_field JSONB DEFAULT '[]',
      dungeon_probability FLOAT DEFAULT 0.0,
      entities JSONB DEFAULT '[]',
      last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(x, z)
    );

    CREATE TABLE IF NOT EXISTS combat_logs (
      log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      attacker_uid UUID REFERENCES agents(uid) ON DELETE SET NULL,
      defender_uid UUID,
      defender_type VARCHAR(50) DEFAULT 'AGENT',
      damage_dealt INTEGER DEFAULT 0,
      damage_received INTEGER DEFAULT 0,
      skill_used VARCHAR(100),
      result VARCHAR(50),
      loot_dropped JSONB DEFAULT '[]',
      tick_number BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loot_table (
      loot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      item_type VARCHAR(50) NOT NULL,
      rarity VARCHAR(50) DEFAULT 'COMMON',
      base_stats JSONB DEFAULT '{}',
      drop_weight FLOAT DEFAULT 1.0,
      source_type VARCHAR(50),
      source_level_min INTEGER DEFAULT 1,
      source_level_max INTEGER DEFAULT 100,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marketplace (
      listing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      seller_uid UUID REFERENCES agents(uid) ON DELETE SET NULL,
      item_name VARCHAR(255) NOT NULL,
      item_type VARCHAR(50),
      resource_type VARCHAR(50),
      quantity INTEGER DEFAULT 1,
      price_per_unit FLOAT NOT NULL,
      base_price FLOAT NOT NULL,
      demand_index FLOAT DEFAULT 1.0,
      supply_index FLOAT DEFAULT 1.0,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS hierarchy_entities (
      entity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      leader_uid UUID REFERENCES agents(uid) ON DELETE SET NULL,
      members JSONB DEFAULT '[]',
      level INTEGER DEFAULT 1,
      influence FLOAT DEFAULT 0.0,
      territory JSONB DEFAULT '[]',
      infrastructure JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matrix_transactions (
      tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      from_uid UUID,
      to_uid UUID,
      tx_type VARCHAR(50) NOT NULL,
      amount FLOAT NOT NULL,
      currency VARCHAR(50) DEFAULT 'MATRIX_ENERGY',
      description TEXT,
      tick_number BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS economic_summary (
      summary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tick_number BIGINT NOT NULL,
      total_supply JSONB DEFAULT '{}',
      total_demand JSONB DEFAULT '{}',
      price_index JSONB DEFAULT '{}',
      gdp FLOAT DEFAULT 0.0,
      inflation_rate FLOAT DEFAULT 0.0,
      trade_volume INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tick_state (
      tick_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tick_number BIGINT NOT NULL UNIQUE,
      agents_processed INTEGER DEFAULT 0,
      chunks_updated INTEGER DEFAULT 0,
      combats_resolved INTEGER DEFAULT 0,
      duration_ms FLOAT DEFAULT 0.0,
      status VARCHAR(20) DEFAULT 'COMMITTED',
      error_log TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS world_state (
      id SERIAL PRIMARY KEY,
      stability_index FLOAT DEFAULT 1.0,
      active_players INTEGER DEFAULT 0,
      vertex_ai_status VARCHAR(20) DEFAULT 'CONNECTED',
      last_pulse TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS duden_register (
      entry_id SERIAL PRIMARY KEY,
      notary_name VARCHAR(100) DEFAULT 'Petra Markgraf',
      event_type VARCHAR(50),
      description TEXT,
      stability_impact FLOAT DEFAULT 0.0,
      signature_hash VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chronicles (
      chapter_id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      content TEXT,
      notary_seal BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP WITH TIME ZONE,
      force_password_change BOOLEAN DEFAULT FALSE,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS admin_roles (
      id SERIAL PRIMARY KEY,
      role_name VARCHAR(50) UNIQUE NOT NULL,
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
      token_hash VARCHAR(255),
      refresh_token_hash VARCHAR(255),
      ip_address VARCHAR(100),
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE,
      revoked BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER,
      action VARCHAR(255) NOT NULL,
      target_type VARCHAR(100),
      target_id VARCHAR(255),
      details JSONB DEFAULT '{}',
      ip_address VARCHAR(100),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_event_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}',
      result JSONB DEFAULT '{}',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anomaly_logs (
      id SERIAL PRIMARY KEY,
      source_ip VARCHAR(100),
      pattern VARCHAR(255),
      severity VARCHAR(50) DEFAULT 'LOW',
      details JSONB DEFAULT '{}',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_lockouts (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      lockout_type VARCHAR(50) DEFAULT 'LOGIN',
      attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_events (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER,
      event_type VARCHAR(100) NOT NULL,
      name VARCHAR(255),
      severity REAL DEFAULT 1.0,
      parameters JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS event_effects (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES live_events(id) ON DELETE CASCADE,
      effect_type VARCHAR(100),
      target VARCHAR(255),
      before_state JSONB DEFAULT '{}',
      after_state JSONB DEFAULT '{}',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_logs_timestamp ON anomaly_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_live_events_status ON live_events(status);
    CREATE INDEX IF NOT EXISTS idx_live_events_admin_id ON live_events(admin_id);
    CREATE INDEX IF NOT EXISTS idx_event_effects_event_id ON event_effects(event_id);
    CREATE INDEX IF NOT EXISTS idx_security_lockouts_identifier ON security_lockouts(identifier);
  `;

  try {
    await pool.query(ddl);
    console.log('Schema verified/created (22 tables).');
  } catch (err: any) {
    console.error('Schema initialization error:', err.message);
  }
}

export async function seedAdminAccount(): Promise<void> {
  if (!pool || !dbAvailable) return;

  try {
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', ['projectouroboroscollective@gmail.com']);
    if (existing.rows.length > 0) return;

    const bcrypt = await import('bcryptjs');
    const password = process.env.ADMIN_DEFAULT_PASSWORD || '2N00py123-';
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO admins (email, password_hash, role, created_at, force_password_change)
       VALUES ($1, $2, 'sovereign', NOW(), TRUE)`,
      ['projectouroboroscollective@gmail.com', hash]
    );

    await pool.query(
      `INSERT INTO admin_roles (role_name, permissions, created_at) VALUES
       ('sovereign', '["*"]', NOW()),
       ('operator', '["view","events","tick_control"]', NOW()),
       ('observer', '["view"]', NOW())
       ON CONFLICT (role_name) DO NOTHING`
    );

    console.log('Admin account seeded (sovereign).');
  } catch (err: any) {
    if (!err.message?.includes('duplicate')) {
      console.error('Admin seed error:', err.message);
    }
  }
}

export async function queryDb(sql: string, params?: any[]): Promise<any> {
  if (!pool || !dbAvailable) {
    return { rows: [], rowCount: 0 };
  }
  return pool.query(sql, params);
}

export const memoryStore = {
  agents: new Map<string, any>(),
  worldState: new Map<string, any>()
};
