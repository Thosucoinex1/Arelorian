import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';

const INFRASTRUCTURE_UNLOCKS: Record<number, string[]> = {
  1: ['CAMPFIRE', 'TENT'],
  3: ['WORKSHOP', 'WATCHTOWER'],
  5: ['FORGE', 'MARKET_STALL'],
  8: ['BARRACKS', 'LIBRARY'],
  10: ['CASTLE', 'CATHEDRAL'],
  15: ['ACADEMY', 'GRAND_MARKET'],
  20: ['CITADEL', 'PORTAL_GATE']
};

export async function createHierarchyEntity(
  name: string, entityType: string, leaderUid: string
): Promise<any> {
  if (!isDbAvailable()) return null;

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO hierarchy_entities (name, entity_type, leader_uid, members, level, influence)
       VALUES ($1, $2, $3, $4, 1, 0)
       RETURNING *`,
      [name, entityType, leaderUid, JSON.stringify([leaderUid])]
    );
    return result.rows[0];
  });
}

export async function addMember(entityId: string, memberUid: string): Promise<boolean> {
  if (!isDbAvailable()) return false;

  return withTransaction(async (client) => {
    const res = await client.query(
      'SELECT members, level FROM hierarchy_entities WHERE entity_id = $1 FOR UPDATE',
      [entityId]
    );
    if (res.rows.length === 0) return false;

    const members: string[] = res.rows[0].members || [];
    if (members.includes(memberUid)) return true;

    members.push(memberUid);
    const newLevel = calculateHierarchyLevel(members.length);
    const newInfluence = members.length * 10 + newLevel * 25;

    await client.query(
      `UPDATE hierarchy_entities SET members = $1, level = $2, influence = $3, last_update = NOW()
       WHERE entity_id = $4`,
      [JSON.stringify(members), newLevel, newInfluence, entityId]
    );

    return true;
  });
}

function calculateHierarchyLevel(memberCount: number): number {
  if (memberCount >= 50) return 20;
  if (memberCount >= 30) return 15;
  if (memberCount >= 20) return 10;
  if (memberCount >= 12) return 8;
  if (memberCount >= 8) return 5;
  if (memberCount >= 5) return 3;
  return 1;
}

export function getUnlockedInfrastructure(level: number): string[] {
  const unlocked: string[] = [];
  for (const [reqLevel, items] of Object.entries(INFRASTRUCTURE_UNLOCKS)) {
    if (level >= parseInt(reqLevel)) {
      unlocked.push(...items);
    }
  }
  return unlocked;
}

export async function validateHierarchy(entityId: string): Promise<{
  valid: boolean;
  level: number;
  infrastructure: string[];
  memberCount: number;
}> {
  if (!isDbAvailable()) {
    return { valid: false, level: 0, infrastructure: [], memberCount: 0 };
  }

  const res = await queryDb(
    'SELECT * FROM hierarchy_entities WHERE entity_id = $1',
    [entityId]
  );

  if (res.rows.length === 0) {
    return { valid: false, level: 0, infrastructure: [], memberCount: 0 };
  }

  const entity = res.rows[0];
  const members = entity.members || [];
  const level = calculateHierarchyLevel(members.length);
  const infrastructure = getUnlockedInfrastructure(level);

  return {
    valid: true,
    level,
    infrastructure,
    memberCount: members.length
  };
}

export async function getHierarchyEntities(): Promise<any[]> {
  const res = await queryDb(
    'SELECT * FROM hierarchy_entities ORDER BY influence DESC'
  );
  return res.rows || [];
}
