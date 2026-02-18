
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
  ALLIANCE_FORMING = 'ALLIANCE_FORMING'
}

/**
 * --- OUROBOROS AXIOMS ---
 * Fundamental mathematical grounding for the simulation.
 */
export const AXIOMS = {
  ENERGY: 'Verbrauch = ΔRealität / Kapazität',
  EROSION: 'Aktion + Zeit = ↑Korruption',
  OBSERVER: 'Ereignis ∝ System-Gegenmaßnahme',
  RECURSION: 'Ausgang(t₀) = Eingang(t₁) + DNA',
  DUALITY: 'Physis ≡ Digital'
};

export const MONSTER_TEMPLATES = {
  GOBLIN: { name: 'Goblin', hp: 50, atk: 5, def: 2, xp: 25, color: '#4ade80', scale: 0.6 },
  ORC: { name: 'Orc', hp: 120, atk: 12, def: 8, xp: 75, color: '#166534', scale: 1.2 },
  DRAGON: { name: 'Dragon', hp: 500, atk: 40, def: 30, xp: 500, color: '#b91c1c', scale: 2.5 },
  BOSS_DEMON: { name: 'Demon Lord', hp: 1200, atk: 60, def: 50, xp: 2000, color: '#7f1d1d', scale: 3.0 }
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

export interface Battle {
  id: string;
  participants: {
    id: string;
    type: 'AGENT' | 'MONSTER';
  }[];
  turn: number;
  lastTick: number;
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

export interface ItemStats {
  str?: number;
  agi?: number;
  int?: number;
  vit?: number;
  hp?: number;
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

export type StructureType = 'HOUSE' | 'SMITH' | 'MARKET' | 'BANK' | 'CHURCH' | 'CAVE';

export interface Structure {
  id: string;
  type: StructureType;
  position: [number, number, number];
}

export interface LandParcel {
  id: string;
  name: string;
  ownerId: string | null; 
  position: [number, number, number]; 
  isCertified: boolean;
  structures: Structure[];
  price: number;
}

export type ProductType = 'LAND' | 'LICENSE' | 'SKIN';

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  priceEUR: number;
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
  state: AgentState;
  soulDensity: number;
  gold: number;
  stabilityIndex: number; 
  energy: number;
  maxEnergy: number;
  integrity: number; 
  dna: AxiomaticDNA;
  loreSnippet?: string;
  isAwakened?: boolean;
  lastChoiceLogic?: string; 
  
  memoryCache: string[];
  thinkingMatrix: {
    personality: string;
    currentLongTermGoal: string;
    alignment: number;
    languagePreference: 'EN' | 'DE' | 'MIXED';
    // Extended stats for importer compatibility
    sociability?: number;
    aggression?: number;
  };
  skills: Record<string, number>;
  
  inventory: (Item | null)[];
  equipment: {
    mainHand: Item | null;
    offHand: Item | null;
    head: Item | null;
    chest: Item | null;
    legs: Item | null;
  };
  
  stats: { str: number; agi: number; int: number; vit: number; hp: number; maxHp: number };
  targetId?: string | null;
  alliedId?: string | null;
  stuckTicks?: number; 
  wanderTarget?: [number, number, number] | null;
}

export interface Chunk { 
  id: string; 
  x: number; 
  z: number; 
  biome: string; 
  entropy: number;
  roomType?: 'NORMAL' | 'DUNGEON' | 'RESOURCE_RICH' | 'BOSS' | 'SAFE';
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
  type: 'SYSTEM' | 'COMBAT' | 'TRADE' | 'AXIOM' | 'THOUGHT' | 'WATCHDOG' | 'EVENT';
  sender?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  channel: ChatChannel;
  timestamp: number;
  eventPosition?: [number, number, number];
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
