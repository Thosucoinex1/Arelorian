
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

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'AXIOMATIC';
export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'MATERIAL' | 'CONSUMABLE';
export type ResourceType = 'WOOD' | 'STONE' | 'IRON_ORE' | 'SILVER_ORE' | 'GOLD_ORE' | 'DIAMOND' | 'ANCIENT_RELIC' | 'SUNLEAF_HERB';
export type ChatChannel = 'GLOBAL' | 'LOCAL' | 'COMBAT' | 'GUILD' | 'SYSTEM' | 'THOUGHT' | 'EVENT' | 'X_BRIDGE';

export interface AxiomaticDNA {
  hash: string;
  generation: number;
  corruption: number;
}

// Added Item-related types for character management
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

// Added Structure and Land types for world building
export type StructureType = 'HOUSE' | 'SMITH' | 'MARKET' | 'BANK' | 'CHURCH' | 'CAVE';

export interface Structure {
  id: string;
  type: StructureType;
  position: [number, number, number];
}

export interface LandParcel {
  id: string;
  name: string;
  ownerId: string | null; // Changed to nullable to signify unowned land
  position: [number, number, number]; // Added position for world placement
  isCertified: boolean;
  structures: Structure[];
  price: number;
}

// Added Store types for acquisitions
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
  lastChoiceLogic?: string; // Summary of axiomatic choice
  
  memoryCache: string[];
  thinkingMatrix: {
    personality: string;
    currentLongTermGoal: string;
    alignment: number;
    languagePreference: 'EN' | 'DE' | 'MIXED';
  };
  skills: Record<string, number>;
  
  // Updated inventory to use defined Item type
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
  // Added eventPosition for navigation functionality in ChatConsole
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
