import { KAPPA, marketPrice, resourceDecay } from './math-engine.js';
import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';

const BASE_PRICES: Record<string, number> = {
  WOOD: 5, STONE: 8, IRON_ORE: 15, SILVER_ORE: 30,
  GOLD_ORE: 60, DIAMOND: 200, ANCIENT_RELIC: 500, SUNLEAF_HERB: 12
};

const supplyTracker: Record<string, number> = {
  WOOD: 1000, STONE: 800, IRON_ORE: 500, SILVER_ORE: 200,
  GOLD_ORE: 100, DIAMOND: 20, ANCIENT_RELIC: 10, SUNLEAF_HERB: 300
};

const demandTracker: Record<string, number> = {
  WOOD: 900, STONE: 750, IRON_ORE: 520, SILVER_ORE: 210,
  GOLD_ORE: 110, DIAMOND: 25, ANCIENT_RELIC: 15, SUNLEAF_HERB: 280
};

export function getCurrentPrice(resourceType: string): number {
  const base = BASE_PRICES[resourceType] || 10;
  const supply = supplyTracker[resourceType] || 1;
  const demand = demandTracker[resourceType] || 1;
  return marketPrice(base, demand, supply);
}

export function getAllPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const resource of Object.keys(BASE_PRICES)) {
    prices[resource] = getCurrentPrice(resource);
  }
  return prices;
}

export function adjustSupply(resourceType: string, delta: number): void {
  supplyTracker[resourceType] = Math.max(0.001, (supplyTracker[resourceType] || 0) + delta);
}

export function adjustDemand(resourceType: string, delta: number): void {
  demandTracker[resourceType] = Math.max(0.001, (demandTracker[resourceType] || 0) + delta);
}

export function applyWarImpact(intensity: number): void {
  adjustDemand('IRON_ORE', intensity * 50);
  adjustDemand('WOOD', intensity * 30);
  adjustDemand('STONE', intensity * 20);
  adjustSupply('IRON_ORE', -intensity * 20);
  adjustSupply('WOOD', -intensity * 15);
}

export function applyNaturalDecay(): void {
  for (const resource of Object.keys(supplyTracker)) {
    supplyTracker[resource] = resourceDecay(supplyTracker[resource], 0.001, 1);
  }
  for (const resource of Object.keys(demandTracker)) {
    const drift = (supplyTracker[resource] - demandTracker[resource]) * 0.01;
    demandTracker[resource] = Math.max(0.001, demandTracker[resource] + drift);
  }
}

export async function recordEconomicSummary(tickNumber: number): Promise<void> {
  if (!isDbAvailable()) return;

  const prices = getAllPrices();
  const totalSupply = { ...supplyTracker };
  const totalDemand = { ...demandTracker };

  const gdp = Object.entries(prices).reduce((sum, [resource, price]) => {
    return sum + price * (supplyTracker[resource] || 0);
  }, 0);

  const tradeRes = await queryDb(
    "SELECT COUNT(*) as count FROM marketplace WHERE status = 'ACTIVE'"
  );
  const tradeVolume = parseInt(tradeRes.rows?.[0]?.count || '0');

  await queryDb(
    `INSERT INTO economic_summary (tick_number, total_supply, total_demand, price_index, gdp, inflation_rate, trade_volume)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [tickNumber, JSON.stringify(totalSupply), JSON.stringify(totalDemand),
     JSON.stringify(prices), gdp, 0, tradeVolume]
  );
}

export async function createMarketListing(
  sellerUid: string, itemName: string, resourceType: string,
  quantity: number
): Promise<any> {
  if (!isDbAvailable()) return null;

  const price = getCurrentPrice(resourceType);

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO marketplace (seller_uid, item_name, resource_type, quantity, price_per_unit, base_price, demand_index, supply_index, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [sellerUid, itemName, resourceType, quantity, price,
       BASE_PRICES[resourceType] || 10,
       demandTracker[resourceType] || 1,
       supplyTracker[resourceType] || 1]
    );

    adjustSupply(resourceType, quantity);

    return result.rows[0];
  });
}

export async function getMarketListings(): Promise<any[]> {
  const res = await queryDb(
    "SELECT * FROM marketplace WHERE status = 'ACTIVE' ORDER BY created_at DESC"
  );
  return res.rows || [];
}

export async function getEconomicSummary(limit = 10): Promise<any[]> {
  const res = await queryDb(
    'SELECT * FROM economic_summary ORDER BY tick_number DESC LIMIT $1',
    [limit]
  );
  return res.rows || [];
}
