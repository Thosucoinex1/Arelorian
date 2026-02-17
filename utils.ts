
import { Agent, Item, ItemEffectType, ItemEffect, LandParcel, ResourceNode, ResourceType, AgentState, Chunk } from './types';

// --- AXIOMATIC NEUROLOGIC ENGINE (ANE) ---

export interface AxiomaticSummary {
    choice: AgentState;
    utility: number;
    logic: string;
}

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
    // Fundamental Constants of the Ouroboros Simulation
    const K_STABILITY = agent.stabilityIndex || 1.0;
    const K_SOUL = agent.soulDensity || 0.5;
    // Chaotic vibration constant based on DNA hash and time
    const K_ENTROPY = (Math.sin(Date.now() * 0.0005 + agent.position[0]) + 1.2) * 0.5; // range [0.1, 1.1]

    let baseUtility = 0;

    switch (action) {
        case AgentState.GATHERING:
            // U_gather = Sum(Skill_bonus / Dist^1.2) * (1 - Inventory_Fullness)
            const activeInv = agent.inventory.filter(i => i).length;
            const invRatio = activeInv / (agent.inventory.length || 1);
            nearbyResources.forEach(res => {
                const dist = Math.hypot(res.position[0] - agent.position[0], res.position[2] - agent.position[2]);
                const skillName = res.type.toLowerCase();
                const skillBonus = (agent.skills[skillName] || 1);
                if (dist < 60) {
                    // Non-linear utility dropoff by distance
                    baseUtility += (Math.pow(60 - dist, 1.2) * skillBonus * (1.1 - invRatio));
                }
            });
            break;

        case AgentState.ALLIANCE_FORMING:
            // U_social = (1 - K_Soul) * Nearby_Density * Alignment_Force
            const socialDensity = nearbyAgents.filter(a => a.id !== agent.id && a.faction === 'PLAYER').length;
            if (socialDensity > 0) {
                // Agents seek others when soul density is low or alignment is neutral/positive
                const alignmentForce = 1.0 - Math.abs(agent.thinkingMatrix.alignment);
                baseUtility += (socialDensity * 30 * (1.1 - K_SOUL) * alignmentForce);
            }
            break;

        case AgentState.TRADING:
            // U_trade = (Inv_Count * 15) + (Gold_Pressure)
            const count = agent.inventory.filter(i => i).length;
            const goldNeed = agent.gold < 150 ? 60 : 0;
            baseUtility += (count * 15) + goldNeed;
            break;

        case AgentState.ASCENDING:
            // High level requirement + Soul maturity requirement
            if (agent.level >= 5) {
                baseUtility += (agent.level * 5) + (K_SOUL * 50);
            }
            break;

        case AgentState.THINKING:
            // Neurologic routine: evaluate world logic when stability is fluctuating or internal entropy is high
            baseUtility += (1.1 - K_STABILITY) * 70;
            break;

        case AgentState.IDLE:
            baseUtility = 20; // Natural baseline noise
            break;
            
        default:
            baseUtility = 0;
    }

    // Mathematical Grounding: Final Utility = (Base * Entropy) + Stochastic Variance
    return (baseUtility * K_ENTROPY) + (Math.random() * 8);
};

/**
 * Generates a summary of why a choice was made based on axiomatic values.
 */
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
    
    // Mathematical logic summary string for "Logic with Plexity" reporting
    const diff = (best.utility - second.utility).toFixed(2);
    const logic = `U(${best.choice})=${best.utility.toFixed(1)} >> U(${second.choice}) | Δ=${diff} | Ω:${agent.stabilityIndex.toFixed(3)}`;

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

// FIX: Added missing stats and closed function body properly
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

// FIX: Exported ITEM_SETS to be used in CharacterSheet component
export const ITEM_SETS: Record<string, Record<number, ItemEffect[]>> = {
    'Axiomatic': {
        2: [{ type: 'PASSIVE_REGEN', value: 5, description: 'Axiomatic Resonance: +5 HP Regen' }],
        4: [{ type: 'CRIT_CHANCE', value: 0.1, description: 'Axiomatic Focus: +10% Crit Chance' }]
    }
};
