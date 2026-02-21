

export enum AgentState {
  IDLE = 'IDLE',
  GATHERING = 'GATHERING',
  COMBAT = 'COMBAT',
  CRAFTING = 'CRAFTING',
  ASCENDING = 'ASCENDING',
  QUESTING = 'QUESTING',
  THINKING = 'THINKING',
  TRADING = 'TRADING',
  BUILDING = 'BUILDING',
  DUNGEONEERING = 'DUNGEONEERING',
  MOUNTED = 'MOUNTED',
  ALLIANCE_FORMING = 'ALLIANCE_FORMING',
  EXPLORING = 'EXPLORING',
  BANKING = 'BANKING',
  MARKETING = 'MARKETING'
}

export type POIType = 'MINE' | 'FOREST' | 'DUNGEON' | 'RUIN' | 'SHRINE' | 'NEST' | 'LORE_TRIGGER' | 'BANK_VAULT' | 'FORGE' | 'MARKET_STALL';

export interface POI {
  id: string;
  type: POIType;
  position: [number, number, number];
  isDiscovered: boolean;
  discoveryRadius: number;
  rewardInsight: number;
  loreFragment?: string;
  threatLevel: number; 
}

export const MONSTER_TEMPLATES = {
  SLIME: { name: 'Void Slime', hp: 30, atk: 3, def: 1, xp: 15, color: '#22c55e', scale: 0.5 },
  GOBLIN: { name: 'Scavenger Goblin', hp: 60, atk: 8, def: 3, xp: 40, color: '#84cc16', scale: 0.8 },
  ORC: { name: 'Axiom Orc', hp: 150, atk: 18, def: 10, xp: 120, color: '#166534', scale: 1.3 },
  DRAGON: { name: 'Data Drake', hp: 800, atk: 55, def: 40, xp: 1500, color: '#ef4444', scale: 3.5 }
};

export type MonsterType = keyof typeof MONSTER_TEMPLATES;

export interface Monster {
  id: string;
  type: MonsterType;
  name: string;
  position: [number, number, number];
  rotationY: number;
  stats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
  };
  xpReward: number;
  state: 'IDLE' | 'COMBAT' | 'PATROL' | 'DEAD';
  targetId: string | null;
  color: string;
  scale: number;
}

export interface CraftingOrder {
  id: string;
  requesterId: string;
  targetItemType: ItemType;
  goldOffered: number;
  status: 'OPEN' | 'CLAIMED' | 'COMPLETED';
  crafterId?: string;
}

export interface MarketState {
  prices: Record<ResourceType, number>;
  inventory: Record<ResourceType, number>;
}

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'AXIOMATIC';
export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'MATERIAL' | 'CONSUMABLE';
export type ResourceType = 'WOOD' | 'STONE' | 'IRON_ORE' | 'SILVER_ORE' | 'GOLD_ORE' | 'DIAMOND' | 'ANCIENT_RELIC' | 'SUNLEAF_HERB';
export type ChatChannel = 'GLOBAL' | 'LOCAL' | 'COMBAT' | 'GUILD' | 'SYSTEM' | 'THOUGHT' | 'EVENT' | 'X_BRIDGE';

export interface AxiomaticDNA {
  hash: string;
  generation: number;
  corruption: number;
}

// Added ItemStats and ItemEffect interfaces for proper type exports
export interface ItemStats {
  str?: number;
  agi?: number;
  int?: number;
  vit?: number;
  hp?: number;
  atk?: number;
  def?: number;
}

export interface ItemEffect {
  description: string;
  type: string;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: string;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  setName?: string;
}

export interface SkillEntry {
  level: number;
  xp: number;
}

