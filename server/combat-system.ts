import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';

export interface CombatResult {
  attacker_uid: string;
  defender_uid: string;
  defender_type: string;
  damage_dealt: number;
  damage_received: number;
  skill_used: string;
  result: string;
  loot_dropped: any[];
}

function calculateDamage(
  attackerStats: { str: number; agi: number; int: number; level: number },
  defenderStats: { str: number; agi: number; vit: number; level: number }
): { damage: number; isCrit: boolean } {
  const baseDamage = attackerStats.str * 2 + attackerStats.level * 1.5;
  const defense = defenderStats.vit * 1.5 + defenderStats.level;
  const agilityModifier = 1 + (attackerStats.agi - defenderStats.agi) * 0.01;
  const critChance = Math.min(0.3, attackerStats.agi * 0.005);
  const isCrit = Math.random() < critChance;
  const critMultiplier = isCrit ? 2.0 : 1.0;
  const rawDamage = Math.max(1, (baseDamage - defense * 0.5) * agilityModifier * critMultiplier);
  return { damage: Math.floor(rawDamage), isCrit };
}

function determineCombatAction(
  hp: number, maxHp: number, enemyThreat: number
): string {
  const hpRatio = hp / maxHp;
  if (hpRatio < 0.2) return 'RETREAT';
  if (hpRatio < 0.4 && enemyThreat > 0.6) return 'DEFEND';
  return 'ATTACK';
}

export async function resolveCombat(
  attackerUid: string,
  defenderUid: string,
  defenderType: string,
  tickNumber: number
): Promise<CombatResult | null> {
  if (!isDbAvailable()) return null;

  return withTransaction(async (client) => {
    const attackerRes = await client.query(
      'SELECT uid, name, level, hp, max_hp, inventory FROM agents WHERE uid = $1 FOR UPDATE',
      [attackerUid]
    );
    if (attackerRes.rows.length === 0) return null;
    const attacker = attackerRes.rows[0];

    let defender: any;
    if (defenderType === 'AGENT') {
      const defRes = await client.query(
        'SELECT uid, name, level, hp, max_hp FROM agents WHERE uid = $1 FOR UPDATE',
        [defenderUid]
      );
      if (defRes.rows.length === 0) return null;
      defender = defRes.rows[0];
    } else {
      defender = {
        uid: defenderUid,
        level: 1,
        hp: 50,
        max_hp: 50,
        str: 5, agi: 5, int: 3, vit: 5
      };
    }

    const attackerStats = {
      str: 10 + attacker.level * 2,
      agi: 8 + attacker.level,
      int: 6 + attacker.level,
      level: attacker.level
    };
    const defenderStats = {
      str: defender.str || (8 + defender.level * 2),
      agi: defender.agi || (6 + defender.level),
      int: defender.int || (5 + defender.level),
      vit: defender.vit || (8 + defender.level),
      level: defender.level
    };

    const action = determineCombatAction(attacker.hp, attacker.max_hp, defender.level / (attacker.level + 1));

    let damageDealt = 0;
    let damageReceived = 0;
    let result = 'CONTINUE';
    let skillUsed = action;

    if (action === 'ATTACK') {
      const { damage } = calculateDamage(attackerStats, defenderStats);
      damageDealt = damage;

      const counterDamage = calculateDamage(defenderStats, {
        str: attackerStats.str, agi: attackerStats.agi,
        vit: 8 + attacker.level, level: attacker.level
      });
      damageReceived = Math.floor(counterDamage.damage * 0.6);
    } else if (action === 'DEFEND') {
      const counterDamage = calculateDamage(defenderStats, {
        str: attackerStats.str, agi: attackerStats.agi,
        vit: 8 + attacker.level, level: attacker.level
      });
      damageReceived = Math.floor(counterDamage.damage * 0.3);
    } else {
      result = 'RETREAT';
    }

    const newAttackerHp = Math.max(0, attacker.hp - damageReceived);
    const newDefenderHp = Math.max(0, (defender.hp || 50) - damageDealt);

    if (newDefenderHp <= 0) result = 'VICTORY';
    else if (newAttackerHp <= 0) result = 'DEFEAT';

    await client.query(
      'UPDATE agents SET hp = $1, last_update = NOW() WHERE uid = $2',
      [newAttackerHp, attackerUid]
    );

    if (defenderType === 'AGENT') {
      await client.query(
        'UPDATE agents SET hp = $1, last_update = NOW() WHERE uid = $2',
        [newDefenderHp, defenderUid]
      );
    }

    const combatResult: CombatResult = {
      attacker_uid: attackerUid,
      defender_uid: defenderUid,
      defender_type: defenderType,
      damage_dealt: damageDealt,
      damage_received: damageReceived,
      skill_used: skillUsed,
      result,
      loot_dropped: []
    };

    await client.query(
      `INSERT INTO combat_logs (attacker_uid, defender_uid, defender_type, damage_dealt, damage_received, skill_used, result, loot_dropped, tick_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [attackerUid, defenderUid, defenderType, damageDealt, damageReceived,
       skillUsed, result, JSON.stringify(combatResult.loot_dropped), tickNumber]
    );

    return combatResult;
  });
}

export async function getCombatLogs(limit = 50): Promise<any[]> {
  const res = await queryDb(
    'SELECT * FROM combat_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows || [];
}
