
import { Agent, AgentState, ResourceNode, LandParcel, POI, POIType, Monster } from './types';

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

export const calculateCombatHeuristics = (
    agent: Agent,
    nearbyMonsters: Monster[]
): { targetId: string | null, action: 'ATTACK' | 'DEFEND' | 'RETREAT' | 'ABILITY', reason: string } => {
    if (nearbyMonsters.length === 0) {
        return { targetId: null, action: 'ATTACK', reason: "Keine Feinde in Sicht." };
    }

    // 1. Target Prioritization
    // Prioritize monsters attacking us, then closest, then lowest HP
    const sortedMonsters = [...nearbyMonsters].sort((a, b) => {
        // If one is attacking us and the other isn't
        if (a.targetId === agent.id && b.targetId !== agent.id) return -1;
        if (b.targetId === agent.id && a.targetId !== agent.id) return 1;

        // Otherwise closest
        const distA = Math.hypot(a.position[0] - agent.position[0], a.position[2] - agent.position[2]);
        const distB = Math.hypot(b.position[0] - agent.position[0], b.position[2] - agent.position[2]);
        if (Math.abs(distA - distB) > 2) return distA - distB;

        // Otherwise lowest HP
        return a.stats.hp - b.stats.hp;
    });

    const target = sortedMonsters[0];
    const hpPercent = agent.stats.hp / agent.stats.maxHp;

    // 2. Defensive Maneuvers
    if (hpPercent < 0.25) {
        return { targetId: target.id, action: 'RETREAT', reason: "Kritischer Zustand. Rückzug eingeleitet." };
    }

    if (hpPercent < 0.5 && target.stats.atk > agent.stats.vit) {
        return { targetId: target.id, action: 'DEFEND', reason: "Verteidigungshaltung aufgrund hoher Schadensprognose." };
    }

    // 3. Ability Usage
    if (agent.energy > 40) {
        if (agent.stats.int > 15) {
            return { targetId: target.id, action: 'ABILITY', reason: "Neuraler Overload initiiert." };
        }
        if (agent.stats.str > 15) {
            return { targetId: target.id, action: 'ABILITY', reason: "Axiom-Schlag vorbereitet." };
        }
    }

    return { targetId: target.id, action: 'ATTACK', reason: `Greife ${target.name} an.` };
};

export const calculateAxiomaticWeightWithReason = (
    agent: Agent, 
    action: AgentState, 
    nearbyAgents: Agent[], 
    nearbyResources: ResourceNode[],
    allParcels: LandParcel[] = [],
    nearbyPOIs: POI[] = [],
    nearbyMonsters: Monster[] = []
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

        case AgentState.THINKING:
            const canExpand = agent.energy > 50 && agent.insightPoints > 10;
            if (canExpand) {
                baseUtility = 120 + (agent.consciousnessLevel * 100);
                reason = "Erweiterung des neuralen Netzwerks initiiert";
            } else {
                baseUtility = 10;
                reason = "Zu wenig Energie für tiefe Reflexion";
            }
            break;

        case AgentState.ASCENDING:
            const readyToAscend = agent.awakeningProgress > 80 || agent.consciousnessLevel > 0.8;
            if (readyToAscend) {
                baseUtility = 300;
                reason = "Transzendenz der aktuellen Form steht bevor";
            } else {
                baseUtility = -50;
                reason = "Noch nicht bereit für den Aufstieg";
            }
            break;

        case AgentState.COMBAT:
            if (nearbyMonsters.length > 0) {
                const threat = nearbyMonsters.some(m => m.targetId === agent.id) ? 2.0 : 1.0;
                baseUtility = 180 * threat * (agent.stats.hp / agent.stats.maxHp);
                reason = "Feindliche Entitäten in der Matrix lokalisiert.";
            } else {
                baseUtility = -50;
                reason = "Keine Kampfziele vorhanden.";
            }
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
    nearbyPOIs: POI[] = [],
    nearbyMonsters: Monster[] = []
): AxiomaticSummary => {
    const choices = [
        AgentState.IDLE, 
        AgentState.GATHERING, 
        AgentState.EXPLORING,
        AgentState.QUESTING,
        AgentState.THINKING,
        AgentState.BUILDING,
        AgentState.BANKING,
        AgentState.CRAFTING,
        AgentState.COMBAT
    ];

    const results = choices.map(c => {
        const { utility, reason } = calculateAxiomaticWeightWithReason(agent, c, nearbyAgents, nearbyResources, allParcels, nearbyPOIs, nearbyMonsters);
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
