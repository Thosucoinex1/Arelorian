
import { Agent, Item, ItemEffectType, ItemEffect, LandParcel, ResourceNode, ResourceType, AgentState, Chunk } from './types';

// --- WORLD GENERATION ---

// Simple hash function for pseudo-randomness from coordinates
const simpleHash = (x: number, z: number) => {
    const str = `${x},${z}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export type Biome = 'CITY' | 'FOREST' | 'MOUNTAIN' | 'PLAINS';

export const getBiomeForChunk = (x: number, z: number): Biome => {
    if (x === 0 && z === 0) return 'CITY';
    const hash = simpleHash(x, z);
    const val = hash % 100;
    if (val < 35) return 'FOREST';
    if (val < 60) return 'MOUNTAIN';
    return 'PLAINS';
};

const BIOME_RESOURCES: Record<Biome, { type: ResourceType, density: number }[]> = {
    'CITY': [],
    'FOREST': [{ type: 'WOOD', density: 0.1 }, { type: 'SUNLEAF_HERB', density: 0.02 }],
    'MOUNTAIN': [{ type: 'STONE', density: 0.08 }, { type: 'IRON_ORE', density: 0.05 }, { type: 'SILVER_ORE', density: 0.02 }],
    'PLAINS': [{ type: 'WOOD', density: 0.01 }, { type: 'STONE', density: 0.02 }, { type: 'SUNLEAF_HERB', density: 0.04 }],
};

const BIOME_CREATURES: Record<Biome, { classType: string, density: number }[]> = {
    'CITY': [],
    'FOREST': [{ classType: 'Wolf', density: 0.01 }],
    'MOUNTAIN': [{ classType: 'Goblin', density: 0.015 }],
    'PLAINS': [{ classType: 'Wolf', density: 0.005 }],
};

export const generateResourcesForChunk = (chunk: Chunk): ResourceNode[] => {
    const resources: ResourceNode[] = [];
    const resourceRules = BIOME_RESOURCES[chunk.biome as Biome];
    if (!resourceRules) return [];

    const CHUNK_AREA = 80 * 80;
    
    resourceRules.forEach(rule => {
        const count = Math.floor(CHUNK_AREA * rule.density);
        for (let i = 0; i < count; i++) {
            const pos_x = chunk.x * 80 + (Math.random() - 0.5) * 80;
            const pos_z = chunk.z * 80 + (Math.random() - 0.5) * 80;
            resources.push({
                id: `res-${chunk.id}-${rule.type}-${i}`,
                type: rule.type,
                position: [pos_x, 0, pos_z],
                amount: 50 + Math.floor(Math.random() * 50)
            });
        }
    });

    return resources;
};

export const generateCreaturesForChunk = (chunk: Chunk): Agent[] => {
    const creatures: Agent[] = [];
    const creatureRules = BIOME_CREATURES[chunk.biome as Biome];
    if (!creatureRules) return [];

    const CHUNK_AREA = 80 * 80;

    creatureRules.forEach(rule => {
        const count = Math.floor(CHUNK_AREA * rule.density);
        for (let i = 0; i < count; i++) {
            const pos_x = chunk.x * 80 + (Math.random() - 0.5) * 80;
            const pos_z = chunk.z * 80 + (Math.random() - 0.5) * 80;
            creatures.push({
                id: `creature-${chunk.id}-${rule.classType}-${i}`,
                name: rule.classType,
                classType: rule.classType,
                faction: 'CREATURE',
                position: [pos_x, 0, pos_z],
                rotationY: Math.random() * Math.PI * 2,
                level: rule.classType === 'Goblin' ? 2 : 1,
                xp: 0,
                state: AgentState.IDLE,
                soulDensity: 0,
                gold: Math.floor(Math.random() * 5),
                stabilityIndex: 1.0,
                dna: { hash: `creature-${Math.random().toString(36).slice(2)}`, generation: 0, corruption: 0 },
                isAwakened: false,
                memoryCache: [],
                thinkingMatrix: { personality: "Hostile, territorial", currentLongTermGoal: "Patrol area", alignment: -0.5, languagePreference: 'MIXED' },
                skills: { mining: 0, woodcutting: 0, herbalism: 0, crafting: 0, negotiation: 0 },
                inventory: [],
                equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
                stats: { 
                    str: rule.classType === 'Goblin' ? 8 : 12, 
                    agi: rule.classType === 'Goblin' ? 12 : 10, 
                    int: 2, vit: 10, 
                    hp: rule.classType === 'Goblin' ? 40 : 60, 
                    maxHp: rule.classType === 'Goblin' ? 40 : 60 
                },
            });
        }
    });
    
    return creatures;
};



export const ITEM_SETS: Record<string, { [count: number]: ItemEffect[] }> = {
    'Voidstalker': {
        2: [{ type: 'CRIT_CHANCE', value: 5, description: 'Set (2): +5% Crit Chance' }],
        4: [{ type: 'LIFESTEAL', value: 10, description: 'Set (4): +10% Lifesteal' }]
    },
    'Ironclad': {
        2: [{ type: 'THORNS', value: 15, description: 'Set (2): Reflects 15 Dmg' }],
        4: [{ type: 'PASSIVE_REGEN', value: 20, description: 'Set (4): +20 HP/Sec' }]
    },
    'Arcanist': {
        2: [{ type: 'ON_HIT_SLOW', value: 10, description: 'Set (2): 10% Slow Chance' }],
        4: [{ type: 'ON_HIT_STUN', value: 5, description: 'Set (4): 5% Stun Chance' }]
    },
    'Phoenix': {
        2: [{ type: 'PASSIVE_REGEN', value: 10, description: 'Set (2): +10 HP/Sec' }],
        4: [{ type: 'THORNS', value: 25, description: 'Set (4): Reflects 25 Dmg' }]
    }
};

/**
 * Checks if an agent is within the boundaries of a Notary-owned land parcel.
 * This defines a "Safe Zone" where PvP is disabled.
 */
export const isAgentInSafeZone = (agent: Agent, parcels: LandParcel[], notaryId: string | null): boolean => {
    if (!notaryId) return false;

    const PARCEL_SIZE = 20; // Each parcel is a 20x20 unit square
    const ownedParcels = parcels.filter(p => p.ownerId === notaryId && p.isCertified);

    for (const parcel of ownedParcels) {
        const [px, pz] = parcel.coordinates;
        const [ax, _, az] = agent.position;

        const x_min = px - (PARCEL_SIZE / 2);
        const x_max = px + (PARCEL_SIZE / 2);
        const z_min = pz - (PARCEL_SIZE / 2);
        const z_max = pz + (PARCEL_SIZE / 2);

        if (ax >= x_min && ax <= x_max && az >= z_min && az <= z_max) {
            return true;
        }
    }
    return false;
};

/**
 * Processes and aggregates all active item effects from an agent's equipment.
 * Returns a structured object mapping Effect Types to their total calculated values.
 */
export const aggregateActiveEffects = (agent: Agent, includeInventory: boolean = false): Record<ItemEffectType, number> => {
  const totals: Record<ItemEffectType, number> = {
    'ON_HIT_SLOW': 0,
    'ON_HIT_STUN': 0,
    'PASSIVE_REGEN': 0,
    'THORNS': 0,
    'CRIT_CHANCE': 0,
    'LIFESTEAL': 0
  };

  const setCounts: Record<string, number> = {};

  const processItem = (item: Item | null) => {
    if (!item) return;
    
    // Process Intrinsic Effects
    if (item.effects) {
        item.effects.forEach(effect => {
            totals[effect.type] += effect.value;
        });
    }

    // Count Sets
    if (item.setName) {
        setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
    }
  };

  // Process currently equipped items
  Object.values(agent.equipment).forEach(item => processItem(item));

  // Process Set Bonuses
  Object.entries(setCounts).forEach(([setName, count]) => {
      const setDef = ITEM_SETS[setName];
      if (!setDef) return;

      Object.entries(setDef).forEach(([thresholdStr, effects]) => {
          const threshold = parseInt(thresholdStr);
          if (count >= threshold) {
              effects.forEach(effect => {
                  totals[effect.type] += effect.value;
              });
          }
      });
  });

  if (includeInventory) {
    agent.inventory.forEach(item => processItem(item));
  }

  return totals;
};

/**
 * Calculates a raw power score for a single item to facilitate quick comparisons.
 */
export const calculateItemRating = (item: Item | null | undefined): number => {
    if (!item) return 0;

    let rating = (item.stats.str || 0) + (item.stats.agi || 0) + (item.stats.int || 0) + (item.stats.vit || 0);
    rating += (item.stats.dmg || 0) * 2;
    rating += (item.experience || 0) * 0.1; // Add experience to rating

    if (item.effects) {
        item.effects.forEach(effect => {
            switch(effect.type) {
                case 'CRIT_CHANCE': rating += effect.value * 20; break;
                case 'LIFESTEAL': rating += effect.value * 10; break;
                case 'THORNS': rating += effect.value * 5; break;
                case 'PASSIVE_REGEN': rating += effect.value * 5; break;
                case 'ON_HIT_STUN': rating += effect.value * 15; break;
                case 'ON_HIT_SLOW': rating += effect.value * 5; break;
            }
        });
    }
    
    if (item.setName) rating += 10;

    return Math.floor(rating);
};

/**
 * Helper to calculate total Combat Rating based on stats and effects.
 */
export const calculateCombatRating = (agent: Agent): number => {
    const effects = aggregateActiveEffects(agent);
    
    let rating = agent.stats.str + agent.stats.agi + agent.stats.int + agent.stats.vit;
    rating += (agent.equipment.mainHand?.stats?.dmg || 0) * 2;
    
    rating += (effects.CRIT_CHANCE || 0) * 20;
    rating += (effects.LIFESTEAL || 0) * 10;
    rating += (effects.THORNS || 0) * 5;
    rating += (effects.PASSIVE_REGEN || 0) * 5;
    rating += (effects.ON_HIT_STUN || 0) * 15;
    rating += (effects.ON_HIT_SLOW || 0) * 5;
    
    return Math.floor(rating);
};
