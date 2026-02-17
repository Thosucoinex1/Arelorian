
import { Agent, Item, ItemEffectType, ItemEffect, LandParcel, ResourceNode, ResourceType, AgentState, Chunk, AXIOMS } from './types';

// --- AXIOMATIC NEUROLOGIC ENGINE (ANE) v4.0 ---

export interface AxiomaticSummary {
    choice: AgentState;
    utility: number;
    logic: string;
}

/**
 * Validates action against the Ouroboros Axioms.
 * Return false if logical corrosion is too high.
 */
export const validateAxiom = (agent: Agent, cost: number): boolean => {
    const energyCheck = agent.energy >= cost;
    const erosionCheck = agent.integrity > 0.1; // Minimal coherence required
    const recursionCheck = !!agent.dna.hash; // Must have DNA to manifest
    return energyCheck && erosionCheck && recursionCheck;
};

/**
 * Calculates the "Desire Weight" for an agent using neurologic mathematical grounding.
 * Refined for "Logic with Plexity" and autonomous social dynamics.
 */
export const calculateAxiomaticWeight = (
    agent: Agent, 
    action: AgentState, 
    nearbyAgents: Agent[], 
    nearbyResources: ResourceNode[]
): number => {
    // AXIOM 1: ENERGY - Capacity to manifest intent
    const K_ENERGY = agent.energy / (agent.maxEnergy || 100);
    // AXIOM 2: EROSION - Action + Time = ↑Korruption
    const K_INTEGRITY = agent.integrity || 1.0;
    // AXIOM 4: RECURSION - Outcome(t) depends on DNA
    const K_RECURSION = (Math.sin(Date.now() * 0.0005 + agent.position[0]) + 1.2) * 0.5;

    let baseUtility = 0;

    switch (action) {
        case AgentState.GATHERING:
            // U_gather = Sum(Skill / Dist) * Energy * Integrity
            const activeInv = agent.inventory.filter(i => i).length;
            const invRatio = activeInv / (agent.inventory.length || 1);
            nearbyResources.forEach(res => {
                const dist = Math.hypot(res.position[0] - agent.position[0], res.position[2] - agent.position[2]);
                const skillBonus = (agent.skills[res.type.toLowerCase()] || 1);
                if (dist < 60) {
                    baseUtility += (Math.pow(60 - dist, 1.1) * skillBonus * (1.1 - invRatio) * K_ENERGY);
                }
            });
            break;

        case AgentState.ALLIANCE_FORMING:
            // U_social = Density * (1 - SoulDensity) * Integrity
            const socialDensity = nearbyAgents.filter(a => a.id !== agent.id && a.faction === 'PLAYER').length;
            if (socialDensity > 0) {
                const alignmentForce = 1.0 - Math.abs(agent.thinkingMatrix.alignment);
                baseUtility += (socialDensity * 40 * (1.1 - agent.soulDensity) * alignmentForce * K_INTEGRITY);
            }
            break;

        case AgentState.THINKING:
            // Recursive routine to restore integrity/stability
            // U_think = (1 - Integrity) * 100
            baseUtility += (1.1 - K_INTEGRITY) * 90;
            break;

        case AgentState.IDLE:
            // Restore energy while idle
            baseUtility = (1.1 - K_ENERGY) * 50 + 10;
            break;
            
        case AgentState.TRADING:
            const count = agent.inventory.filter(i => i).length;
            baseUtility += (count * 20) + (agent.gold < 150 ? 50 : 0);
            break;

        default:
            baseUtility = 0;
    }

    // Mathematical Grounding: Final Utility = (Base * Recursion) + Entropy
    return (baseUtility * K_RECURSION) + (Math.random() * 5);
};

