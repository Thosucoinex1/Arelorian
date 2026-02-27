
import { Chunk, POI, Monster, ResourceNode, MONSTER_TEMPLATES } from '../types';

export class WorldBuildingService {
  
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
    const isSanctuary = chunk.cellType === 'SANCTUARY' || chunk.biome === 'CITY';

    if (isSanctuary) {
      pois.push({
        id: `city-forge-${chunk.id}`,
        type: 'BUILDING',
        position: [chunkWorldX + 15, 0, chunkWorldZ + 10],
        isDiscovered: true,
        discoveryRadius: 10,
        rewardInsight: 2,
        loreFragment: 'The Forge — repair and craft equipment here.',
        threatLevel: 0
      });
      pois.push({
        id: `city-market-${chunk.id}`,
        type: 'MARKET_STALL',
        position: [chunkWorldX - 12, 0, chunkWorldZ + 8],
        isDiscovered: true,
        discoveryRadius: 10,
        rewardInsight: 2,
        loreFragment: 'Central Market — trade resources and gear.',
        threatLevel: 0
      });
      pois.push({
        id: `city-bank-${chunk.id}`,
        type: 'BUILDING',
        position: [chunkWorldX + 20, 0, chunkWorldZ - 15],
        isDiscovered: true,
        discoveryRadius: 10,
        rewardInsight: 2,
        loreFragment: 'Axiom Bank — store your valuables safely.',
        threatLevel: 0
      });
      pois.push({
        id: `city-shrine-${chunk.id}`,
        type: 'SHRINE',
        position: [chunkWorldX, 0, chunkWorldZ],
        isDiscovered: true,
        discoveryRadius: 15,
        rewardInsight: 5,
        loreFragment: 'The Nexus Shrine — center of all axioms.',
        threatLevel: 0
      });
      pois.push({
        id: `city-tree1-${chunk.id}`,
        type: 'TREE',
        position: [chunkWorldX - 25, 0, chunkWorldZ - 20],
        isDiscovered: true,
        discoveryRadius: 5,
        rewardInsight: 1,
        threatLevel: 0
      });
      pois.push({
        id: `city-tree2-${chunk.id}`,
        type: 'TREE',
        position: [chunkWorldX + 28, 0, chunkWorldZ + 22],
        isDiscovered: true,
        discoveryRadius: 5,
        rewardInsight: 1,
        threatLevel: 0
      });
      pois.push({
        id: `city-tree3-${chunk.id}`,
        type: 'TREE',
        position: [chunkWorldX - 30, 0, chunkWorldZ + 25],
        isDiscovered: true,
        discoveryRadius: 5,
        rewardInsight: 1,
        threatLevel: 0
      });

      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const dataVal = chunk.axiomaticData[i][j];
          const posX = chunkWorldX + (i * 10 - 35);
          const posZ = chunkWorldZ + (j * 10 - 35);

          if (dataVal > 0.6 && Math.random() < 0.25) {
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
        }
      }

      return { pois, monsters, resources };
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const force = chunk.logicField[i][j];
        const dataVal = chunk.axiomaticData[i][j];
        const magnitude = Math.hypot(force.vx, force.vz);
        
        const posX = chunkWorldX + (i * 10 - 35);
        const posZ = chunkWorldZ + (j * 10 - 35);

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

        if (magnitude > 0.12 && dataVal < 0.3) {
          const chunkDist = Math.hypot(chunk.x, chunk.z);
          const roll = Math.random();
          const mType = (roll > 0.85 && chunkDist >= 4) ? 'DRAGON' : (roll > 0.6 && chunkDist >= 2) ? 'ORC' : roll > 0.35 ? 'GOBLIN' : 'SLIME';
          const nameMap: Record<string, string> = {
            'GOBLIN': 'Glitch Scavenger',
            'SLIME': 'Entropy Slime',
            'ORC': 'Corrupted Brute',
            'DRAGON': 'Entropy Drake'
          };
          const colorMap: Record<string, string> = {
            'GOBLIN': '#ef4444',
            'SLIME': '#22c55e',
            'ORC': '#a855f7',
            'DRAGON': '#f97316'
          };
          const template = MONSTER_TEMPLATES[mType] || MONSTER_TEMPLATES['GOBLIN'];
          monsters.push({
            id: `m-${chunk.id}-${i}-${j}`,
            type: mType,
            name: nameMap[mType] || mType,
            position: [posX, 0, posZ],
            rotationY: Math.random() * Math.PI * 2,
            stats: { ...template, maxHp: template.hp },
            xpReward: template.xp,
            state: 'IDLE',
            targetId: null,
            color: colorMap[mType] || '#ef4444',
            scale: template.scale
          });
        }

        if (magnitude > 0.08 && magnitude < 0.12 && dataVal > 0.5) {
          const rType = dataVal > 0.8 ? 'SILVER_ORE' : dataVal > 0.6 ? 'IRON_ORE' : 'STONE';
          resources.push({
            id: `res-${chunk.id}-${i}-${j}`,
            type: rType as any,
            position: [posX, 0, posZ],
            amount: Math.floor(dataVal * 50)
          });
        }

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

        if (chunk.biome === 'MOUNTAIN' && dataVal > 0.3 && magnitude > 0.06 && Math.random() < 0.1) {
          pois.push({
            id: `dungeon-${chunk.id}-${i}-${j}`,
            type: 'DUNGEON',
            position: [posX, 0, posZ],
            isDiscovered: false,
            discoveryRadius: 25,
            rewardInsight: 30,
            threatLevel: 0.6
          });
        }

        if (chunk.biome === 'FOREST' && dataVal > 0.4 && magnitude > 0.05 && Math.random() < 0.08) {
          pois.push({
            id: `dungeon-${chunk.id}-${i}-${j}`,
            type: 'DUNGEON',
            position: [posX, 0, posZ],
            isDiscovered: false,
            discoveryRadius: 25,
            rewardInsight: 25,
            threatLevel: 0.5
          });
        }

        if (chunk.cellType === 'WILDERNESS' && Math.random() < 0.015) {
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
