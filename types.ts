
export enum AgentState {
  IDLE = 'IDLE',
  GATHERING = 'GATHERING',
  COMBAT = 'COMBAT',
  CRAFTING = 'CRAFTING',
  ASCENDING = 'ASCENDING',
  QUESTING = 'QUESTING'
}

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'NECK' | 'WAIST' | 'FINGER';

export type ItemSubtype = 
  // Weapons
  | 'SWORD_1H' | 'AXE_1H' | 'MACE_1H' | 'DAGGER' 
  | 'SWORD_2H' | 'AXE_2H' | 'STAFF_2H' | 'BOW' | 'CROSSBOW'
  // Offhand
  | 'SHIELD' | 'TOME' | 'ARTIFACT'
  // Armor
  | 'PLATE' | 'CHAIN' | 'LEATHER' | 'CLOTH'
  // Accessories
  | 'RING' | 'AMULET' | 'BELT'
  | 'NONE';

export type AbilityType = 'CONSECRATE' | 'SHIELD_DRONE' | 'VOID_STEP' | 'ARCANE_WARD';
export type ItemEffectType = 'ON_HIT_SLOW' | 'ON_HIT_STUN' | 'PASSIVE_REGEN' | 'THORNS' | 'CRIT_CHANCE' | 'LIFESTEAL';

export interface ItemStats {
  str?: number;
  agi?: number;
  int?: number;
  vit?: number;
  dmg?: number;
}

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  chance?: number;
  duration?: number;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: ItemSubtype;
  rarity: ItemRarity;
  stats: ItemStats;
  effects?: ItemEffect[];
  setName?: string;
  color: string;
  iconColor: string;
  description: string;
}

export interface AgentStats {
  str: number;
  agi: number;
  int: number;
  vit: number;
  hp: number;
  maxHp: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  issuerId: string; // NPC or Agent ID
  rewardGold: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ActiveEffect {
  type: AbilityType;
  duration: number; // Seconds remaining
}

export interface Agent {
  id: string;
  name: string;
  classType: 'Paladin' | 'Technomancer' | 'Scribe' | 'Voidwalker' | 'NPC_Smith' | 'NPC_Trader' | 'NPC_Quester';
  position: [number, number, number];
  rotationY: number;
  level: number;
  state: AgentState;
  soulDensity: number;
  guildId?: string;
  targetPosition?: [number, number, number];
  loreSnippet?: string;
  
  // RPG Data
  baseStats: AgentStats; // Intrinsic stats without gear
  stats: AgentStats;     // Effective stats (Base + Gear)
  equipment: {
    mainHand: Item | null;
    offHand: Item | null;
    head: Item | null;
    chest: Item | null;
    legs: Item | null;
    neck: Item | null;
    waist: Item | null;
    finger1: Item | null;
    finger2: Item | null;
  };
  inventory: (Item | null)[];
  activeQuestId?: string;
  
  // Ability System
  cooldowns: Partial<Record<AbilityType, number>>; // Seconds remaining
  activeEffects: ActiveEffect[];
  
  // Item Passive System
  activeItemEffects: ItemEffect[]; // Aggregated passives from gear
}

export interface LandParcel {
  id: string;
  ownerId: string | null;
  coordinates: [number, number];
  value: number;
  entropy: number;
  name: string;
}

export type ChatChannel = 'GLOBAL' | 'LOCAL' | 'COMBAT' | 'SYSTEM' | 'GUILD';

export interface ChatMessage {
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  message: string;
  channel: ChatChannel;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'SYSTEM' | 'COMBAT' | 'TRADE' | 'AXIOM';
}

export interface Vegetation {
  id: string;
  type: 'TREE' | 'ROCK' | 'GRASS';
  position: [number, number, number];
  scale: number;
  rotation: number;
}

export enum ViewMode {
  ORBIT = 'ORBIT',
  TACTICAL = 'TACTICAL'
}
