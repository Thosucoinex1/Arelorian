
import { Agent, ResourceNode, AgentState, AXIOMS, ItemEffect, LandParcel } from './types';

// --- AXIOMATIC UTILITY ENGINE (AUE) ---

export interface AxiomaticSummary {
    choice: AgentState;
    utility: number;
    logic: string;
}

/**
 * Added ITEM_SETS for equipment set bonuses
 */
export const ITEM_SETS: Record<string, Record<number, ItemEffect[]>> = {
    'Voidweaver': {
        2: [{ description: 'Axiom Pulse: +10% Logic Efficiency', type: 'LOGIC', value: 10 }],
        4: [{ description: 'Singularity: Integrity recovers 2x faster', type: 'RECOVERY', value: 2 }]
    }
};

/**
 * Calculates the "Desire Weight" for an agent using neurologic mathematical grounding.
 * This is the core "Clever" logic that runs locally every tick.
 */
export const calculateAxiomaticWeight = (
    agent: Agent, 
    action: AgentState, 
    nearbyAgents: Agent[], 
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = []
): number => {
    // AXIOM 1: ENERGY - Capacity to manifest intent
    const K_ENERGY = agent.energy / (agent.maxEnergy || 100);
    // AXIOM 2: EROSION - Action + Time = ↑Korruption
    const K_INTEGRITY = agent.integrity || 1.0;
    // AXIOM 4: RECURSION - Outcome(t) depends on DNA & Environment entropy
    const K_RECURSION = (Math.sin(Date.now() * 0.0005 + agent.position[0] * 0.1) + 1.2) * 0.5;

    let baseUtility = 0;

    switch (action) {
        case AgentState.GATHERING:
            // U_gather = Sum(Skill * Value / Dist^1.2) * Energy * (1 - Inventory_Fullness)
            const activeInv = agent.inventory.filter(i => i).length;
            const invRatio = activeInv / (agent.inventory.length || 1);
            let resourceScore = 0;
            
            // Skill levels (default to 0 if undefined)
            const miningSkill = agent.skills.mining || 0;
            const woodSkill = agent.skills.woodcutting || 0;
            const gatheringSkill = agent.skills.gathering || 1;

            nearbyResources.forEach(res => {
                const dist = Math.hypot(res.position[0] - agent.position[0], res.position[2] - agent.position[2]);
                
                // --- SKILL RELEVANCE LOGIC ---
                let relevance = 1; // Base relevance
                
                if (res.type.includes('ORE') || res.type.includes('STONE')) {
                    // Miners prefer ore/stone heavily
                    relevance = 1 + (miningSkill * 3);
                } else if (res.type.includes('WOOD') || res.type.includes('TREE')) {
                    // Woodcutters prefer wood heavily
                    relevance = 1 + (woodSkill * 3);
                } else {
                    // General gathering applies to herbs/relics
                    relevance = 1 + gatheringSkill;
                }

                // Scarcity bonus (simulated): Rare resources are more attractive
                if (res.type === 'GOLD_ORE' || res.type === 'ANCIENT_RELIC') relevance *= 2.5;

                if (dist < 120) {
                    // Distance decay
                    resourceScore += (relevance * 100) / (dist + 1);
                }
            });
            
            // If skilled, highly motivated to gather even if energy is mid
            // If inventory full, desire drops to near zero
            baseUtility += (resourceScore * 0.1 * (1.1 - invRatio) * (K_ENERGY + 0.5));
            break;

        case AgentState.BUILDING:
            // Check if agent already owns land
            const ownsLand = allParcels.some(p => p.ownerId === agent.id);
            const hasGold = agent.gold > 300;
            const landAvailable = allParcels.some(p => p.ownerId === null);
            
            if (!ownsLand && hasGold && landAvailable) {
                // High urge to settle if rich and homeless
                baseUtility += 200 * K_INTEGRITY; 
            } else if (ownsLand) {
                // If already owns land, utility is low (unless upgrading - future feature)
                baseUtility -= 50; 
            }
            break;

        case AgentState.ALLIANCE_FORMING:
            // U_social = (1 - SoulDensity) * Density * Integrity * Alignment_Force
            const socialDensity = nearbyAgents.filter(a => a.id !== agent.id && (a.faction === 'PLAYER' || a.faction === 'NPC')).length;
            if (socialDensity > 0) {
                const alignmentForce = 1.0 - Math.abs(agent.thinkingMatrix.alignment);
                // Agents with low integrity seek alliances for stability
                const desperation = 1.0 - K_INTEGRITY;
                baseUtility += (socialDensity * 45 * (1.2 - agent.soulDensity) * alignmentForce) + (desperation * 100);
            }
            break;

        case AgentState.QUESTING:
             // Organic Questing Logic: Driven by Need
             const goldNeed = agent.gold < 150 ? 50 : 0;
             const ambition = agent.soulDensity * 80;
             const boredom = (1.0 - K_RECURSION) * 20; // High entropy = desire for novelty
             
             // High level agents create content for others
             baseUtility += ambition + goldNeed + boredom + (agent.level * 3);
             
             // Healthy agents explore
             if (K_INTEGRITY > 0.8) baseUtility += 20; 
             break;

        case AgentState.THINKING:
            // Recursive routine: evaluate world logic when stability is low or internal erosion is high
            // U_think = (1 - Integrity) * 120
            baseUtility += (1.1 - K_INTEGRITY) * 120;
            break;

        case AgentState.IDLE:
            // Restore energy baseline + restore erosion
            baseUtility = (1.1 - K_ENERGY) * 40 + (1.1 - K_INTEGRITY) * 20 + 15;
            break;
            
        case AgentState.TRADING:
            // Commercial desire based on inventory fullness and gold scarcity
            const invCount = agent.inventory.filter(i => i).length;
            const fullInvPressure = (invCount / 10) * 100; // 0 to 100 utility based on fullness
            const goldScarcity = agent.gold < 200 ? 50 : 0;
            
            baseUtility += fullInvPressure + goldScarcity;
            break;

        default:
            baseUtility = 0;
    }

    // Mathematical Grounding: Final Utility = (Base * Recursion) + Stochastic Entropy
    return (baseUtility * K_RECURSION) + (Math.random() * 6);
};

/**
 * Summarizes the neurologic choice into a logical string for the UI.
 */
export const summarizeNeurologicChoice = (
    agent: Agent,
    nearbyAgents: Agent[],
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = []
): AxiomaticSummary => {
    const choices = [
        AgentState.IDLE, 
        AgentState.GATHERING, 
        AgentState.ALLIANCE_FORMING, 
        AgentState.TRADING, 
        AgentState.THINKING,
        AgentState.QUESTING,
        AgentState.BUILDING
    ];

    const results = choices.map(c => ({
        choice: c,
        utility: calculateAxiomaticWeight(agent, c, nearbyAgents, nearbyResources, allParcels)
    })).sort((a, b) => b.utility - a.utility);

    const best = results[0];
    const second = results[1];
    
    const diff = (best.utility - second.utility).toFixed(2);
    const logic = `[AUE v4.5]: ${best.choice} (U=${best.utility.toFixed(1)}) | Δ=${diff} | E:${(agent.energy).toFixed(0)} I:${agent.integrity.toFixed(2)}`;

    return { ...best, logic };
};

// --- WORLD GENERATION UTILS ---

export const getBiomeForChunk = (x: number, z: number): string => {
    if (x === 0 && z === 0) return 'CITY';
    const val = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    if (val < 0.35) return 'FOREST';
    if (val < 0.60) return 'MOUNTAIN';
    return 'PLAINS';
};
