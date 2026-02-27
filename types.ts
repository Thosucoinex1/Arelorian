

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

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

export type POIType = 'MINE' | 'FOREST' | 'DUNGEON' | 'RUIN' | 'SHRINE' | 'NEST' | 'LORE_TRIGGER' | 'BANK_VAULT' | 'FORGE' | 'MARKET_STALL' | 'TREE' | 'BUILDING';

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
export type ItemType = 'WEAPON' | 'OFFHAND' | 'HELM' | 'CHEST' | 'LEGS' | 'MATERIAL' | 'CONSUMABLE' | 'RELIC';
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
  insight?: number;
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
  subtype?: string;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  value?: number;
  setName?: string;
}

export interface SkillEntry {
  level: number;
  xp: number;
}

export type SkillCategory = 'COMBAT' | 'GATHERING' | 'CRAFTING' | 'UTILITY';

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  icon: string;
}

export const GAME_SKILLS: Record<string, SkillDefinition> = {
  melee: { name: 'Melee', category: 'COMBAT', icon: 'Swords' },
  ranged: { name: 'Ranged', category: 'COMBAT', icon: 'Crosshair' },
  magic: { name: 'Magic', category: 'COMBAT', icon: 'Sparkles' },
  defense: { name: 'Defense', category: 'COMBAT', icon: 'Shield' },
  mining: { name: 'Mining', category: 'GATHERING', icon: 'Pickaxe' },
  woodcutting: { name: 'Woodcutting', category: 'GATHERING', icon: 'Axe' },
  fishing: { name: 'Fishing', category: 'GATHERING', icon: 'Fish' },
  herbalism: { name: 'Herbalism', category: 'GATHERING', icon: 'Leaf' },
  smithing: { name: 'Smithing', category: 'CRAFTING', icon: 'Hammer' },
  alchemy: { name: 'Alchemy', category: 'CRAFTING', icon: 'FlaskConical' },
  cooking: { name: 'Cooking', category: 'CRAFTING', icon: 'CookingPot' },
  runecrafting: { name: 'Runecrafting', category: 'CRAFTING', icon: 'Gem' },
  agility_skill: { name: 'Agility', category: 'UTILITY', icon: 'Wind' },
  thieving: { name: 'Thieving', category: 'UTILITY', icon: 'Eye' },
  dungeoneering: { name: 'Dungeoneering', category: 'UTILITY', icon: 'Skull' },
};

export interface SkillAction {
  name: string;
  levelRequired: number;
  description: string;
  damage?: number;
  effect?: string;
  manaCost?: number;
  cooldown?: number;
}

