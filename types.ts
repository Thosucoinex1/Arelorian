
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
  LYING_DOWN = 'LYING_DOWN',
  HELLGATE_INVASION = 'HELLGATE_INVASION',
  ALLIANCE_FORMING = 'ALLIANCE_FORMING'
}

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'AXIOMATIC';
export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'MATERIAL' | 'CONSUMABLE';
export type ResourceType = 'WOOD' | 'STONE' | 'IRON_ORE' | 'SILVER_ORE' | 'GOLD_ORE' | 'DIAMOND' | 'ANCIENT_RELIC' | 'SUNLEAF_HERB';

export type ChatChannel = 'GLOBAL' | 'LOCAL' | 'COMBAT' | 'GUILD' | 'SYSTEM' | 'THOUGHT' | 'EVENT' | 'X_BRIDGE';

export type ProductType = 'LAND_PARCEL' | 'NOTARY_LICENSE';

export type ItemEffectType = 'CRIT_CHANCE' | 'LIFESTEAL' | 'THORNS' | 'PASSIVE_REGEN' | 'ON_HIT_STUN' | 'ON_HIT_SLOW';

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  description: string;
}

export interface ItemStats {
    dmg?: number;
    str?: number;
    agi?: number;
    int?: number;
    vit?: number;
}

export interface AxiomaticDNA {
  hash: string;
  generation: number;
  corruption: number;
}

export interface Agent {
  id: string;
  name: string;
  classType: string;
  faction: 'PLAYER' | 'ANOMALY' | 'CREATURE' | 'SYSTEM' | 'NPC' | 'VIKING' | 'DEMON';
  position: [number, number, number];
  rotationY: number;
  level: number;
  xp: number;
  state: AgentState;
  soulDensity: number;
  gold: number;
  stabilityIndex: number;
  dna: AxiomaticDNA;
  loreSnippet?: string;
  isAwakened?: boolean;
  
  memoryCache: any[];
  thinkingMatrix: {
    personality: string;
    currentLongTermGoal: string;
    alignment: number;
    languagePreference: 'EN' | 'DE' | 'MIXED';
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
  mountId?: string | null;
  alliedId?: string | null;
  activeQuestId?: string | null;
  stuckTicks?: number; 
  wanderTarget?: [number, number, number] | null;
}

export interface Chunk { 
  id: string; 
  x: number; 
  z: number; 
  biome: string; 
  depth: number;
  entropy: number;
}

export interface WorldEvent {
  id: string;
  type: 'RAID' | 'FESTIVAL' | 'ECLIPSE' | 'HELLGATE_INVASION';
  title: string;
  description: string;
  active: boolean;
  startTime: number;
  endTime: number;
  position?: [number, number, number]; // Added for jump-to-event
}

export type StructureType = 'HOUSE' | 'BANK' | 'SMITH' | 'MARKET' | 'OUTPOST' | 'CAVE_ENTRANCE' | 'DARK_CHURCH' | 'ADMIN_TERMINAL';

export interface Structure {
  id: string;
  type: StructureType;
  name: string;
  builtAt: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: string;
  rarity: ItemRarity;
  stats: ItemStats;
  effects?: ItemEffect[];
  description: string;
  experience?: number;
  setName?: string;
}

export interface LandParcel {
  id: string;
  name: string;
  coordinates: [number, number];
  ownerId: string | null;
  value: number;
  isCertified: boolean;
  structures: Structure[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'SYSTEM' | 'COMBAT' | 'TRADE' | 'AXIOM' | 'THOUGHT' | 'GUILD' | 'WATCHDOG' | 'EVENT';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  channel: ChatChannel;
  timestamp: number;
  eventPosition?: [number, number, number]; // Added for jump-to-event from chat
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardGold: number;
  timestamp: number;
  issuerId: string;
  position?: [number, number, number]; // Objective position
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  amount: number;
}

export interface AuctionListing {
  id: string;
  item: Item;
  sellerId: string;
  price: number;
  expiresAt: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  priceEUR: number;
}
