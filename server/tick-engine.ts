import { TICK_INTERVAL_MS, KAPPA, selectBestGoal } from './math-engine.js';
import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';
import { extractResource, applyBiomeShift } from './chunk-engine.js';
import { resolveCombat } from './combat-system.js';
import { generateLoot, recordLootDrop } from './loot-generator.js';
import {
  applyNaturalDecay, adjustSupply, adjustDemand,
  recordEconomicSummary, applyWarImpact
} from './economic-aggregator.js';
import { rewardEnergy } from './matrix-accounting.js';

let tickNumber = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;
let initialized = false;

export function getCurrentTick(): number {
  return tickNumber;
}

export function isTickRunning(): boolean {
  return tickTimer !== null;
}

async function processAgentTick(agent: any): Promise<{
  action: string;
  combats: number;
  resources: Record<string, number>;
}> {
  const result = { action: 'IDLE', combats: 0, resources: {} as Record<string, number> };

  const chunkX = Math.floor(agent.pos_x / 16);
  const chunkZ = Math.floor(agent.pos_z / 16);

  const goalOptions = [
    {
      name: 'GATHERING',
      skillGain: agent.level < 5 ? 3 : 1,
      goldGain: 2,
      safetyIndex: 0.9
    },
    {
      name: 'COMBAT',
      skillGain: 2,
      goldGain: 3,
      safetyIndex: agent.hp / agent.max_hp * 0.5
    },
    {
      name: 'TRADING',
      skillGain: 0.5,
      goldGain: 4,
      safetyIndex: 1.0
    },
    {
      name: 'EXPLORING',
      skillGain: 2.5,
      goldGain: 1,
      safetyIndex: 0.7
    },
    {
      name: 'RESTING',
      skillGain: 0,
      goldGain: 0,
      safetyIndex: agent.hp < agent.max_hp * 0.5 ? 5 : 0.1
    }
  ];

  const bestGoal = selectBestGoal(goalOptions);
  result.action = bestGoal.name;

  if (bestGoal.name === 'GATHERING') {
    const resources = ['WOOD', 'STONE', 'IRON_ORE'];
    const resource = resources[tickNumber % resources.length];
    const extraction = await extractResource(chunkX, chunkZ, resource, 1);
    if (extraction.success) {
      result.resources[resource] = extraction.extracted;
      adjustSupply(resource, extraction.extracted);

      const expGain = extraction.extracted * 5;
      await queryDb(
        'UPDATE agents SET exp = exp + $1, last_update = NOW() WHERE uid = $2',
        [expGain, agent.uid]
      );

      if (extraction.extracted > 3) {
        await applyBiomeShift(chunkX, chunkZ);
      }
    }
  } else if (bestGoal.name === 'COMBAT') {
    const nearbyAgents = await queryDb(
      `SELECT uid FROM agents
       WHERE uid != $1 AND awakened = false
       AND ABS(pos_x - $2) < 16 AND ABS(pos_z - $3) < 16
       LIMIT 1`,
      [agent.uid, agent.pos_x, agent.pos_z]
    );

    if (nearbyAgents.rows?.length > 0) {
      const combatResult = await resolveCombat(
        agent.uid, nearbyAgents.rows[0].uid, 'AGENT', tickNumber
      );
      if (combatResult) {
        result.combats = 1;
        if (combatResult.result === 'VICTORY') {
          const loot = generateLoot(agent.level, tickNumber + parseInt(agent.uid.slice(0, 8), 16), 1);
          combatResult.loot_dropped = loot;
          await recordLootDrop(loot);
          await rewardEnergy(agent.uid, 5, 'Combat victory reward', tickNumber);

          applyWarImpact(0.05);
        }
      }
    }
  } else if (bestGoal.name === 'RESTING') {
    const healAmount = Math.min(agent.max_hp - agent.hp, Math.floor(agent.max_hp * 0.1));
    if (healAmount > 0) {
      await queryDb(
        'UPDATE agents SET hp = LEAST(max_hp, hp + $1), last_update = NOW() WHERE uid = $2',
        [healAmount, agent.uid]
      );
    }
  } else if (bestGoal.name === 'EXPLORING') {
    const dx = (Math.sin(tickNumber * 0.1 + parseInt(agent.uid.slice(0, 4), 16)) * 2);
    const dz = (Math.cos(tickNumber * 0.1 + parseInt(agent.uid.slice(4, 8), 16)) * 2);
    await queryDb(
      'UPDATE agents SET pos_x = pos_x + $1, pos_z = pos_z + $2, last_update = NOW() WHERE uid = $3',
      [dx, dz, agent.uid]
    );

    const expGain = 2;
    await queryDb(
      'UPDATE agents SET exp = exp + $1 WHERE uid = $2',
      [expGain, agent.uid]
    );
  } else if (bestGoal.name === 'TRADING') {
    adjustDemand('IRON_ORE', 0.5);
    adjustDemand('WOOD', 0.3);
  }

  return result;
}