export const SKILL_ACTIONS: Record<string, SkillAction[]> = {
  melee: [
    { name: 'Slash', levelRequired: 1, description: 'Basic melee attack', damage: 10 },
    { name: 'Cleave', levelRequired: 25, description: 'Wide arc attack hitting nearby enemies', damage: 25 },
    { name: 'Berserker Fury', levelRequired: 50, description: 'Massive damage boost for 10s', damage: 45, effect: 'DAMAGE_BOOST' },
    { name: 'Blade Storm', levelRequired: 75, description: 'Whirlwind of slashes', damage: 70 },
    { name: 'Axiom Rend', levelRequired: 100, description: 'Reality-tearing strike', damage: 120 },
  ],
  ranged: [
    { name: 'Quick Shot', levelRequired: 1, description: 'Basic ranged attack', damage: 8 },
    { name: 'Piercing Arrow', levelRequired: 25, description: 'Ignores partial defense', damage: 22 },
    { name: 'Multishot', levelRequired: 50, description: 'Hit multiple targets', damage: 35 },
    { name: 'Sniper Shot', levelRequired: 75, description: 'Guaranteed critical hit', damage: 80 },
    { name: 'Data Barrage', levelRequired: 100, description: 'Volley of data shards', damage: 110 },
  ],
  magic: [
    { name: 'Spark', levelRequired: 1, description: 'Basic spell', damage: 12, manaCost: 5 },
    { name: 'Neural Bolt', levelRequired: 25, description: 'Concentrated energy bolt', damage: 30, manaCost: 15 },
    { name: 'Void Blast', levelRequired: 50, description: 'Area of effect damage', damage: 50, manaCost: 30 },
    { name: 'Matrix Fracture', levelRequired: 75, description: 'Rip through defenses', damage: 85, manaCost: 50 },
    { name: 'Axiom Storm', levelRequired: 100, description: 'Devastating magical storm', damage: 150, manaCost: 80 },
  ],
  defense: [
    { name: 'Block', levelRequired: 1, description: 'Reduce incoming damage', effect: 'BLOCK_10' },
    { name: 'Fortify', levelRequired: 25, description: 'Temporary defense boost', effect: 'DEF_BOOST_25' },
    { name: 'Iron Skin', levelRequired: 50, description: 'Major damage reduction', effect: 'DEF_BOOST_50' },
    { name: 'Reflect', levelRequired: 75, description: 'Reflect damage back', effect: 'REFLECT' },
    { name: 'Axiom Shield', levelRequired: 100, description: 'Near invulnerability', effect: 'INVULN_5S' },
  ],
  mining: [
    { name: 'Mine', levelRequired: 1, description: 'Gather ore', effect: 'GATHER_1X' },
    { name: 'Deep Strike', levelRequired: 25, description: 'Faster mining', effect: 'GATHER_2X' },
    { name: 'Vein Sense', levelRequired: 50, description: 'Detect rare ores', effect: 'DETECT_RARE' },
    { name: 'Power Mine', levelRequired: 75, description: 'Triple gathering speed', effect: 'GATHER_3X' },
    { name: 'Axiom Extract', levelRequired: 100, description: 'Extract perfect materials', effect: 'GATHER_5X' },
  ],
  woodcutting: [
    { name: 'Chop', levelRequired: 1, description: 'Gather wood', effect: 'GATHER_1X' },
    { name: 'Timber Strike', levelRequired: 25, description: 'Faster cutting', effect: 'GATHER_2X' },
    { name: 'Forest Sense', levelRequired: 50, description: 'Detect rare trees', effect: 'DETECT_RARE' },
    { name: 'Lumberjack', levelRequired: 75, description: 'Triple cutting speed', effect: 'GATHER_3X' },
    { name: 'Nature Harvest', levelRequired: 100, description: 'Perfect wood extraction', effect: 'GATHER_5X' },
  ],
  fishing: [
    { name: 'Cast Line', levelRequired: 1, description: 'Basic fishing', effect: 'GATHER_1X' },
    { name: 'Deep Cast', levelRequired: 25, description: 'Catch better fish', effect: 'GATHER_2X' },
    { name: 'Fish Sense', levelRequired: 50, description: 'Detect rare fish', effect: 'DETECT_RARE' },
    { name: 'Net Haul', levelRequired: 75, description: 'Catch multiple fish', effect: 'GATHER_3X' },
    { name: 'Leviathan Call', levelRequired: 100, description: 'Summon rare catches', effect: 'GATHER_5X' },
  ],
  herbalism: [
    { name: 'Pick Herb', levelRequired: 1, description: 'Gather herbs', effect: 'GATHER_1X' },
    { name: 'Keen Eye', levelRequired: 25, description: 'Find more herbs', effect: 'GATHER_2X' },
    { name: 'Herb Lore', levelRequired: 50, description: 'Identify rare herbs', effect: 'DETECT_RARE' },
    { name: 'Mass Harvest', levelRequired: 75, description: 'Gather herbs rapidly', effect: 'GATHER_3X' },
    { name: 'Primal Growth', levelRequired: 100, description: 'Regrow harvested areas', effect: 'GATHER_5X' },
  ],
  smithing: [
    { name: 'Forge', levelRequired: 1, description: 'Basic crafting', effect: 'CRAFT_BASIC' },
    { name: 'Temper', levelRequired: 25, description: 'Improved quality', effect: 'CRAFT_IMPROVED' },
    { name: 'Masterwork', levelRequired: 50, description: 'Chance for rare quality', effect: 'CRAFT_RARE' },
    { name: 'Infuse', levelRequired: 75, description: 'Add magical properties', effect: 'CRAFT_ENCHANT' },
    { name: 'Axiom Forge', levelRequired: 100, description: 'Create legendary items', effect: 'CRAFT_LEGENDARY' },
  ],
  alchemy: [
    { name: 'Brew', levelRequired: 1, description: 'Basic potion', effect: 'CRAFT_BASIC' },
    { name: 'Distill', levelRequired: 25, description: 'Stronger potions', effect: 'CRAFT_IMPROVED' },
    { name: 'Transmute', levelRequired: 50, description: 'Convert materials', effect: 'TRANSMUTE' },
    { name: 'Elixir', levelRequired: 75, description: 'Powerful elixirs', effect: 'CRAFT_ENCHANT' },
    { name: 'Philosopher Stone', levelRequired: 100, description: 'Create any material', effect: 'CRAFT_LEGENDARY' },
  ],
  cooking: [
    { name: 'Cook', levelRequired: 1, description: 'Basic food', effect: 'CRAFT_BASIC' },
    { name: 'Season', levelRequired: 25, description: 'Better meals', effect: 'CRAFT_IMPROVED' },
    { name: 'Feast', levelRequired: 50, description: 'Party-wide buffs', effect: 'BUFF_PARTY' },
    { name: 'Gourmet', levelRequired: 75, description: 'Stat-boosting meals', effect: 'CRAFT_ENCHANT' },
    { name: 'Axiom Cuisine', levelRequired: 100, description: 'Divine cooking', effect: 'CRAFT_LEGENDARY' },
  ],
  runecrafting: [
    { name: 'Inscribe', levelRequired: 1, description: 'Basic rune', effect: 'CRAFT_BASIC' },
    { name: 'Enchant Rune', levelRequired: 25, description: 'Stronger runes', effect: 'CRAFT_IMPROVED' },
    { name: 'Dual Rune', levelRequired: 50, description: 'Combined effects', effect: 'CRAFT_RARE' },
    { name: 'Greater Rune', levelRequired: 75, description: 'Powerful enchantments', effect: 'CRAFT_ENCHANT' },
    { name: 'Axiom Glyph', levelRequired: 100, description: 'Reality-altering runes', effect: 'CRAFT_LEGENDARY' },
  ],
  agility_skill: [
    { name: 'Sprint', levelRequired: 1, description: 'Move faster briefly', effect: 'SPEED_BOOST' },
    { name: 'Dodge Roll', levelRequired: 25, description: 'Evade attacks', effect: 'DODGE' },
    { name: 'Acrobatics', levelRequired: 50, description: 'Access shortcuts', effect: 'SHORTCUTS' },
    { name: 'Shadow Step', levelRequired: 75, description: 'Instant teleport short range', effect: 'BLINK' },
    { name: 'Axiom Dash', levelRequired: 100, description: 'Phase through reality', effect: 'PHASE' },
  ],
  thieving: [
    { name: 'Pickpocket', levelRequired: 1, description: 'Steal small items', effect: 'STEAL_BASIC' },
    { name: 'Lockpick', levelRequired: 25, description: 'Open locked chests', effect: 'UNLOCK' },
    { name: 'Sleight', levelRequired: 50, description: 'Steal equipped items', effect: 'STEAL_EQUIP' },
    { name: 'Shadowmeld', levelRequired: 75, description: 'Become invisible', effect: 'STEALTH' },
    { name: 'Grand Heist', levelRequired: 100, description: 'Rob entire buildings', effect: 'HEIST' },
  ],
  dungeoneering: [
    { name: 'Explore', levelRequired: 1, description: 'Navigate dungeons', effect: 'DUNGEON_BASIC' },
    { name: 'Trap Sense', levelRequired: 25, description: 'Detect and disarm traps', effect: 'DETECT_TRAPS' },
    { name: 'Boss Lore', levelRequired: 50, description: 'Weakness detection on bosses', effect: 'BOSS_SCAN' },
    { name: 'Dungeon Master', levelRequired: 75, description: 'Bonus loot in dungeons', effect: 'DUNGEON_LOOT' },
    { name: 'Void Walker', levelRequired: 100, description: 'Access secret floors', effect: 'SECRET_ACCESS' },
  ],
};

