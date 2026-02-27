
import { Chunk, POI, Monster, ResourceNode, MONSTER_TEMPLATES } from '../types';

/**
 * WorldBuildingService
 * Implements the 5 Axiomatic Rules for procedural world emergence.
 * Grounded in Field Theory and Logic with Plexity (Kappa 1.000).
 */
export class WorldBuildingService {
  
  /**
   * Generates content for a chunk based on its logic field and axiomatic data.
   */
  static generateAxiomaticContent(chunk: Chunk): {
    pois: POI[],
    monsters: Monster[],
    resources: ResourceNode[]
  } {
    const pois: POI[] = [];
    const monsters: Monster[] = [];
    const resources: ResourceNode[] = [];
    
    if (!chunk.logicField || !chunk.axiomaticData) return { pois, monsters, resources };

    const chunkWorldX = chunk.x * 80;
    const chunkWorldZ = chunk.z * 80;

    // Rule 1: Logic must persist (Field Theory Continuity)
    // We use the logicField strings to determine "stable" points for structures
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const force = chunk.logicField[i][j];
        const dataVal = chunk.axiomaticData[i][j];
        const magnitude = Math.hypot(force.vx, force.vz);
        
        const posX = chunkWorldX + (i * 10 - 35);
        const posZ = chunkWorldZ + (j * 10 - 35);

        // Rule 2: Data is sacred
        // High axiomatic data density leads to Shrines or Data Hubs
        if (dataVal > 0.85 && magnitude < 0.05) {
          pois.push({
            id: `poi-${chunk.id}-${i}-${j}`,
            type: 'SHRINE',
            position: [posX, 0, posZ],
            isDiscovered: false,
            discoveryRadius: 15,
            rewardInsight: 10,
            loreFragment: `Axiomatic Resonance detected at ${chunk.logicString}.`,
            threatLevel: 0.1
          });
        }

        // Rule 3: Entropy is the enemy
        // High force magnitude but low data density indicates "Glitch" areas where monsters spawn
        if (magnitude > 0.12 && dataVal < 0.3) {
          const mType = Math.random() > 0.8 ? 'GOBLIN' : 'SLIME';
          monsters.push({
            id: `m-${chunk.id}-${i}-${j}`,
            type: mType,
            name: `${mType === 'GOBLIN' ? 'Glitch Scavenger' : 'Entropy Slime'}`,
            position: [posX, 0, posZ],
            rotationY: Math.random() * Math.PI * 2,
            stats: { ...MONSTER_TEMPLATES[mType], maxHp: MONSTER_TEMPLATES[mType].hp },
            xpReward: MONSTER_TEMPLATES[mType].xp,
            state: 'IDLE',
            targetId: null,
            color: mType === 'GOBLIN' ? '#ef4444' : '#22c55e',
            scale: MONSTER_TEMPLATES[mType].scale
          });
        }

        // Rule 4: Connectivity is evolution
        // Medium force magnitude creates resource nodes (Iron, Silver, etc.)
        if (magnitude > 0.08 && magnitude < 0.12 && dataVal > 0.5) {
          const rType = dataVal > 0.8 ? 'SILVER_ORE' : dataVal > 0.6 ? 'IRON_ORE' : 'STONE';
          resources.push({
            id: `res-${chunk.id}-${i}-${j}`,
            type: rType as any,
            position: [posX, 0, posZ],
            amount: Math.floor(dataVal * 50)
          });
        }

        // Trees and Buildings based on Biome and Logic
        if (chunk.biome === 'FOREST' && dataVal > 0.4 && Math.random() < 0.3) {
           pois.push({
            id: `tree-${chunk.id}-${i}-${j}`,
            type: 'TREE',
            position: [posX, 0, posZ],
            isDiscovered: true,
            discoveryRadius: 5,
            rewardInsight: 1,
            threatLevel: 0
          });
        }

        if (chunk.biome === 'CITY' && dataVal > 0.6 && Math.random() < 0.2) {
           pois.push({
            id: `bldg-${chunk.id}-${i}-${j}`,
            type: 'BUILDING',
            position: [posX, 0, posZ],
            isDiscovered: true,
            discoveryRadius: 10,
            rewardInsight: 2,
            threatLevel: 0
          });
        }
        
        // Rule 5: Emergence is the goal (Hawking's Singularity)
        // Random chance for unique structures like Ruins or Dungeons in Wilderness
        if (chunk.cellType === 'WILDERNESS' && Math.random() < 0.01) {
           pois.push({
            id: `poi-emergent-${chunk.id}-${i}-${j}`,
            type: Math.random() > 0.5 ? 'DUNGEON' : 'RUIN',
            position: [posX, 0, posZ],
            isDiscovered: false,
            discoveryRadius: 20,
            rewardInsight: 25,
            threatLevel: 0.5
          });
        }
      }
    }

    return { pois, monsters, resources };
  }
}
