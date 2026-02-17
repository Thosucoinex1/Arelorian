
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
  HUNTING = 'HUNTING',
  DUNGEONEERING = 'DUNGEONEERING',
  DEFENDING = 'DEFENDING'
}

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'NECK' | 'WAIST' | 'FINGER' | 'MATERIAL' | 'CONSUMABLE';
export type ResourceType = 'WOOD' | 'STONE' | 'IRON_ORE' | 'SILVER_ORE' | 'GOLD_ORE' | 'SUNLEAF_HERB' | 'ANCIENT_RELIC';

export type ChatChannel = 'GLOBAL' | 'LOCAL' | 'COMBAT' | 'GUILD' | 'SYSTEM' | 'THOUGHT' | 'EVENT';

export type ItemEffectType = 'ON_HIT_SLOW' | 'ON_HIT_STUN' | 'PASSIVE_REGEN' | 'THORNS' | 'CRIT_CHANCE' | 'LIFESTEAL';

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  description: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  channel: ChatChannel;
  timestamp: number;
}

export interface MemoryEntry {
  id: string;
  timestamp: number;
  description: string;
  importance: number; // 0.0 - 1.0
}

export interface ThinkingMatrix {
  personality: string;
  currentLongTermGoal: string;
  alignment: number; // -1 (Chaos) bis 1 (Ordnung)
  languagePreference: 'EN' | 'DE' | 'MIXED';
  desires?: string[];
}

export interface AgentSkills {
  mining: number;
  woodcutting: number;
  herbalism: number;
  crafting: number;
  negotiation: number;
}

export interface ItemStats {
  dmg?: number;
  str?: number;
  agi?: number;
  int?: number;
  vit?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: string;
  rarity: ItemRarity;
  stats: ItemStats;
  effects?: ItemEffect[];
  quantity?: number;
  description: string;
  color: string;
  iconColor: string;
  setName?: string;
  experience?: number;
}

export interface AuctionListing {
  id: string;
  itemId: string;
  sellerId: string;
  price: number;
  item: Item;
  expiresAt: number;
}

export interface Agent {
  id: string;
  name: string;
  classType: string;
  faction: 'PLAYER' | 'ANOMALY' | 'CREATURE' | 'SYSTEM' | 'NPC' | 'VIKING';
  position: [number, number, number];
  rotationY: number;
  level: number;
  state: AgentState;
  soulDensity: number;
  gold: number;
  isAwakened?: boolean;
  
  // Cognitive Systems
  memoryCache: MemoryEntry[];
  thinkingMatrix: ThinkingMatrix;
  skills: AgentSkills;
  
  // Inventory & Equipment
  inventory: (Item | null)[];
  equipment: {
    mainHand: Item | null;
    offHand: Item | null;
    head: Item | null;
    chest: Item | null;
    legs: Item | null;
  };
  
  loreSnippet?: string;
  stats: { str: number; agi: number; int: number; vit: number; hp: number; maxHp: number };
  targetId?: string | null;
  allianceId?: string | null;
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  amount: number;
  isChest?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'SYSTEM' | 'COMBAT' | 'TRADE' | 'AXIOM' | 'THOUGHT' | 'GUILD' | 'WATCHDOG' | 'EVENT';
}

export type StructureType = 'HOUSE' | 'BANK' | 'SMITH' | 'MARKET' | 'OUTPOST' | 'CAVE_ENTRANCE' | 'DARK_CHURCH';

export interface Structure {
  id: string;
  type: StructureType;
  name: string;
  builtAt: number;
  ownerId?: string | null;
  position?: [number, number, number];
}

export interface LandParcel {
  id: string;
  name: string;
  coordinates: [number, number];
  value: number;
  ownerId: string | null;
  structures?: Structure[];
  isCertified?: boolean;
}

export interface Quest {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  rewardGold: number;
  questGiverId?: string | null;
}

export interface WorldEvent {
  id: string;
  type: 'RAID' | 'FESTIVAL' | 'ECLIPSE';
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  active: boolean;
}

export type ProductType = 'LAND_PARCEL' | 'NOTARY_LICENSE';

export interface StoreProduct {
  id: ProductType;
  name: string;
  description: string;
  priceEUR: number;
}