export type StatName = 'strength' | 'dexterity' | 'agility' | 'stamina' | 'health' | 'mana' | 'intelligence';

export const STAT_DESCRIPTIONS: Record<StatName, string> = {
  strength: 'Melee damage',
  dexterity: 'Ranged damage & crit chance',
  agility: 'Dodge & movement speed',
  stamina: 'HP regeneration',
  health: 'Maximum HP',
  mana: 'Maximum Mana & spell capacity',
  intelligence: 'Magic damage',
};

export function getDefaultSkills(): Record<string, SkillEntry> {
  const skills: Record<string, SkillEntry> = {};
  for (const key of Object.keys(GAME_SKILLS)) {
    skills[key] = { level: 1, xp: 0 };
  }
  return skills;
}

export function getUnlockedActions(skillName: string, level: number): SkillAction[] {
  const actions = SKILL_ACTIONS[skillName] || [];
  return actions.filter(a => level >= a.levelRequired);
}

export interface AppearanceConfig {
  skinTone: string;
  hairStyle: 'short' | 'long' | 'mohawk' | 'bald' | 'ponytail';
  bodyScale: number;
  baseModel: 'humanoid' | 'slim' | 'bulky';
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  skinTone: '#c68642',
  hairStyle: 'short',
  bodyScale: 1.0,
  baseModel: 'humanoid',
};

