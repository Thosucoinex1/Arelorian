export const KAPPA = 1000;
export const CHUNK_SIZE = 16;
export const TICK_INTERVAL_MS = 600;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function perlinHash(x: number, y: number, seed: number): number {
  const rng = seededRandom(seed + x * 73856093 + y * 19349663);
  const n1 = rng();
  const n2 = rng();
  const n3 = rng();
  const n4 = rng();
  return (n1 + n2 + n3 + n4) / 4;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = perlinHash(ix, iy, seed);
  const n10 = perlinHash(ix + 1, iy, seed);
  const n01 = perlinHash(ix, iy + 1, seed);
  const n11 = perlinHash(ix + 1, iy + 1, seed);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

export function perlinNoise(seed: number, x: number, y: number, octaves = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxVal = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency * 0.1, y * frequency * 0.1, seed + i * 1000) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxVal;
}

export function resourceGradient(x: number, y: number, seed: number): number {
  const rng = seededRandom(seed + x * 31337 + y * 7919);
  const dist = Math.sqrt(x * x + y * y);
  return rng() * Math.exp(-dist / (KAPPA * 0.5)) * 2;
}

export function terrainHeight(seed: number, x: number, y: number): number {
  return perlinNoise(seed, x, y) * Math.log(KAPPA) + resourceGradient(x, y, seed);
}

export function biomeSelection(x: number, y: number, seed: number): string {
  const biomes = ['PLAINS', 'FOREST', 'MOUNTAIN', 'DESERT', 'SWAMP', 'CITY', 'TUNDRA'];
  const features: number[] = biomes.map((_, i) => {
    const offset = i * 999;
    return perlinNoise(seed + offset, x * 0.3, y * 0.3) * 10;
  });

  const expValues = features.map(f => Math.exp(f / KAPPA));
  const sumExp = expValues.reduce((a, b) => a + b, 0);
  const probabilities = expValues.map(e => e / sumExp);

  let maxIdx = 0;
  let maxProb = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      maxIdx = i;
    }
  }

  return biomes[maxIdx];
}

export function resourceDecay(
  r0: number,
  extractionRate: number,
  timeDelta: number
): number {
  return r0 * Math.exp(-(extractionRate * timeDelta) / KAPPA);
}

export function dungeonProbability(
  heightValue: number,
  mean = 5.0,
  sigma = 1.5
): number {
  return 1 / (1 + Math.exp(-(heightValue - mean) / sigma));
}

export function marketPrice(
  basePrice: number,
  demand: number,
  supply: number
): number {
  if (supply <= 0) supply = 0.001;
  return basePrice * Math.pow(demand / supply, 1 / KAPPA);
}

export function trustScore(
  positiveInteractions: number,
  negativeInteractions: number,
  timeSinceLastInteraction: number,
  reputationWeight: number
): number {
  const rawTrust = positiveInteractions - negativeInteractions;
  const decayedTrust = rawTrust * Math.exp(-timeSinceLastInteraction / KAPPA);
  return decayedTrust + reputationWeight;
}

export function decisionFunction(
  skillGain: number,
  goldGain: number,
  safetyIndex: number
): number {
  return skillGain + goldGain + safetyIndex;
}

export function selectBestGoal(
  options: Array<{ name: string; skillGain: number; goldGain: number; safetyIndex: number }>
): { name: string; score: number } {
  let best = { name: 'IDLE', score: -Infinity };
  for (const opt of options) {
    const score = decisionFunction(opt.skillGain, opt.goldGain, opt.safetyIndex);
    if (score > best.score) {
      best = { name: opt.name, score };
    }
  }
  return best;
}

export function generateChunkSeed(worldSeed: number, chunkX: number, chunkZ: number): number {
  return (worldSeed * 73856093 + chunkX * 19349663 + chunkZ * 83492791) & 0x7FFFFFFF;
}

export function chunkResources(seed: number, x: number, z: number): Record<string, number> {
  const rng = seededRandom(seed + x * 997 + z * 991);
  const height = terrainHeight(seed, x, z);
  const biome = biomeSelection(x, z, seed);

  const resources: Record<string, number> = {
    WOOD: 0, STONE: 0, IRON_ORE: 0, SILVER_ORE: 0,
    GOLD_ORE: 0, DIAMOND: 0, ANCIENT_RELIC: 0, SUNLEAF_HERB: 0
  };

  switch (biome) {
    case 'FOREST':
      resources.WOOD = Math.floor(rng() * 50 + 30);
      resources.SUNLEAF_HERB = Math.floor(rng() * 20 + 5);
      break;
    case 'MOUNTAIN':
      resources.STONE = Math.floor(rng() * 60 + 20);
      resources.IRON_ORE = Math.floor(rng() * 30 + 10);
      resources.SILVER_ORE = Math.floor(rng() * 15 + 2);
      resources.GOLD_ORE = Math.floor(rng() * 8);
      resources.DIAMOND = height > 7 ? Math.floor(rng() * 3) : 0;
      break;
    case 'PLAINS':
      resources.WOOD = Math.floor(rng() * 20 + 5);
      resources.STONE = Math.floor(rng() * 15 + 5);
      resources.SUNLEAF_HERB = Math.floor(rng() * 15 + 3);
      break;
    case 'DESERT':
      resources.STONE = Math.floor(rng() * 30 + 10);
      resources.GOLD_ORE = Math.floor(rng() * 10 + 2);
      resources.ANCIENT_RELIC = rng() > 0.8 ? Math.floor(rng() * 3 + 1) : 0;
      break;
    case 'CITY':
      resources.ANCIENT_RELIC = Math.floor(rng() * 5 + 1);
      break;
    default:
      resources.WOOD = Math.floor(rng() * 15);
      resources.STONE = Math.floor(rng() * 15);
      break;
  }

  return resources;
}