async function executeTick(): Promise<void> {
  if (isProcessing || !isDbAvailable()) return;
  isProcessing = true;

  const tickStart = Date.now();
  tickNumber++;

  let agentsProcessed = 0;
  let chunksUpdated = 0;
  let combatsResolved = 0;
  let errorLog: string | null = null;

  try {
    const agentsRes = await queryDb(
      'SELECT * FROM agents WHERE awakened = true ORDER BY last_update ASC LIMIT 50'
    );

    const agents = agentsRes.rows || [];

    for (const agent of agents) {
      try {
        const result = await processAgentTick(agent);
        agentsProcessed++;
        combatsResolved += result.combats;
      } catch (err: any) {
        console.error(`Tick error for agent ${agent.uid}:`, err.message);
        errorLog = (errorLog || '') + `Agent ${agent.uid}: ${err.message}\n`;
      }
    }

    applyNaturalDecay();

    if (tickNumber % 10 === 0) {
      await recordEconomicSummary(tickNumber);
    }

    await queryDb(
      'UPDATE world_state SET active_players = $1, last_pulse = NOW() WHERE id = (SELECT id FROM world_state ORDER BY id DESC LIMIT 1)',
      [agentsProcessed]
    );

    const duration = Date.now() - tickStart;

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO tick_state (tick_number, agents_processed, chunks_updated, combats_resolved, duration_ms, status, error_log)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tickNumber, agentsProcessed, chunksUpdated, combatsResolved,
         duration, errorLog ? 'PARTIAL' : 'COMMITTED', errorLog]
      );
    });

    if (duration > TICK_INTERVAL_MS * 0.8) {
      console.warn(`Tick ${tickNumber} took ${duration}ms (>${TICK_INTERVAL_MS * 0.8}ms threshold)`);
    }

  } catch (err: any) {
    console.error(`Critical tick error at tick ${tickNumber}:`, err.message);
    const duration = Date.now() - tickStart;
    try {
      await queryDb(
        `INSERT INTO tick_state (tick_number, agents_processed, chunks_updated, combats_resolved, duration_ms, status, error_log)
         VALUES ($1, $2, $3, $4, $5, 'FAILED', $6)`,
        [tickNumber, agentsProcessed, chunksUpdated, combatsResolved, duration, err.message]
      );
    } catch (_) {}
  } finally {
    isProcessing = false;
  }
}

export async function startTickEngine(): Promise<void> {
  if (tickTimer) return;

  if (!initialized && isDbAvailable()) {
    const res = await queryDb('SELECT MAX(tick_number) as max_tick FROM tick_state');
    const lastTick = parseInt(res.rows?.[0]?.max_tick || '0');
    if (lastTick > 0) {
      tickNumber = lastTick;
      console.log(`Tick Engine resuming from tick ${tickNumber}`);
    }
    initialized = true;
  }

  console.log(`Tick Engine started: ${TICK_INTERVAL_MS}ms cycle, κ=${KAPPA}`);
  tickTimer = setInterval(executeTick, TICK_INTERVAL_MS);
}

export function stopTickEngine(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    console.log('Tick Engine stopped.');
  }
}

export function pauseTickEngine(): { success: boolean; message: string } {
  if (!tickTimer) {
    return { success: false, message: 'Tick Engine is not running.' };
  }
  clearInterval(tickTimer);
  tickTimer = null;
  console.log('Tick Engine PAUSED by admin.');
  return { success: true, message: `Tick Engine paused at tick ${tickNumber}.` };
}

export function resumeTickEngine(): { success: boolean; message: string } {
  if (tickTimer) {
    return { success: false, message: 'Tick Engine is already running.' };
  }
  tickTimer = setInterval(executeTick, TICK_INTERVAL_MS);
  console.log('Tick Engine RESUMED by admin.');
  return { success: true, message: `Tick Engine resumed from tick ${tickNumber}.` };
}

export async function getTickState(limit = 20): Promise<any[]> {
  const res = await queryDb(
    'SELECT * FROM tick_state ORDER BY tick_number DESC LIMIT $1',
    [limit]
  );
  return res.rows || [];
}