export interface Agent {
  id: string;
  name: string;
  classType?: string;
  appearance_json?: AppearanceConfig;
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
    curiosity?: number;
    frugality?: number;
  };
  relationships: Record<string, {
    affinity: number;
    interactions: number;
    lastInteractionType?: string;
  }>;
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
  stats: {
    str: number; agi: number; int: number; vit: number;
    hp: number; maxHp: number;
    strength: number; dexterity: number; agility: number; stamina: number;
    health: number; mana: number; maxMana: number; intelligence: number;
  };
  unspentStatPoints: number;
  targetId?: string | null;
  lastDecision?: { decision: string, justification: string };
  lastScanTime: number;
  economicDesires: {
    targetGold: number;
    preferredResources: ResourceType[];
    greedLevel: number;
    riskAppetite: number;
    frugality: number;
    marketRole: 'HOARDER' | 'FLIPPER' | 'PRODUCER' | 'CONSUMER' | 'SPECULATOR' | 'EXPLORER';
    tradeFrequency: number;
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
  logicField?: { vx: number, vz: number }[][]; // Physics-based logic field vectors
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

export interface AuctionListing {
  id: string;
  sellerId: string;
  sellerName: string;
  item: Item;
  startingBid: number;
  currentBid: number;
  highestBidderId?: string;
  endTime: number;
  status: 'ACTIVE' | 'SOLD' | 'EXPIRED';
}

export interface AxiomEvent {
  id: string;
  type: 'MATRIX_GLITCH' | 'AXIOM_STORM' | 'DATA_SURGE';
  description: string;
  intensity: number;
  startTime: number;
  duration: number;
  affectedChunkIds: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardGold: number;
  rewardInsight: number;
  rewardItem?: Item;
  targetChunkId?: string;
  type: 'CORRUPTION_PURGE' | 'DATA_RECOVERY' | 'ENTITY_NEUTRALIZATION';
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
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

export const STRUCTURE_COSTS: Record<StructureType, number> = {
  HOUSE: 50,
  BANK: 150,
  FORGE: 100,
  MARKET_STALL: 75,
  DATA_HUB: 200,
};

export interface Structure {
  id: string;
  type: StructureType;
  ownerId?: string;
}

export const MAX_IMPORTED_AGENTS = 5;

export interface ImportedAgentMeta {
  agentId: string;
  sourceUrl: string;
  sourceType: 'URL' | 'JSON';
  importedAt: number;
  skinHash: string;
}

export const MATRIX_ENERGY_PRODUCTS: StoreProduct[] = [
  { id: 'ENERGY_100', name: '100 Matrix Energy', description: 'Small energy infusion', priceEUR: 0.99 },
  { id: 'ENERGY_500', name: '500 Matrix Energy', description: 'Standard energy pack', priceEUR: 3.99 },
  { id: 'ENERGY_2000', name: '2000 Matrix Energy', description: 'Mega energy surge', priceEUR: 9.99 },
];

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

export interface Guild {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  level: number;
  exp: number;
  description: string;
  motto?: string;
}

export interface Party {
  id: string;
  leaderId: string;
  memberIds: string[];
  isSearching: boolean;
}

export interface StoreProduct {
    id: string;
    name: string;
    description: string;
    priceEUR: number;
}

export type WindowType = 'MARKET' | 'QUESTS' | 'ADMIN' | 'MAP' | 'CHARACTER' | 'AUCTION' | 'INSPECTOR' | 'CHAT' | 'GUILD_PARTY' | 'AGENT_MANAGER' | 'ENERGY_SHOP';

export interface WindowState {
  isOpen: boolean;
  isMinimized: boolean;
}
