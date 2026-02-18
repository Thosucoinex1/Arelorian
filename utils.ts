
import { Agent, AgentState, ResourceNode, LandParcel, POI, POIType } from './types';

// --- AXIOMATIC UTILITY ENGINE (AUE) ---

export interface AxiomaticSummary {
    choice: AgentState;
    utility: number;
    logic: string;
    reason: string;
}

export const LORE_POOL = [
  "Die Matrix wurde auf den Ruinen einer alten Welt erbaut.",
  "Ein flüsterndes Signal in den Bergen spricht von der 'Großen Rekursion'.",
  "Petra Markgraf wird als Bewahrerin der ersten Axiome geehrt.",
  "Die Korruption frisst sich durch die unbewachten Sektoren.",
  "Nur wer erwacht, kann die Fäden des Ouroboros sehen.",
  "In den Höhlen ruhen Datenfragmente vergessener Seelen.",
  "Stabilität ist eine Illusion der Beobachter."
];

export const ITEM_SETS: Record<string, Record<number, any[]>> = {
    'Voidweaver': {
        2: [{ description: 'Axiom Pulse: +10% Logic Efficiency', type: 'LOGIC', value: 10 }],
        4: [{ description: 'Singularity: Integrity recovers 2x faster', type: 'RECOVERY', value: 2 }]
    }
};

// RPG Progression Utilities
export const getXPForNextLevel = (currentLevel: number): number => {
    // exponential: 100 * 1.5^(lvl-1)
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
};

export const getSkillEfficiency = (level: number): number => {
    // Linear efficiency increase: 1.0 + 0.1 per level
    return 1.0 + (level - 1) * 0.1;
};

export const generateProceduralPOIs = (count: number, minDistance: number = 30): POI[] => {
  const pois: POI[] = [];
  const types: POIType[] = ['MINE', 'FOREST', 'DUNGEON', 'RUIN', 'SHRINE', 'NEST', 'BANK_VAULT', 'FORGE'];
  
  // Always ensure a Bank and a Forge in the City (0,0)
  pois.push({
      id: 'poi_bank_central',
      type: 'BANK_VAULT',
      position: [5, 0, -5],
      isDiscovered: true,
      discoveryRadius: 20,
      rewardInsight: 0,
      threatLevel: 0
  });

  pois.push({
    id: 'poi_forge_central',
    type: 'FORGE',
    position: [-5, 0, 5],
    isDiscovered: true,
    discoveryRadius: 20,
    rewardInsight: 0,
    threatLevel: 0
});

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * 200;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    pois.push({
      id: `poi_${Date.now()}_${i}`,
      type,
      position: [x, 0, z],
      isDiscovered: false,
      discoveryRadius: type === 'NEST' ? 15 : 10,
      rewardInsight: Math.floor(Math.random() * 15) + 5,
      loreFragment: type === 'RUIN' ? LORE_POOL[Math.floor(Math.random() * LORE_POOL.length)] : undefined,
      threatLevel: type === 'NEST' || type === 'DUNGEON' ? 0.6 : 0.1
    });
  }
  
  return pois;
};

export const calculateAxiomaticWeightWithReason = (
    agent: Agent, 
    action: AgentState, 
    nearbyAgents: Agent[], 
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = [],
    nearbyPOIs: POI[] = []
): { utility: number, reason: string } => {
    const K_ENERGY = agent.energy / (agent.maxEnergy || 100);
    const K_INTEGRITY = agent.integrity || 1.0;
    const K_RECURSION = (Math.sin(Date.now() * 0.0005 + agent.position[0] * 0.1) + 1.2) * 0.5;

    let baseUtility = 0;
    let reason = "Routine Evaluation";

    const invCount = agent.inventory.filter(i => i).length;
    const bankCount = agent.bank.filter(i => i).length;

    switch (action) {
        case AgentState.BANKING:
            if (invCount >= 8) {
                baseUtility = 200;
                reason = "Inventar fast voll. Suche Bank auf.";
            } else if (bankCount >= 45) {
                baseUtility = 250;
                reason = "Banklager am Limit. Logistik-Bereinigung erforderlich.";
            }
            break;

        case AgentState.EXPLORING:
            const curio = agent.thinkingMatrix.sociability || 0.5;
            const undiscoveredPOIs = nearbyPOIs.filter(p => !p.isDiscovered);
            if (undiscoveredPOIs.length > 0) {
              baseUtility = 150 * curio;
              reason = "Unbekannte Signale in der Matrix entdeckt";
            } else {
              baseUtility = 30;
              reason = "Suche nach neuen Horizonten";
            }
            break;

        case AgentState.GATHERING:
            if (invCount >= 10) {
                baseUtility = -100; // Cannot gather if full
            } else {
                let resourceScore = 0;
                nearbyResources.forEach(res => {
                    const dist = Math.hypot(res.position[0] - agent.position[0], res.position[2] - agent.position[2]);
                    if (dist < 120) resourceScore += 100 / (dist + 1);
                });
                baseUtility += (resourceScore * 0.1 * (1.1 - (invCount/10)) * (K_ENERGY + 0.5));
                reason = "Ressourcen in der Nähe entdeckt";
            }
            break;

        case AgentState.CRAFTING:
            const canCraft = bankCount > 5 || invCount > 5;
            if (canCraft) {
                baseUtility = 100 + (agent.skills['crafting']?.level || 1) * 10;
                reason = "Materialien für Produktion vorhanden.";
            }
            break;

        case AgentState.QUESTING:
             const insightNeed = agent.insightPoints < 50 ? 60 : 20;
             baseUtility += insightNeed + (agent.level * 3);
             reason = "Suche nach tieferer Matrix-Erkenntnis";
             break;

        case AgentState.IDLE:
            baseUtility = (1.1 - K_ENERGY) * 40 + (1.1 - K_INTEGRITY) * 20 + 15;
            reason = "Erschöpfung der neuralen Pfade";
            break;

        default:
            baseUtility = 10;
    }

    return { utility: (baseUtility * K_RECURSION) + (Math.random() * 6), reason };
};

export const summarizeNeurologicChoice = (
    agent: Agent,
    nearbyAgents: Agent[],
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = [],
    nearbyPOIs: POI[] = []
): AxiomaticSummary => {
    const choices = [
        AgentState.IDLE, 
        AgentState.GATHERING, 
        AgentState.EXPLORING,
        AgentState.QUESTING,
        AgentState.THINKING,
        AgentState.BUILDING,
        AgentState.BANKING,
        AgentState.CRAFTING
    ];

    const results = choices.map(c => {
        const { utility, reason } = calculateAxiomaticWeightWithReason(agent, c, nearbyAgents, nearbyResources, allParcels, nearbyPOIs);
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