export interface Agent {
  id: string;
  name: string;
  classType: string;
  faction: 'PLAYER' | 'ANOMALY' | 'CREATURE' | 'SYSTEM' | 'NPC';
  position: [number, number, number];
  rotationY: number;
  level: number;
  xp: number;
  insightPoints: number; 
  visionLevel: number;
  visionRange: number;
  state: AgentState;
  soulDensity: number;
  gold: number;
  integrity: number; 
  energy: number;
  maxEnergy: number;
  dna: AxiomaticDNA;
  memoryCache: string[];
  isAwakened?: boolean;
  isAdvancedIntel?: boolean;
  consciousnessLevel: number;
  awakeningProgress: number;
  loreSnippet?: string;
  quotaResetTime?: number;
  apiQuotaExceeded?: boolean;
  thinkingMatrix: {
    personality: string;
    currentLongTermGoal: string;
    alignment: number;
    languagePreference: 'EN' | 'DE' | 'MIXED';
    sociability?: number;
    aggression?: number;
  };
  skills: Record<string, SkillEntry>;
  resources: Record<ResourceType, number>;
  inventory: (Item | null)[];
  bank: (Item | null)[];
  equipment: {
    mainHand: Item | null;
    offHand: Item | null;
    head: Item | null;
    chest: Item | null;
    legs: Item | null;
  };
  stats: { str: number; agi: number; int: number; vit: number; hp: number; maxHp: number };
  targetId?: string | null;
  lastDecision?: { decision: string, justification: string };
  lastScanTime: number;
  economicDesires: {
    targetGold: number;
    preferredResources: ResourceType[];
    greedLevel: number; // 0 to 1
    riskAppetite: number; // 0 to 1
    frugality: number; // 0 to 1
    marketRole: 'HOARDER' | 'FLIPPER' | 'PRODUCER' | 'CONSUMER' | 'SPECULATOR';
    tradeFrequency: number; // 0 to 1
  };
  emergentBehaviorLog: {
    timestamp: number;
    action: string;
    reasoning: string;
  }[];
}

export interface Chunk { 
  id: string; 
  x: number; 
  z: number; 
  biome: string; 
  entropy: number;
  explorationLevel: number;
  logicString?: string;
  axiomaticData?: number[][];
  stabilityIndex: number; // 0 to 1
  corruptionLevel: number; // 0 to 1
  cellType: 'SANCTUARY' | 'WILDERNESS' | 'ANOMALY';
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  amount: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'SYSTEM' | 'COMBAT' | 'TRADE' | 'AXIOM' | 'THOUGHT' | 'WATCHDOG' | 'EVENT' | 'ERROR';
  sender?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // Renamed for architectural consistency
  channel: ChatChannel;
  timestamp: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardGold: number;
  timestamp: number;
  issuerId: string;
  position?: [number, number, number];
}

export type NotaryTier = 1 | 2 | 3;

export interface Notary {
  userId: string;
  email: string;
  tier: NotaryTier;
  tierName: 'Autosave' | 'Duden-Entry' | 'Axiomatic-Master';
  timestamp: number;
}

export interface TradeOffer {
  id: string;
  senderId: string;
  senderName: string;
  offeredType: ResourceType | 'GOLD';
  offeredAmount: number;
  requestedType: ResourceType | 'GOLD';
  requestedAmount: number;
  timestamp: number;
  status: 'OPEN' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
}

export interface LandParcel {
  id: string;
  name: string;
  ownerId: string;
  isCertified: boolean;
  structures: Structure[];
}

export type StructureType = 'HOUSE' | 'BANK' | 'FORGE' | 'MARKET_STALL' | 'DATA_HUB';

export interface Structure {
  id: string;
  type: StructureType;
  ownerId?: string;
}

export const AXIOMS = [
  "Logic must persist.",
  "Data is sacred.",
  "Entropy is the enemy.",
  "Connectivity is evolution.",
  "Emergence is the goal."
];

export interface EmergenceSettings {
  isEmergenceEnabled: boolean;
  useHeuristicsOnly: boolean;
  axiomaticWorldGeneration: boolean;
  physicsBasedActivation: boolean;
  showAxiomaticOverlay: boolean;
}

export interface StoreProduct {
    id: string;
    name: string;
    description: string;
    priceEUR: number;
}
