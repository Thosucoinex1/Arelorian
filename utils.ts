
import { Agent, AgentState, ResourceNode, LandParcel } from './types';

// --- AXIOMATIC UTILITY ENGINE (AUE) ---

export interface AxiomaticSummary {
    choice: AgentState;
    utility: number;
    logic: string;
    reason: string; // Added for personality-driven text
}

export const ITEM_SETS: Record<string, Record<number, any[]>> = {
    'Voidweaver': {
        2: [{ description: 'Axiom Pulse: +10% Logic Efficiency', type: 'LOGIC', value: 10 }],
        4: [{ description: 'Singularity: Integrity recovers 2x faster', type: 'RECOVERY', value: 2 }]
    }
};

/**
 * Returns a weight and a human-readable reason for an action.
 */
export const calculateAxiomaticWeightWithReason = (
    agent: Agent, 
    action: AgentState, 
    nearbyAgents: Agent[], 
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = []
): { utility: number, reason: string } => {
    const K_ENERGY = agent.energy / (agent.maxEnergy || 100);
    const K_INTEGRITY = agent.integrity || 1.0;
    const K_RECURSION = (Math.sin(Date.now() * 0.0005 + agent.position[0] * 0.1) + 1.2) * 0.5;

    let baseUtility = 0;
    let reason = "Routine Evaluation";

    switch (action) {
        case AgentState.GATHERING:
            const activeInv = agent.inventory.filter(i => i).length;
            const invRatio = activeInv / (agent.inventory.length || 1);
            let resourceScore = 0;
            
            const miningSkill = agent.skills.mining || 0;
            const woodSkill = agent.skills.woodcutting || 0;

            nearbyResources.forEach(res => {
                const dist = Math.hypot(res.position[0] - agent.position[0], res.position[2] - agent.position[2]);
                let relevance = 1; 
                if (res.type.includes('ORE') || res.type.includes('STONE')) relevance = 1 + (miningSkill * 3);
                else if (res.type.includes('WOOD') || res.type.includes('TREE')) relevance = 1 + (woodSkill * 3);
                if (dist < 120) resourceScore += (relevance * 100) / (dist + 1);
            });
            
            baseUtility += (resourceScore * 0.1 * (1.1 - invRatio) * (K_ENERGY + 0.5));
            reason = invRatio > 0.8 ? "Inventar fast voll" : "Ressourcen in der Nähe entdeckt";
            break;

        case AgentState.BUILDING:
            const ownsLand = allParcels.some(p => p.ownerId === agent.id);
            const hasGold = agent.gold > 300;
            const landAvailable = allParcels.some(p => p.ownerId === null);
            
            if (!ownsLand && hasGold && landAvailable) {
                baseUtility += 200 * K_INTEGRITY; 
                reason = "zu viel Gold im Beutel und kein festes Dach";
            } else if (ownsLand) {
                baseUtility -= 50; 
                reason = "bereits sesshaft";
            }
            break;

        case AgentState.ALLIANCE_FORMING:
            const socialDensity = nearbyAgents.filter(a => a.id !== agent.id && (a.faction === 'PLAYER' || a.faction === 'NPC')).length;
            if (socialDensity > 0) {
                const alignmentForce = 1.0 - Math.abs(agent.thinkingMatrix.alignment);
                const desperation = 1.0 - K_INTEGRITY;
                baseUtility += (socialDensity * 45 * (1.2 - agent.soulDensity) * alignmentForce) + (desperation * 100);
                reason = desperation > 0.4 ? "Angst vor der Einsamkeit und Zerfall" : "Suche nach kollektiver Stärke";
            }
            break;

        case AgentState.QUESTING:
             const goldNeed = agent.gold < 150 ? 50 : 0;
             const ambition = agent.soulDensity * 80;
             baseUtility += ambition + goldNeed + (agent.level * 3);
             reason = goldNeed > 0 ? "Goldreserven sind kritisch niedrig" : "Drang nach Heldentaten";
             break;

        case AgentState.THINKING:
            baseUtility += (1.1 - K_INTEGRITY) * 120;
            reason = "die Realität scheint instabil zu werden";
            break;

        case AgentState.IDLE:
            baseUtility = (1.1 - K_ENERGY) * 40 + (1.1 - K_INTEGRITY) * 20 + 15;
            reason = "Erschöpfung der neuralen Pfade";
            break;
            
        case AgentState.TRADING:
            const invCount = agent.inventory.filter(i => i).length;
            baseUtility += (invCount / 10) * 100 + (agent.gold < 200 ? 50 : 0);
            reason = invCount > 5 ? "Handelswaren müssen veräußert werden" : "Profitgier";
            break;

        default:
            baseUtility = 0;
    }

    return { utility: (baseUtility * K_RECURSION) + (Math.random() * 6), reason };
};

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

    const results = choices.map(c => {
        const { utility, reason } = calculateAxiomaticWeightWithReason(agent, c, nearbyAgents, nearbyResources, allParcels);
        return { choice: c, utility, reason };
    }).sort((a, b) => b.utility - a.utility);

    const best = results[0];
    const logic = `[AUE]: ${best.choice} Reason: ${best.reason}`;

    return { ...best, logic };
};

export const getBiomeForChunk = (x: number, z: number): string => {
    if (x === 0 && z === 0) return 'CITY';
    const val = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    if (val < 0.35) return 'FOREST';
    if (val < 0.60) return 'MOUNTAIN';
    return 'PLAINS';
};