export const summarizeNeurologicChoice = (
    agent: Agent,
    nearbyAgents: Agent[],
    nearbyResources: ResourceNode[]
): AxiomaticSummary => {
    const choices = [
        AgentState.IDLE, 
        AgentState.GATHERING, 
        AgentState.ALLIANCE_FORMING, 
        AgentState.TRADING, 
        AgentState.THINKING
    ];

    const results = choices.map(c => ({
        choice: c,
        utility: calculateAxiomaticWeight(agent, c, nearbyAgents, nearbyResources)
    })).sort((a, b) => b.utility - a.utility);

    const best = results[0];
    const second = results[1];
    
    const diff = (best.utility - second.utility).toFixed(2);
    const logic = `AUE:${best.choice} | U=${best.utility.toFixed(1)} | Δ=${diff} | E:${(agent.energy).toFixed(0)} I:${agent.integrity.toFixed(2)}`;

    return { ...best, logic };
};

// --- WORLD GENERATION ---

const simpleHash = (x: number, z: number) => {
    const str = `${x},${z}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
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
                energy: 100,
                maxEnergy: 100,
                integrity: 1.0,
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
                    hp: rule.classType === 'Goblin' ? 50 : 100,
                    maxHp: rule.classType === 'Goblin' ? 50 : 100
                },
                stuckTicks: 0,
                wanderTarget: null
            });
        }
    });

    return creatures;
};

export const ITEM_SETS: Record<string, Record<number, ItemEffect[]>> = {
    'Axiomatic': {
        2: [{ type: 'PASSIVE_REGEN', value: 5, description: 'Axiomatic Resonance: +5 HP Regen' }],
        4: [{ type: 'CRIT_CHANCE', value: 0.1, description: 'Axiomatic Focus: +10% Crit Chance' }]
    }
};

export const isAgentInSafeZone = (agent: Agent, parcels: LandParcel[], notaryId: string | null): boolean => {
    if (!notaryId) return false;
    const PARCEL_SIZE = 20;
    const ownedParcels = parcels.filter(p => p.ownerId === notaryId && p.isCertified);
    for (const parcel of ownedParcels) {
        const [px, pz] = parcel.coordinates;
        const [ax, _, az] = agent.position;
        const x_min = px - (PARCEL_SIZE / 2);
        const x_max = px + (PARCEL_SIZE / 2);
        const z_min = pz - (PARCEL_SIZE / 2);
        const z_max = pz + (PARCEL_SIZE / 2);
        if (ax >= x_min && ax <= x_max && az >= z_min && az <= z_max) return true;
    }
    return false;
};

export const aggregateActiveEffects = (agent: Agent, includeInventory: boolean = false): Record<ItemEffectType, number> => {
  const totals: Record<ItemEffectType, number> = {
    'ON_HIT_SLOW': 0, 'ON_HIT_STUN': 0, 'PASSIVE_REGEN': 0, 'THORNS': 0, 'CRIT_CHANCE': 0, 'LIFESTEAL': 0
  };
  const setCounts: Record<string, number> = {};
  const processItem = (item: Item | null) => {
    if (!item) return;
    if (item.effects) {
        item.effects.forEach(effect => { totals[effect.type] += effect.value; });
    }
    if (item.setName) setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
  };
  Object.values(agent.equipment).forEach(item => processItem(item));
  Object.entries(setCounts).forEach(([setName, count]) => {
      const setDef = ITEM_SETS[setName];
      if (!setDef) return;
      Object.entries(setDef).forEach(([thresholdStr, effects]) => {
          const threshold = parseInt(thresholdStr);
          if (count >= threshold) {
              effects.forEach(effect => { totals[effect.type] += effect.value; });
          }
      });
  });
  if (includeInventory) agent.inventory.forEach(item => processItem(item));
  return totals;
};

export const calculateItemRating = (item: Item | null | undefined): number => {
    if (!item) return 0;
    let rating = (item.stats.str || 0) + (item.stats.agi || 0) + (item.stats.int || 0) + (item.stats.vit || 0);
    rating += (item.stats.dmg || 0) * 2;
    rating += (item.experience || 0) * 0.1;
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
