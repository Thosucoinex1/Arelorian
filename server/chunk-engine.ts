import {
  CHUNK_SIZE, KAPPA, terrainHeight, biomeSelection,
  dungeonProbability, chunkResources, generateChunkSeed, resourceDecay, perlinNoise
} from './math-engine.js';
import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';

const WORLD_SEED = 42;

export interface ChunkData {
  chunk_id?: string;
  x: number;
  z: number;
  seed: number;
  biome: string;
  terrain_height: number;
  entropy: number;
  stability_index: number;
  corruption_level: number;
  resource_data: Record<string, number>;
  logic_field: Array<{ vx: number; vz: number; magnitude: number }>;
  dungeon_probability: number;
  entities: any[];
}

export function generateChunk(chunkX: number, chunkZ: number): ChunkData {
  const seed = generateChunkSeed(WORLD_SEED, chunkX, chunkZ);
  const height = terrainHeight(seed, chunkX, chunkZ);
  const biome = biomeSelection(chunkX, chunkZ, seed);
  const resources = chunkResources(seed, chunkX, chunkZ);
  const dungeonProb = dungeonProbability(height);

  const logicField: Array<{ vx: number; vz: number; magnitude: number }> = [];
  for (let lx = 0; lx < 4; lx++) {
    for (let lz = 0; lz < 4; lz++) {
      const px = chunkX * CHUNK_SIZE + lx * (CHUNK_SIZE / 4);
      const pz = chunkZ * CHUNK_SIZE + lz * (CHUNK_SIZE / 4);
      const vx = (perlinNoise(seed + 100, px, pz) - 0.5) * 2;
      const vz = (perlinNoise(seed + 200, px, pz) - 0.5) * 2;
      logicField.push({ vx, vz, magnitude: Math.sqrt(vx * vx + vz * vz) });
    }
  }

  const avgMagnitude = logicField.reduce((s, v) => s + v.magnitude, 0) / logicField.length;
  const entropy = 1 - avgMagnitude;
  const stability = Math.max(0, Math.min(1, 1 - entropy * 0.5));
  const corruption = Math.max(0, entropy - 0.5) * 2;

  return {
    x: chunkX,
    z: chunkZ,
    seed,
    biome,
    terrain_height: height,
    entropy,
    stability_index: stability,
    corruption_level: corruption,
    resource_data: resources,
    logic_field: logicField,
    dungeon_probability: dungeonProb,
    entities: []
  };
}

export async function loadOrGenerateChunk(chunkX: number, chunkZ: number): Promise<ChunkData> {
  if (isDbAvailable()) {
    const existing = await queryDb(
      'SELECT * FROM chunks WHERE x = $1 AND z = $2',
      [chunkX, chunkZ]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
  }

  const chunk = generateChunk(chunkX, chunkZ);

  if (isDbAvailable()) {
    await queryDb(
      `INSERT INTO chunks (x, z, seed, biome, terrain_height, entropy, stability_index, corruption_level, resource_data, logic_field, dungeon_probability, entities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (x, z) DO NOTHING`,
      [chunk.x, chunk.z, chunk.seed, chunk.biome, chunk.terrain_height,
       chunk.entropy, chunk.stability_index, chunk.corruption_level,
       JSON.stringify(chunk.resource_data), JSON.stringify(chunk.logic_field),
       chunk.dungeon_probability, JSON.stringify(chunk.entities)]
    );
  }

  return chunk;
}

export async function getChunksInRadius(centerX: number, centerZ: number, radius: number): Promise<ChunkData[]> {
  const chunks: ChunkData[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      chunks.push(await loadOrGenerateChunk(centerX + dx, centerZ + dz));
    }
  }
  return chunks;
}

export async function extractResource(
  chunkX: number, chunkZ: number,
  resourceType: string, amount: number
): Promise<{ success: boolean; extracted: number }> {
  if (!isDbAvailable()) {
    return { success: false, extracted: 0 };
  }

  return withTransaction(async (client) => {
    const res = await client.query(
      'SELECT resource_data FROM chunks WHERE x = $1 AND z = $2 FOR UPDATE',
      [chunkX, chunkZ]
    );

    if (res.rows.length === 0) {
      return { success: false, extracted: 0 };
    }

    const resources = res.rows[0].resource_data;
    const available = resources[resourceType] || 0;
    const extracted = Math.min(amount, available);

    if (extracted <= 0) {
      return { success: false, extracted: 0 };
    }

    resources[resourceType] = resourceDecay(available - extracted, 0.01, 1);

    const totalRes = Object.values(resources).reduce((s: number, v: any) => s + (v as number), 0);
    const newEntropy = Math.min(1, (res.rows[0].entropy || 0) + (extracted / (totalRes + extracted + KAPPA)) * 0.1);

    await client.query(
      `UPDATE chunks SET resource_data = $1, entropy = $2, last_update = NOW()
       WHERE x = $3 AND z = $4`,
      [JSON.stringify(resources), newEntropy, chunkX, chunkZ]
    );

    return { success: true, extracted };
  });
}

export async function applyBiomeShift(chunkX: number, chunkZ: number): Promise<void> {
  if (!isDbAvailable()) return;

  const res = await queryDb(
    'SELECT entropy, biome, seed FROM chunks WHERE x = $1 AND z = $2',
    [chunkX, chunkZ]
  );

  if (res.rows.length === 0) return;

  const { entropy, seed } = res.rows[0];
  if (entropy > 0.7) {
    const newBiome = biomeSelection(chunkX, chunkZ, seed + Math.floor(entropy * 1000));
    await queryDb(
      'UPDATE chunks SET biome = $1, stability_index = $2, corruption_level = $3, last_update = NOW() WHERE x = $4 AND z = $5',
      [newBiome, Math.max(0, 1 - entropy), Math.max(0, entropy - 0.5) * 2, chunkX, chunkZ]
    );
  }
}
