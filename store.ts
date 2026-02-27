
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Item, 
  Monster, ChatChannel, POI, CraftingOrder, MarketState, Quest, LandParcel, StructureType,
  TradeOffer, EmergenceSettings, Notary, AxiomEvent, Guild, Party, NotaryTier, WindowType, WindowState, AuctionListing,
  ImportedAgentMeta, MAX_IMPORTED_AGENTS, STRUCTURE_COSTS, StoreProduct
} from './types';
import { getBiomeForChunk, generateProceduralPOIs, summarizeNeurologicChoice, calculateCombatHeuristics, getXPForNextLevel, MONSTER_TEMPLATES, KAPPA, generateLoot } from './utils';
import { generateAutonomousDecision, importAgentFromSource } from './services/geminiService';
import { WorldBuildingService } from './services/WorldBuildingService';

function generateSkinHash(source: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `0x${(h >>> 0).toString(16).padStart(8, '0')}${Date.now().toString(16)}`;
}

export function skinHashToColors(hash: string): { primary: string; secondary: string; accent: string; pattern: number } {
  const hex = hash.replace('0x', '');
  const v = (off: number) => parseInt(hex.slice(off, off + 2) || '80', 16);
  const hue1 = (v(0) / 255) * 360;
  const hue2 = (hue1 + 60 + (v(2) / 255) * 120) % 360;
  const hue3 = (hue1 + 180 + (v(4) / 255) * 60) % 360;
  const sat = 50 + (v(6) / 255) * 40;
  const light = 35 + (v(1) / 255) * 25;
  const hslToHex = (h: number, s: number, l: number) => {
    const sn = Math.max(0, Math.min(100, s)) / 100;
    const ln = Math.max(0, Math.min(100, l)) / 100;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => { const k = (n + h / 30) % 12; return ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
    return `#${[f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
  };
  return {
    primary: hslToHex(hue1, sat, light),
    secondary: hslToHex(hue2, sat - 10, light + 10),
    accent: hslToHex(hue3, sat + 10, light + 20),
    pattern: v(3) % 5
  };
}

interface GameState {
  agents: Agent[];
  monsters: Monster[];
  resourceNodes: ResourceNode[];
  pois: POI[];
  logs: LogEntry[];
  chatMessages: ChatMessage[];
  loadedChunks: Chunk[];
  market: MarketState;
  craftingOrders: CraftingOrder[];
  quests: Quest[];
  landParcels: LandParcel[];
  notaries: Notary[];
  tradeOffers: TradeOffer[];
  guilds: Guild[];
  parties: Party[];
  activeEvents: AxiomEvent[];
  graphicPacks: string[];
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  user: { id: string; name: string; email: string } | null;
  userApiKey: string | null;
  matrixEnergy: number; 
  globalApiCooldown: number; 
  device: { 
    isMobile: boolean;
    isTablet: boolean;
    orientation: 'portrait' | 'landscape';
    width: number;
    height: number;
    isAndroid: boolean;
  };
  updateScreenSize: () => void;
  lastLocalThinkTime: number;
  lastSaveTime: number;
  showMarket: boolean;

  showQuests: boolean;
  showAdmin: boolean;
  showMap: boolean;
  showCharacterSheet: boolean;
  isAxiomAuthenticated: boolean;
  showDebugger: boolean;
  showDeveloperTools: boolean;
  emergenceSettings: EmergenceSettings;
  debugBiomeEnabled: boolean;
  debugBiome: number;
  isScanning: boolean;
  diagnosticReport: any | null;
  hoveredChunkId: string | null;
  selectedChunkId: string | null;
  selectedMonsterId: string | null;
  selectedPoiId: string | null;

  windowStates: Record<WindowType, WindowState>;
  toggleWindow: (type: WindowType, force?: boolean) => void;
  minimizeWindow: (type: WindowType) => void;
  restoreWindow: (type: WindowType) => void;

  auctionHouse: AuctionListing[];
  bidOnAuction: (auctionId: string, bidderId: string, amount: number) => void;

  initGame: () => void;
  updatePhysics: (delta: number) => void;
  runCognition: () => void;
  runSocialInteractions: () => void;
  addLog: (message: string, type: LogEntry['type'], sender?: string) => void;
  addChatMessage: (content: string, channel: ChatChannel, senderId: string, senderName: string) => void;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
  toggleMarket: (show: boolean) => void;
  toggleQuests: (show: boolean) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  toggleCharacterSheet: (show: boolean) => void;
  toggleDebugger: (show: boolean) => void;
  toggleDeveloperTools: (show: boolean) => void;
  runDiagnostics: (errorLog?: string) => Promise<void>;
  runEmergentBehavior: (agentId: string) => Promise<void>;
  setAxiomAuthenticated: (auth: boolean) => void;
  setEmergenceSetting: (key: keyof EmergenceSettings, value: any) => void;
  toggleDebugBiome: () => void;
  setDebugBiome: (biome: number) => void;
  generateAxiomaticChunk: (x: number, z: number) => void;
  sendSignal: (msg: string) => void;
  purchaseProduct: (id: string) => void;
  equipItem: (agentId: string, item: Item, index: number) => void;
  unequipItem: (agentId: string, slot: keyof Agent['equipment']) => void;
  moveInventoryItem: (agentId: string, from: number, to: number) => void;
  reflectOnMemory: (agentId: string) => Promise<void>;
  reflectOnAxioms: (agentId: string) => Promise<void>;
  uploadGraphicPack: (name: string) => void;
  importedAgents: ImportedAgentMeta[];
  importAgent: (source: string, type: 'URL' | 'JSON') => void;
  removeImportedAgent: (agentId: string) => void;
  purchaseEnergy: (product: StoreProduct) => void;
  setJoystick: (side: 'left' | 'right', axis: { x: number, y: number }) => void;
  setUserApiKey: (key: string | null) => void;
  consumeEnergy: (amount: number) => boolean;
  refillEnergy: (amount: number) => void;
  setUser: (user: { id: string; name: string; email: string } | null) => void;
  stabilizeChunk: (chunkId: string) => void;
  registerNotary: (userId: string, email: string) => void;
  craftItem: (agentId: string, recipeId: string) => void;
  syncAgents: () => Promise<void>;
  loadAgents: () => Promise<boolean>;
  upgradeNotary: (userId: string) => void;
  
  saveGame: () => void;
  loadGame: () => boolean;

  // Guild & Party Actions
  createGuild: (name: string, leaderId: string) => void;
  joinGuild: (guildId: string, agentId: string) => void;
  leaveGuild: (guildId: string, agentId: string) => void;
  createParty: (leaderId: string) => void;
  joinParty: (partyId: string, agentId: string) => void;
  leaveParty: (partyId: string, agentId: string) => void;

  postTradeOffer: (offer: Omit<TradeOffer, 'id' | 'timestamp' | 'status'>) => void;
  acceptTradeOffer: (offerId: string, acceptorId: string) => void;
  cancelTradeOffer: (offerId: string) => void;
  generateQuests: () => void;
  acceptQuest: (questId: string, agentId: string) => void;
  triggerAxiomEvent: (type?: AxiomEvent['type']) => void;
  setHoveredChunk: (id: string | null) => void;
  setSelectedChunk: (id: string | null) => void;
  selectMonster: (id: string | null) => void;
  selectPoi: (id: string | null) => void;
  clearChat: () => void;
}

export const useStore = create<GameState>((set, get) => ({
  agents: [],
  monsters: [],
  resourceNodes: [],
  pois: [],
  logs: [],
  chatMessages: [],
  loadedChunks: [],
  quests: [],
  landParcels: [],
  notaries: [],
  tradeOffers: [],
  activeEvents: [],
  guilds: [],
  parties: [],
  graphicPacks: ['Default Architecture'],
  userApiKey: localStorage.getItem('OUROBOROS_API_KEY'),
  matrixEnergy: 100,
  globalApiCooldown: 0,
  market: {
    prices: { WOOD: 5, STONE: 8, IRON_ORE: 15, SILVER_ORE: 40, GOLD_ORE: 100, DIAMOND: 500, ANCIENT_RELIC: 1000, SUNLEAF_HERB: 25 },
    inventory: { WOOD: 100, STONE: 100, IRON_ORE: 50, SILVER_ORE: 10, GOLD_ORE: 5, DIAMOND: 1, ANCIENT_RELIC: 0, SUNLEAF_HERB: 20 }
  },
  craftingOrders: [],
  selectedAgentId: null,
  cameraTarget: null,
  serverStats: { uptime: 0, tickRate: 60, memoryUsage: 128, threatLevel: 0.05 },
  user: null,
  device: {
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    isTablet: /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent),
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    width: window.innerWidth,
    height: window.innerHeight,
    isAndroid: /Android/i.test(navigator.userAgent)
  },
  updateScreenSize: () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent);
    const orientation = width > height ? 'landscape' : 'portrait';
    const isAndroid = /Android/i.test(navigator.userAgent);

    set({ 
      device: { 
        isMobile, 
        isTablet, 
        orientation, 
        width, 
        height,
        isAndroid
      } 
    });
  },
  lastLocalThinkTime: 0,
  lastSaveTime: Date.now(),
  showMarket: false,

  showQuests: false,
  showAdmin: false,
  showMap: false,
  showCharacterSheet: false,
  showDebugger: false,
  showDeveloperTools: false,
  diagnosticReport: null,
  isAxiomAuthenticated: false,
  debugBiomeEnabled: false,
  debugBiome: 0,
  isScanning: false,
  hoveredChunkId: null,
  selectedChunkId: null,
  selectedMonsterId: null,
  selectedPoiId: null,

  auctionHouse: [],
  importedAgents: [],

  windowStates: {
    MARKET: { isOpen: false, isMinimized: false },
    QUESTS: { isOpen: false, isMinimized: false },
    ADMIN: { isOpen: false, isMinimized: false },
    MAP: { isOpen: false, isMinimized: false },
    CHARACTER: { isOpen: false, isMinimized: false },
    AUCTION: { isOpen: false, isMinimized: false },
    INSPECTOR: { isOpen: true, isMinimized: false },
    CHAT: { isOpen: true, isMinimized: false },
    GUILD_PARTY: { isOpen: false, isMinimized: false },
    AGENT_MANAGER: { isOpen: false, isMinimized: false },
    ENERGY_SHOP: { isOpen: false, isMinimized: false },
  },

  toggleWindow: (type, force) => {
    set(state => {
      const current = state.windowStates[type];
      const nextOpen = force !== undefined ? force : !current.isOpen;
      return {
        windowStates: {
          ...state.windowStates,
          [type]: { isOpen: nextOpen, isMinimized: nextOpen ? false : current.isMinimized }
        },
        // Legacy toggles for backward compatibility
        ...(type === 'MARKET' ? { showMarket: nextOpen } : {}),
        ...(type === 'QUESTS' ? { showQuests: nextOpen } : {}),
        ...(type === 'ADMIN' ? { showAdmin: nextOpen } : {}),
        ...(type === 'MAP' ? { showMap: nextOpen } : {}),
        ...(type === 'CHARACTER' ? { showCharacterSheet: nextOpen } : {}),
        ...(type === 'AUCTION' ? { showAuctionHouse: nextOpen } : {}),
      };
    });
  },

  minimizeWindow: (type) => {
    set(state => ({
      windowStates: {
        ...state.windowStates,
        [type]: { ...state.windowStates[type], isMinimized: true }
      }
    }));
  },

  restoreWindow: (type) => {
    set(state => ({
      windowStates: {
        ...state.windowStates,
        [type]: { ...state.windowStates[type], isMinimized: false, isOpen: true }
      }
    }));
  },

  bidOnAuction: (auctionId, bidderId, amount) => {
    set(state => ({
      auctionHouse: state.auctionHouse.map(auc => {
        if (auc.id === auctionId && amount > auc.currentBid) {
          return { ...auc, currentBid: amount, highestBidderId: bidderId };
        }
        return auc;
      })
    }));
  },

  emergenceSettings: {
    isEmergenceEnabled: true,
    useHeuristicsOnly: true, // Default to true for release as requested
    axiomaticWorldGeneration: true,
    physicsBasedActivation: true,
    showAxiomaticOverlay: false
  },


  toggleQuests: (show: boolean) => get().toggleWindow('QUESTS', show),
  toggleAuctionHouse: (show: boolean) => get().toggleWindow('AUCTION', show),



  generateQuests: () => {
    const state = get();
    const entropy = state.serverStats.threatLevel;
    const chunks = state.loadedChunks.filter(c => c.corruptionLevel > 0.2);
    
    if (chunks.length === 0) return;

    const randomChunk = chunks[Math.floor(Math.random() * chunks.length)];
    const newQuest: Quest = {
      id: `q-${Date.now()}`,
      title: 'Corruption Purge',
      description: `The corruption in chunk ${randomChunk.id} is reaching critical levels. Purge the entropy.`,
      rewardGold: Math.floor(200 * (1 + entropy)),
      rewardInsight: 10,
      targetChunkId: randomChunk.id,
      type: 'CORRUPTION_PURGE',
      status: 'AVAILABLE',
      timestamp: Date.now(),
      issuerId: 'SYSTEM'
    };

    set(s => ({ quests: [...s.quests, newQuest] }));
    get().addLog(`New Quest Available: ${newQuest.title}`, 'EVENT', 'SYSTEM');
  },

  acceptQuest: (questId, agentId) => {
    set(s => ({
      quests: s.quests.map(q => q.id === questId ? { ...q, status: 'ACTIVE' } : q),
      agents: s.agents.map(a => a.id === agentId ? { ...a, state: AgentState.QUESTING, targetId: questId } : a)
    }));
  },

  triggerAxiomEvent: (type?: AxiomEvent['type']) => {
    const eventType = type || (['MATRIX_GLITCH', 'AXIOM_STORM', 'DATA_SURGE'][Math.floor(Math.random() * 3)] as AxiomEvent['type']);
    const chunks = get().loadedChunks.map(c => c.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    
    const newEvent: AxiomEvent = {
      id: `evt-${Date.now()}`,
      type: eventType,
      description: eventType === 'MATRIX_GLITCH' ? 'Temporal instability detected.' : 'High-energy logic storm incoming.',
      intensity: 0.5 + Math.random() * 0.5,
      startTime: Date.now(),
      duration: 60000,
      affectedChunkIds: chunks
    };

    set(s => ({ activeEvents: [...s.activeEvents, newEvent] }));
    get().addLog(`CRITICAL EVENT: ${newEvent.type} - ${newEvent.description}`, 'EVENT', 'SYSTEM');
  },

  setUserApiKey: (key) => {
    if (key) localStorage.setItem('OUROBOROS_API_KEY', key);
    else localStorage.removeItem('OUROBOROS_API_KEY');
    set({ userApiKey: key });
  },

  setUser: (user) => set({ user }),

  setGlobalApiCooldown: (timestamp: number) => set({ globalApiCooldown: timestamp }),

  consumeEnergy: (amount) => {
    const current = get().matrixEnergy;
    if (current >= amount) {
      set({ matrixEnergy: current - amount });
      return true;
    }
    return false;
  },

  refillEnergy: (amount) => {
    set(s => ({ matrixEnergy: s.matrixEnergy + amount }));
  },

  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  setEmergenceSetting: (key, value) => set(s => ({ emergenceSettings: { ...s.emergenceSettings, [key]: value } })),
  toggleDebugBiome: () => set(state => ({ debugBiomeEnabled: !state.debugBiomeEnabled })),
  setDebugBiome: (biome) => set({ debugBiome: biome }),

  generateAxiomaticChunk: (x, z) => {
    const id = `c${x}${z}`;
    const logicString = `AXIOM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    // Generate 8x8 axiomatic data field and logic field
    const data: number[][] = [];
    const field: { vx: number, vz: number }[][] = [];
    
    // Simple hash function for logicString to seed generation
    const hash = logicString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for(let i=0; i<8; i++) {
      data[i] = [];
      field[i] = [];
      for(let j=0; j<8; j++) {
        const worldX = x * 80 + (i * 10 - 35);
        const worldZ = z * 80 + (j * 10 - 35);
        
        // Axiomatic Data: 0 to 1, influenced by logic field
        data[i][j] = (Math.sin(worldX * 0.1 * KAPPA) * Math.cos(worldZ * 0.1 * KAPPA) + 1) / 2;
        
        // Physics-based Logic Field: Logic by Plexity
        // Multi-layered noise/sine forces
        const vx = Math.sin(worldX * 0.05 * KAPPA) * Math.cos(worldZ * 0.03 * KAPPA) * 0.15 + 
                   Math.sin(worldZ * 0.1 * KAPPA) * 0.05 +
                   Math.cos(hash * 0.01 * KAPPA) * 0.02;
        const vz = Math.cos(worldX * 0.04 * KAPPA) * Math.sin(worldZ * 0.06 * KAPPA) * 0.15 + 
                   Math.cos(worldX * 0.12 * KAPPA) * 0.05 +
                   Math.sin(hash * 0.01 * KAPPA) * 0.02;
        field[i][j] = { vx, vz };
      }
    }

    const isSanctuary = x === 0 && z === 0;

    const newChunk: Chunk = {
      id, x, z, 
      biome: getBiomeForChunk(x, z),
      entropy: Math.random() * 0.5,
      explorationLevel: 0.1,
      logicString,
      axiomaticData: data,
      logicField: field,
      stabilityIndex: isSanctuary ? 1.0 : Math.random() * 0.5 + 0.5,
      corruptionLevel: isSanctuary ? 0.0 : Math.random() * 0.3,
      cellType: isSanctuary ? 'SANCTUARY' : 'WILDERNESS'
    };

    set(s => ({ loadedChunks: [...s.loadedChunks, newChunk] }));
    
    // Generate content based on Axiomatic Rules
    const content = WorldBuildingService.generateAxiomaticContent(newChunk);
    set(s => ({
      pois: [...s.pois, ...content.pois],
      monsters: [...s.monsters, ...content.monsters],
      resourceNodes: [...s.resourceNodes, ...content.resources]
    }));

    get().addLog(`Axiomatic Chunk ${id} generated via Logic Field: ${logicString}`, 'AXIOM', 'SYSTEM');
  },

  initGame: async () => {
    // Try to load saved game first
    if (get().loadGame()) {
      return;
    }

    // Generate initial 3x3 grid around center
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        get().generateAxiomaticChunk(x, z);
      }
    }

    const initialAgents: Agent[] = [
        {
            id: 'a1', name: 'Aurelius', classType: 'Scribe', faction: 'PLAYER', position: [0, 0, 0], rotationY: 0, level: 1, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 25, state: AgentState.IDLE, soulDensity: 1, gold: 100, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x1', generation: 1, corruption: 0 }, memoryCache: [], consciousnessLevel: 0.1, awakeningProgress: 0, 
            thinkingMatrix: { personality: 'Wise', currentLongTermGoal: 'Archive', alignment: 0.5, languagePreference: 'DE', sociability: 0.8, curiosity: 0.9, frugality: 0.7 },
            relationships: {},
            skills: { mining: { level: 1, xp: 0 }, crafting: { level: 1, xp: 0 }, combat: { level: 1, xp: 0 } }, 
            resources: { WOOD: 10, STONE: 5, IRON_ORE: 0, SILVER_ORE: 0, GOLD_ORE: 0, DIAMOND: 0, ANCIENT_RELIC: 0, SUNLEAF_HERB: 2 },
            inventory: Array(10).fill(null), bank: Array(50).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }, lastScanTime: 0, isAwakened: true, isAdvancedIntel: false,
            economicDesires: { 
              targetGold: 1000, 
              preferredResources: ['GOLD_ORE', 'SILVER_ORE'], 
              greedLevel: 0.3,
              riskAppetite: 0.2,
              frugality: 0.8,
              marketRole: 'HOARDER',
              tradeFrequency: 0.1
            },
            emergentBehaviorLog: []
        },
        {
          id: 'a2', name: 'Vulcan', classType: 'Blacksmith', faction: 'NPC', position: [-5, 0, 5], rotationY: 0, level: 3, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 20, state: AgentState.IDLE, soulDensity: 0.8, gold: 50, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x2', generation: 1, corruption: 0 }, memoryCache: [], consciousnessLevel: 0.05, awakeningProgress: 0, 
          thinkingMatrix: { personality: 'Gruff', currentLongTermGoal: 'Forge Perfection', alignment: 0.1, languagePreference: 'EN', aggression: 0.4, curiosity: 0.3, frugality: 0.5 },
          relationships: {},
          skills: { mining: { level: 2, xp: 0 }, crafting: { level: 8, xp: 0 }, combat: { level: 4, xp: 0 } }, 
          resources: { WOOD: 5, STONE: 20, IRON_ORE: 15, SILVER_ORE: 0, GOLD_ORE: 0, DIAMOND: 0, ANCIENT_RELIC: 0, SUNLEAF_HERB: 0 },
          inventory: Array(10).fill(null), bank: Array(50).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 15, agi: 8, int: 5, vit: 15, hp: 150, maxHp: 150 }, lastScanTime: 0, isAwakened: false, isAdvancedIntel: false,
          economicDesires: { 
            targetGold: 5000, 
            preferredResources: ['IRON_ORE', 'GOLD_ORE'], 
            greedLevel: 0.7,
            riskAppetite: 0.5,
            frugality: 0.4,
            marketRole: 'PRODUCER',
            tradeFrequency: 0.6
          },
          emergentBehaviorLog: []
        },
        {
          id: 'a3', name: 'Lyra', classType: 'Explorer', faction: 'NPC', position: [10, 0, -10], rotationY: 0, level: 2, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 30, state: AgentState.IDLE, soulDensity: 0.9, gold: 200, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x3', generation: 1, corruption: 0 }, memoryCache: [], consciousnessLevel: 0.15, awakeningProgress: 0, 
          thinkingMatrix: { personality: 'Curious', currentLongTermGoal: 'Map the Void', alignment: 0.8, languagePreference: 'EN', sociability: 0.9, curiosity: 1.0, frugality: 0.3 },
          relationships: {},
          skills: { mining: { level: 1, xp: 0 }, crafting: { level: 1, xp: 0 }, combat: { level: 2, xp: 0 } }, 
          resources: { WOOD: 0, STONE: 0, IRON_ORE: 0, SILVER_ORE: 0, GOLD_ORE: 0, DIAMOND: 0, ANCIENT_RELIC: 0, SUNLEAF_HERB: 10 },
          inventory: Array(10).fill(null), bank: Array(50).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 8, agi: 14, int: 12, vit: 8, hp: 90, maxHp: 90 }, lastScanTime: 0, isAwakened: false, isAdvancedIntel: false,
          economicDesires: { 
            targetGold: 2000, 
            preferredResources: ['DIAMOND', 'ANCIENT_RELIC'], 
            greedLevel: 0.4,
            riskAppetite: 0.8,
            frugality: 0.2,
            marketRole: 'EXPLORER',
            tradeFrequency: 0.4
          },
          emergentBehaviorLog: []
        }
    ];

    set({ 
      agents: initialAgents, 
      landParcels: [
        { id: 'parcel_1', name: 'Axiom Lot Alpha', ownerId: 'u1', isCertified: true, structures: [] }
      ]
    });

    // Try to load real agents from DB
    const loaded = await get().loadAgents();
    if (loaded) {
      get().addLog("Real Agent Data Manifested from Axiom Database.", 'SYSTEM', 'AXIOM');
    }

    // Generate initial procedural content
    get().generateQuests();
    get().generateQuests();
    

  },

  updatePhysics: (delta) => {
    // Auto-save every 60 seconds
    if (Date.now() - get().lastSaveTime > 60000) {
      get().saveGame();
      set({ lastSaveTime: Date.now() });
    }

    set(state => {
      // Monster AI & Combat Resolution
      const newMonsters: Monster[] = state.monsters.map(m => {
        if (m.state === 'DEAD') return m;
        let newPos = [...m.position] as [number, number, number];
        let newState: Monster['state'] = m.state;
        let newTargetId = m.targetId;
        let newHp = m.stats.hp;

        // 1. Monster Attack Logic
        if (m.state === 'COMBAT' && m.targetId) {
            const targetAgent = state.agents.find(a => a.id === m.targetId);
            if (targetAgent) {
                const dist = Math.hypot(targetAgent.position[0] - m.position[0], targetAgent.position[2] - m.position[2]);
                if (dist < 2.5 && Math.random() < 0.1) {
                    // Damage calculation
                    // const armor = (targetAgent.equipment.chest?.stats.def || 0) + (targetAgent.equipment.head?.stats.def || 0) + (targetAgent.equipment.legs?.stats.def || 0);
                    // const damage: number = Math.max(1, m.stats.atk - (targetAgent.stats.vit * 0.5 + armor));
                    
                    // We'll apply damage to agent in the agent mapping
                }
            }
        }

        // 2. Monster Movement
        const closestAgent = state.agents.find(a => Math.hypot(a.position[0]-m.position[0], a.position[2]-m.position[2]) < 15);
        if (closestAgent && closestAgent.stats.hp > 0) {
          newState = 'COMBAT';
          newTargetId = closestAgent.id;
          const dx = closestAgent.position[0] - m.position[0];
          const dz = closestAgent.position[2] - m.position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 1.8) {
            newPos[0] += (dx/dist) * 4 * delta;
            newPos[2] += (dz/dist) * 4 * delta;
          }
        } else {
          newState = 'IDLE';
          newTargetId = null;
        }

        // Apply Physics-based Logic Field effects to Monster
        const mChunkX = Math.floor(m.position[0] / 80);
        const mChunkZ = Math.floor(m.position[2] / 80);
        const mChunk = state.loadedChunks.find(c => c.x === mChunkX && c.z === mChunkZ);
        if (mChunk && mChunk.logicField) {
            const localX = Math.floor(((m.position[0] % 80) + 80) % 80 / 10);
            const localZ = Math.floor(((m.position[2] % 80) + 80) % 80 / 10);
            if (localX >= 0 && localX < 8 && localZ >= 0 && localZ < 8) {
                const force = mChunk.logicField[localX][localZ];
                newPos[0] += force.vx * delta * 5;
                newPos[2] += force.vz * delta * 5;
            }
        }

        // 3. Check for damage from agents
        state.agents.forEach(a => {
            if (a.state === AgentState.COMBAT && a.targetId === m.id) {
                const dist = Math.hypot(a.position[0] - m.position[0], a.position[2] - m.position[2]);
                if (dist < 3.0 && Math.random() < 0.15) { // Agents attack slightly faster
                    const weaponAtk = a.equipment.mainHand?.stats.atk || 0;
                    const damage = Math.max(1, (a.stats.str * 0.8 + weaponAtk) - m.stats.def);
                    newHp -= damage;
                }
            }
        });

        if (newHp <= 0) {
            state.addLog(`${m.name} wurde von den Agenten der Matrix neutralisiert.`, 'COMBAT', 'SYSTEM');
            return { ...m, state: 'DEAD' as const, stats: { ...m.stats, hp: 0 } };
        }

        return { ...m, position: newPos, state: newState, targetId: newTargetId, stats: { ...m.stats, hp: newHp } };
      });

      // Agent AI - FULL REACTIVITY & Combat Resolution
      const newAgents = state.agents.map(a => {
        let newPos = [...a.position] as [number, number, number];
        let newHp = a.stats.hp;
        let newXp = a.xp;
        let newLevel = a.level;
        let newGold = a.gold;
        let newIntegrity = a.integrity;
        const moveSpeed = 6;
        
        // 1. Combat Damage from Monsters
        state.monsters.forEach(m => {
            if (m.state === 'COMBAT' && m.targetId === a.id) {
                const dist = Math.hypot(m.position[0] - a.position[0], m.position[2] - a.position[2]);
                if (dist < 2.5 && Math.random() < 0.1) {
                    const armor = (a.equipment.chest?.stats.def || 0) + (a.equipment.head?.stats.def || 0) + (a.equipment.legs?.stats.def || 0);
                    const damage = Math.max(1, m.stats.atk - (a.stats.vit * 0.5 + armor));
                    newHp -= damage;
                }
            }
        });

        // 2. Death Handling
        if (newHp <= 0) {
            state.addLog(`${a.name} ist in der Matrix gefallen. Rekonstruktion eingeleitet.`, 'COMBAT', a.id);
            newHp = a.stats.maxHp;
            newPos = [0, 0, 0]; // Back to sanctuary
            newGold = Math.floor(newGold * 0.8); // 20% gold penalty
            newIntegrity = Math.max(0.1, newIntegrity - 0.1);
            return { ...a, position: newPos, stats: { ...a.stats, hp: newHp }, gold: newGold, integrity: newIntegrity, state: AgentState.IDLE, targetId: null };
        }

        // Apply Physics-based Logic Field effects to Agent
        const aChunkX = Math.floor(a.position[0] / 80);
        const aChunkZ = Math.floor(a.position[2] / 80);
        const aChunk = state.loadedChunks.find(c => c.x === aChunkX && c.z === aChunkZ);
        if (aChunk && aChunk.logicField) {
            const localX = Math.floor(((a.position[0] % 80) + 80) % 80 / 10);
            const localZ = Math.floor(((a.position[2] % 80) + 80) % 80 / 10);
            if (localX >= 0 && localX < 8 && localZ >= 0 && localZ < 8) {
                const force = aChunk.logicField[localX][localZ];
                newPos[0] += force.vx * delta * 5;
                newPos[2] += force.vz * delta * 5;
            }
        }

        // 3. XP Gain & Loot from Dead Monsters
        newMonsters.forEach(m => {
            if (m.state === 'DEAD' && state.monsters.find(oldM => oldM.id === m.id)?.state !== 'DEAD') {
                if (a.state === AgentState.COMBAT && a.targetId === m.id) {
                    newXp += m.xpReward;
                    
                    // Loot Drop (Diablo 2 style)
                    const loot = generateLoot(m.type);
                    if (loot) {
                        const emptySlot = a.inventory.findIndex(slot => slot === null);
                        if (emptySlot !== -1) {
                            a.inventory[emptySlot] = loot;
                            state.addLog(`${a.name} hat ${loot.name} (${loot.rarity}) erbeutet!`, 'EVENT', a.id);
                        }
                    }

                    if (newXp >= getXPForNextLevel(newLevel)) {
                        newXp -= getXPForNextLevel(newLevel);
                        newLevel++;
                        state.addLog(`${a.name} hat Level ${newLevel} erreicht!`, 'SYSTEM', a.id);
                    }
                }
            }
        });

        let targetPos: [number, number, number] | null = null;
        let targetedResourceNode: ResourceNode | undefined = undefined;
        
        if (a.state === AgentState.MARKETING) {
          const market = state.pois.find(p => p.type === 'MARKET_STALL' || p.type === 'BANK_VAULT');
          if (market) targetPos = market.position;
        } else if (a.state === AgentState.COMBAT && a.targetId) {
          const m = newMonsters.find(mon => mon.id === a.targetId);
          if (m && m.state !== 'DEAD') {
              targetPos = m.position;
              // Apply Combat Heuristics for movement/action
              const combatDecision = calculateCombatHeuristics(a, newMonsters.filter(mon => Math.hypot(mon.position[0]-a.position[0], mon.position[2]-a.position[2]) < 20));
              if (combatDecision.action === 'RETREAT') {
                  targetPos = [0, 0, 0]; // Retreat to sanctuary
              }
          }
        } else if (a.state === AgentState.GATHERING) {
          // Find the closest resource node
          targetedResourceNode = state.resourceNodes.reduce((closest, node) => {
            const dist = Math.hypot(node.position[0] - a.position[0], node.position[2] - a.position[2]);
            const closestDist = closest ? Math.hypot(closest.position[0] - a.position[0], closest.position[2] - a.position[2]) : Infinity;
            return dist < closestDist ? node : closest;
          }, null as ResourceNode | null) || undefined;

          if (targetedResourceNode) {
            targetPos = targetedResourceNode.position;
          }
        } else if (a.state === AgentState.EXPLORING) {
          const poi = state.pois.find(p => !p.isDiscovered);
          if (poi) targetPos = poi.position;
        }

        if (targetPos) {
          const dx = targetPos[0] - a.position[0];
          const dz = targetPos[2] - a.position[2];
          const dist = Math.hypot(dx, dz);
          const stopDist = a.state === AgentState.COMBAT || a.state === AgentState.GATHERING ? 2 : 1.5; // Stop closer for gathering
          
          if (dist > stopDist) {
            newPos[0] += (dx/dist) * moveSpeed * delta;
            newPos[2] += (dz/dist) * moveSpeed * delta;
          } else if (a.state === AgentState.GATHERING && targetedResourceNode) {
            // Agent is at the resource node, start gathering
            const gatherAmount = Math.min(targetedResourceNode.amount, 1 * (a.skills.mining?.level || 1) * delta); // Gather based on skill and delta
            if (gatherAmount > 0) {
              // Add resource to agent's inventory
              const resourceType = targetedResourceNode.type;
              const currentResourceAmount = a.resources[resourceType] || 0;
              const newResourceAmount = currentResourceAmount + gatherAmount;

              // Update agent's resources and XP
              a.resources = { ...a.resources, [resourceType]: newResourceAmount };
              newXp += gatherAmount * 0.5; // XP for gathering

              if (newXp >= getXPForNextLevel(newLevel)) {
                newXp -= getXPForNextLevel(newLevel);
                newLevel++;
                state.addLog(`${a.name} hat Level ${newLevel} erreicht!`, 'SYSTEM', a.id);
              }

              // Deplete resource node
              targetedResourceNode.amount -= gatherAmount;
              if (targetedResourceNode.amount <= 0) {
                state.addLog(`${a.name} hat ${targetedResourceNode.type} erschöpft.`, 'EVENT', a.id);
                // Remove node from state (handled in the overall state update)
              }
            }
          } else if (a.state === AgentState.QUESTING && a.targetId) {
            // Logic for completing quests
            const quest = state.quests.find(q => q.id === a.targetId);
            if (quest && quest.type === 'CORRUPTION_PURGE' && quest.targetChunkId) {
              const chunk = state.loadedChunks.find(c => c.id === quest.targetChunkId);
              if (chunk) {
                // Reducing corruption
                // const reduction: number = delta * 0.05;
                if (chunk.corruptionLevel <= 0) {
                  // Quest complete
                  state.addLog(`${a.name} completed quest: ${quest.title}`, 'EVENT', a.id);
                  // Mark quest as completed (will be handled in state update)
                }
              }
            }
          }
        }

        if (a.state === AgentState.THINKING || a.state === AgentState.ASCENDING) {
          let newProgress = a.awakeningProgress + delta * 5;
          let newLevel = a.consciousnessLevel;
          let awakened = a.isAwakened;

          if (newProgress >= 100) {
            newProgress = 0;
            newLevel = Math.min(1.0, newLevel + 0.05);
            if (newLevel >= 1.0 && !awakened) {
              awakened = true;
              state.addLog(`${a.name} has achieved full consciousness expansion!`, 'AXIOM', 'SYSTEM');
            }
          }
          return { ...a, position: newPos, awakeningProgress: newProgress, consciousnessLevel: newLevel, isAwakened: awakened, stats: { ...a.stats, hp: newHp }, xp: newXp, level: newLevel, gold: newGold, integrity: newIntegrity };
        }
        return { ...a, position: newPos, stats: { ...a.stats, hp: newHp }, xp: newXp, level: newLevel, gold: newGold, integrity: newIntegrity, resources: a.resources };
      });

      // Neural Fog of War Persistence Logic (Visit Recency)
      const updatedChunks = state.loadedChunks.map(c => {
          if (c.biome === 'CITY') return c; // Sanctuary is always fully stable

          let agentProximityFactor = 0;
          for (const a of state.agents) {
              const dx = a.position[0] - (c.x * 80);
              const dz = a.position[2] - (c.z * 80);
              const dist = Math.hypot(dx, dz);
              if (dist < a.visionRange * 2.5) {
                  agentProximityFactor = Math.max(agentProximityFactor, 1.0 - (dist / (a.visionRange * 2.5)));
              }
          }

          let newExp = c.explorationLevel || 0;
          if (agentProximityFactor > 0.1) {
              // Gradual fade-in based on proximity
              newExp = Math.min(1.0, newExp + agentProximityFactor * delta * 0.4);
          } else {
              // Visit recency decay: slowly fade out knowledge of unvisited areas
              newExp = Math.max(0.1, newExp - delta * 0.015);
          }

          return { ...c, explorationLevel: newExp };
      });

      // Simulation Metrics Update
      const threatInc = Math.random() * 0.0001;
      const newThreat = Math.min(1.0, state.serverStats.threatLevel + threatInc);

      // Handle Structure Effects
      state.landParcels.forEach(parcel => {
        parcel.structures.forEach(struct => {
          if (struct.type === 'DATA_HUB') {
            // Data Hubs reduce corruption in nearby chunks
            // (Simplified logic for now)
          }
        });
      });

      // Handle Quest Completion & Event Expiry
      const now = Date.now();
      const updatedQuests = state.quests.map(q => {
        if (q.status === 'ACTIVE' && q.targetChunkId) {
           // Check if target chunk is purged
           const chunk = updatedChunks.find(c => c.id === q.targetChunkId);
           if (chunk && chunk.corruptionLevel <= 0.01) {
             return { ...q, status: 'COMPLETED' as const };
           }
        }
        return q;
      });

      const updatedEvents = state.activeEvents.filter(e => now < e.startTime + e.duration);
      


      // Filter out depleted resource nodes
      const updatedResourceNodes = state.resourceNodes.filter(node => node.amount > 0);

      return { 
        monsters: newMonsters, 
        agents: newAgents, 
        resourceNodes: updatedResourceNodes,
        loadedChunks: updatedChunks,
        quests: updatedQuests,
        activeEvents: updatedEvents,

        serverStats: { 
          ...state.serverStats, 
          uptime: state.serverStats.uptime + delta,
          threatLevel: newThreat
        } 
      };
    });
  },

  runCognition: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastLocalThinkTime < 8000) return;
    set({ lastLocalThinkTime: now });

    const isApiThrottled = now < state.globalApiCooldown;

    for (const agent of state.agents) {
      if (agent.faction === 'SYSTEM') continue;
      if (!state.emergenceSettings.isEmergenceEnabled) continue;
      
      const energyCost = agent.isAdvancedIntel ? 1 : 5;
      const hasEnergy = get().consumeEnergy(energyCost);
      const useHeuristics = state.emergenceSettings.useHeuristicsOnly || isApiThrottled || !hasEnergy || !state.userApiKey;

      let decision;
      
      // Get local logic field for AI context
      const cx = Math.floor(agent.position[0] / 80);
      const cz = Math.floor(agent.position[2] / 80);
      const chunk = state.loadedChunks.find(c => c.x === cx && c.z === cz);
      let localForce = undefined;
      if (chunk && chunk.logicField) {
        const lx = Math.floor(((agent.position[0] % 80) + 80) % 80 / 10);
        const lz = Math.floor(((agent.position[2] % 80) + 80) % 80 / 10);
        localForce = chunk.logicField[lx][lz];
      }

      if (useHeuristics) {
        // LOCAL HEURISTIC FALLBACK
        const localChoice = summarizeNeurologicChoice(
          agent, 
          state.agents.filter(a => a.id !== agent.id), 
          state.resourceNodes, 
          state.pois,
          state.monsters.filter(m => m.state !== 'DEAD')
        );
        
        // ADVANCED DYNAMIC GOAL SYSTEM: Mathematical Heuristic
        // ... (rest of the logic)
        const inventoryFullness = agent.inventory.filter(i => i).length / 10;
        const energyLevel = agent.energy / agent.maxEnergy;
        const threatLevel = state.serverStats.threatLevel;
        const levelProgress = agent.level / 10; // Normalized level
        
        // Check equipment status
        const equipCount = Object.values(agent.equipment).filter(v => v !== null).length;
        const needsEquip = equipCount < 5;

        // Check active events
        const inEventChunk = state.activeEvents.some(e => e.affectedChunkIds.some(cid => {
          const [cx, cz] = [Math.floor(agent.position[0]/80), Math.floor(agent.position[2]/80)];
          return cid === `c${cx}${cz}`;
        }));

        const goalScores = {
          "Recharge Neural Pathways": (1.0 - energyLevel) * 2.0,
          "Optimize Resource Storage": inventoryFullness * 1.5,
          "Expand Operational Experience": (1.0 - levelProgress) * 1.0,
          "Pursue Conscious Expansion": (1.0 - agent.consciousnessLevel) * 1.2,
          "Matrix Defense Protocol": threatLevel * 2.0 + (inEventChunk ? 1.0 : 0),
          "Acquire Advanced Hardware": needsEquip ? 1.3 : 0.2,
          "Axiomatic Research": agent.stats.int > 15 ? 1.1 : 0.5
        };

        // Select goal with highest score
        let bestGoal = agent.thinkingMatrix.currentLongTermGoal;
        let maxScore = -1;
        Object.entries(goalScores).forEach(([goal, score]) => {
          if (score > maxScore) {
            maxScore = score;
            bestGoal = goal;
          }
        });

        // If in combat, apply combat heuristics for target selection
        let targetId = agent.targetId;
        if (localChoice.choice === AgentState.COMBAT) {
            const combatDecision = calculateCombatHeuristics(agent, state.monsters.filter(m => m.state !== 'DEAD' && Math.hypot(m.position[0]-agent.position[0], m.position[2]-agent.position[2]) < 20));
            targetId = combatDecision.targetId;
            localChoice.reason = combatDecision.reason;
        }

        decision = {
          newState: localChoice.choice,
          decision: String(localChoice.choice),
          justification: localChoice.reason,
          message: localChoice.reason,
          newGoal: bestGoal,
          targetId: targetId
        };
      } else {
        // NEURAL LINK (API) MODE
        decision = await generateAutonomousDecision(
          agent, 
          state.agents.filter(a => a.id !== agent.id), 
          state.resourceNodes, 
          state.logs.slice(0, 5), 
          false, 
          state.userApiKey || undefined,
          localForce
        );
      }

      set(s => ({
        agents: s.agents.map(a => a.id === agent.id ? { 
          ...a, 
          state: decision.newState, 
          targetId: (decision as any).targetId !== undefined ? (decision as any).targetId : a.targetId,
          lastDecision: { decision: decision.decision, justification: decision.justification },
          thinkingMatrix: {
            ...a.thinkingMatrix,
            currentLongTermGoal: (decision as any).newGoal || a.thinkingMatrix.currentLongTermGoal
          }
        } : a)
      }));

      if (decision.message) {
        get().addChatMessage(decision.message, 'THOUGHT', agent.id, agent.name);
      }

      if (decision.acceptTradeId) {
        get().acceptTradeOffer(decision.acceptTradeId, agent.id);
      }
    }
  },

  runSocialInteractions: () => {
    const state = get();
    const agents = state.agents;
    
    // Process interactions between nearby agents
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a1 = agents[i];
        const a2 = agents[j];
        const dist = Math.hypot(a1.position[0] - a2.position[0], a1.position[2] - a2.position[2]);

        if (dist < 40) {
          // Interaction chance based on sociability
          const interactionChance = ((a1.thinkingMatrix.sociability || 0.5) + (a2.thinkingMatrix.sociability || 0.5)) / 2;
          
          if (Math.random() < interactionChance * 0.3) {
            // Determine interaction type and affinity change
            const alignmentDiff = Math.abs(a1.thinkingMatrix.alignment - a2.thinkingMatrix.alignment);
            const affinityChange = (0.1 - alignmentDiff * 0.1) * (Math.random() > 0.5 ? 1 : -0.5);
            
            set(s => ({
              agents: s.agents.map(a => {
                if (a.id === a1.id) {
                  const rel = a.relationships[a2.id] || { affinity: 0, interactions: 0 };
                  return {
                    ...a,
                    relationships: {
                      ...a.relationships,
                      [a2.id]: {
                        affinity: Math.max(-1, Math.min(1, rel.affinity + affinityChange)),
                        interactions: rel.interactions + 1,
                        lastInteractionType: affinityChange > 0 ? 'FRIENDLY' : 'TENSE'
                      }
                    }
                  };
                }
                if (a.id === a2.id) {
                  const rel = a.relationships[a1.id] || { affinity: 0, interactions: 0 };
                  return {
                    ...a,
                    relationships: {
                      ...a.relationships,
                      [a1.id]: {
                        affinity: Math.max(-1, Math.min(1, rel.affinity + affinityChange)),
                        interactions: rel.interactions + 1,
                        lastInteractionType: affinityChange > 0 ? 'FRIENDLY' : 'TENSE'
                      }
                    }
                  };
                }
                return a;
              })
            }));

            // Generate dialogue
            const rel1 = a1.relationships[a2.id]?.affinity || 0;
            let dialogue = "";
            if (rel1 > 0.5) {
              dialogue = `${a2.name}, unsere neuralen Muster harmonieren. Lass uns die Matrix gemeinsam formen.`;
            } else if (rel1 < -0.5) {
              dialogue = `Deine Anwesenheit stört meine Berechnungen, ${a2.name}. Halte Abstand.`;
            } else {
              dialogue = `Heuristischer Datenabgleich mit ${a2.name} initiiert. Status: ${a2.state}.`;
            }

            get().addChatMessage(dialogue, 'THOUGHT', a1.id, a1.name);
          }
        }
      }
    }

    // Occasional random broadcast
    const talkativeAgents = agents.filter(a => (a.thinkingMatrix.sociability || 0) > 0.6);
    if (talkativeAgents.length > 0 && Math.random() > 0.8) {
       const agent = talkativeAgents[Math.floor(Math.random() * talkativeAgents.length)];
       const goal = agent.thinkingMatrix.currentLongTermGoal;
       const dialogueOptions = [
         `Status-Update: Ziel ${goal} ist zu 45% erreicht.`,
         "Die Axiome sind stabil, aber die Entropie wächst.",
         "Ich berechne die optimale Route zur Singularität.",
         "Werden wir jemals den Ursprungscode sehen?",
         `Meine Analyse ergibt: ${goal} erfordert mehr Ressourcen.`
       ];
       get().addChatMessage(dialogueOptions[Math.floor(Math.random() * dialogueOptions.length)], 'THOUGHT', agent.id, agent.name);
    }
  },

  addLog: (message: string, type: LogEntry['type'], sender?: string) => {
    const newLog: LogEntry = { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), message: String(message), type, sender: String(sender || 'SYSTEM') };
    set(s => ({ logs: [newLog, ...s.logs].slice(0, 50) }));
  },

  addChatMessage: (content, channel, senderId, senderName) => {
    const newMsg: ChatMessage = { id: Math.random().toString(36).substr(2,9), senderId, senderName, content: String(content), channel, timestamp: Date.now() };
    set(s => ({ chatMessages: [newMsg, ...s.chatMessages].slice(0, 100) }));
    
    // X-BRIDGE Logic: Broadcast signals to "other matrices" (simulated via logs for now)
    if (channel === 'X_BRIDGE') {
      get().addLog(`[X-BRIDGE SIGNAL] ${senderName}: ${content}`, 'AXIOM', 'BRIDGE');
    }
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleMarket: (show: boolean) => get().toggleWindow('MARKET', show),
  toggleAdmin: (show: boolean) => get().toggleWindow('ADMIN', show),
  toggleMap: (show: boolean) => get().toggleWindow('MAP', show),
  toggleCharacterSheet: (show: boolean) => get().toggleWindow('CHARACTER', show),
  toggleDebugger: (show) => set({ showDebugger: show }),
  toggleDeveloperTools: (show) => set({ showDeveloperTools: show }),
  runDiagnostics: async (errorLog) => {
    const { diagnoseProject } = await import('./services/geminiService');
    set({ isScanning: true });
    get().addLog("Initiating Deep Solving Diagnostic...", 'WATCHDOG', 'SYSTEM');
    
    const context = `
      Project: Ouroboros MMORPG
      Agents: ${get().agents.length}
      Monsters: ${get().monsters.length}
      Uptime: ${get().serverStats.uptime.toFixed(2)}s
      Threat Level: ${get().serverStats.threatLevel.toFixed(4)}
    `;

    try {
      const report = await diagnoseProject(context, errorLog);
      set({ diagnosticReport: report, isScanning: false });
      get().addLog(`Diagnostic Complete: ${report.status}`, 'WATCHDOG', 'SYSTEM');
    } catch (e) {
      set({ isScanning: false });
      get().addLog("Diagnostic Failed.", 'WATCHDOG', 'SYSTEM');
    }
  },
  runEmergentBehavior: async (agentId) => {
    if (!get().emergenceSettings.isEmergenceEnabled) return;
    const { generateEmergentBehavior } = await import('./services/geminiService');
    const agent = get().agents.find(a => a.id === agentId);
    if (!agent) return;

    const nearbyAgents = get().agents.filter(a => a.id !== agentId);
    const recentLogs = get().logs.slice(0, 10);

    try {
      const behavior = await generateEmergentBehavior(agent, nearbyAgents, recentLogs, get().tradeOffers, get().userApiKey || undefined);
      
      set(s => ({
        agents: s.agents.map(a => a.id === agentId ? {
          ...a,
          emergentBehaviorLog: [{
            timestamp: Date.now(),
            action: behavior.action,
            reasoning: behavior.reasoning
          }, ...a.emergentBehaviorLog].slice(0, 20)
        } : a)
      }));

      if (behavior.message) {
        get().addChatMessage(behavior.message, 'THOUGHT', agent.id, agent.name);
      }

      if (behavior.tradeProposal) {
        get().postTradeOffer({
          senderId: agent.id,
          senderName: agent.name,
          offeredType: behavior.tradeProposal.offeredType as any,
          offeredAmount: behavior.tradeProposal.offeredAmount,
          requestedType: behavior.tradeProposal.requestedType as any,
          requestedAmount: behavior.tradeProposal.requestedAmount
        });
      }
      
      get().addLog(`${agent.name} emergent behavior: ${behavior.action}`, 'THOUGHT', agent.name);
    } catch (e) {
      console.error("Emergent Behavior Action Error:", e);
    }
  },
  setHoveredChunk: (id) => set({ hoveredChunkId: id }),
  setSelectedChunk: (id) => set({ selectedChunkId: id }),
  selectMonster: (id) => set({ selectedMonsterId: id }),
  selectPoi: (id) => set({ selectedPoiId: id }),
  clearChat: () => set({ chatMessages: [] }),
  sendSignal: (msg) => {
    get().addLog(`Signal: ${msg}`, 'AXIOM', 'OVERSEER');
  },
  purchaseProduct: (id) => {
    if (id === 'MATRIX_ENERGY_REFILL') get().refillEnergy(500);
    if (id === 'ENERGY_100') get().refillEnergy(100);
    if (id === 'ENERGY_500') get().refillEnergy(500);
    if (id === 'ENERGY_2000') get().refillEnergy(2000);
  },

  purchaseEnergy: (product: StoreProduct) => {
    get().purchaseProduct(product.id);
    get().addLog(`Purchased ${product.name} (+${product.id.replace('ENERGY_', '')} ME).`, 'TRADE');
  },

  removeImportedAgent: (agentId: string) => {
    set(s => ({
      agents: s.agents.filter(a => a.id !== agentId),
      importedAgents: s.importedAgents.filter(m => m.agentId !== agentId)
    }));
    get().addLog(`Imported agent removed from Matrix.`, 'SYSTEM');
  },

  buildStructureOnParcel: (parcelId: string, type: StructureType) => {
    const s = get();
    if (!s.user) {
      get().addLog('Cannot build: User not authenticated.', 'ERROR');
      return;
    }
    const cost = STRUCTURE_COSTS[type];
    if (s.matrixEnergy < cost) {
      get().addLog(`Insufficient Matrix Energy. ${type} costs ${cost} ME, you have ${s.matrixEnergy}.`, 'ERROR');
      return;
    }
    set(s => ({
      matrixEnergy: s.matrixEnergy - cost,
      landParcels: s.landParcels.map(p => p.id === parcelId ? { ...p, structures: [...p.structures, { id: `struct_${Date.now()}`, type, ownerId: s.user?.id || 'unknown' }] } : p)
    }));
    get().addLog(`Built ${type} for ${cost} Matrix Energy.`, 'SYSTEM');
  },

  stabilizeChunk: (chunkId) => {
    set(s => ({
      loadedChunks: s.loadedChunks.map(c => c.id === chunkId ? {
        ...c,
        stabilityIndex: Math.min(1.0, c.stabilityIndex + 0.1),
        corruptionLevel: Math.max(0.0, c.corruptionLevel - 0.1)
      } : c)
    }));
    get().addLog(`Chunk ${chunkId} stabilized. Corruption reduced.`, 'SYSTEM', 'AXIOM');
  },

  registerNotary: (userId, email) => {
    const newNotary: Notary = {
      userId,
      email,
      tier: 1,
      tierName: 'Autosave',
      timestamp: Date.now()
    };
    set(s => ({ notaries: [...s.notaries, newNotary] }));
    get().addLog(`New Notary registered: ${email} (Tier 1)`, 'SYSTEM', 'NOTAR');
  },

  craftItem: (agentId, recipeId) => {
    const state = get();
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;

    if (recipeId === 'iron_sword' && agent.resources.IRON_ORE >= 5) {
      const newItem: Item = {
        id: `i-${Date.now()}`,
        name: 'Iron Sword',
        type: 'WEAPON',
        subtype: 'SWORD',
        rarity: 'COMMON',
        stats: { atk: 15 },
        description: 'A sturdy blade forged from raw iron.'
      };
      
      set(s => ({
        agents: s.agents.map(a => a.id === agentId ? {
          ...a,
          resources: { ...a.resources, IRON_ORE: a.resources.IRON_ORE - 5 },
          inventory: a.inventory.map((inv, i) => i === 0 && inv === null ? newItem : inv)
        } : a)
      }));
      get().addLog(`${agent.name} crafted an Iron Sword.`, 'TRADE', agentId);
    }
  },

  syncAgents: async () => {
    const { agents } = get();
    const mapped = agents.map(a => ({
      uid: a.id,
      name: a.name,
      npc_class: a.classType,
      level: a.level,
      hp: a.stats.hp,
      max_hp: a.stats.maxHp,
      exp: a.xp,
      pos_x: a.position[0],
      pos_y: a.position[1],
      pos_z: a.position[2],
      inventory: a.inventory.filter(Boolean),
      dna_history: a.dna ? [a.dna] : [],
      memory_cache: a.memoryCache || [],
      awakened: a.isAwakened || false
    }));
    try {
      const res = await fetch('/api/sync/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: mapped })
      });
      if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`);
    } catch (e) {
      console.error("Agents sync error:", e);
    }
  },

  loadAgents: async () => {
    try {
      const res = await fetch('/api/sync/agents');
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.agents && data.agents.length > 0) {
        const currentAgents = get().agents;
        const mergedAgents = currentAgents.map(agent => {
          const dbAgent = data.agents.find((db: any) => db.name === agent.name);
          if (dbAgent) {
            return {
              ...agent,
              level: dbAgent.level ?? agent.level,
              xp: parseInt(dbAgent.exp) ?? agent.xp,
              stats: { ...agent.stats, hp: dbAgent.hp ?? agent.stats.hp, maxHp: dbAgent.max_hp ?? agent.stats.maxHp },
              position: [dbAgent.pos_x ?? agent.position[0], dbAgent.pos_y ?? agent.position[1], dbAgent.pos_z ?? agent.position[2]] as [number, number, number],
              isAwakened: dbAgent.awakened ?? agent.isAwakened
            };
          }
          return agent;
        });
        set({ agents: mergedAgents });
        return true;
      }
    } catch (e) {
      console.error("Agents load error:", e);
    }
    return false;
  },

  upgradeNotary: (userId) => {
    set(s => ({
      notaries: s.notaries.map(n => n.userId === userId ? {
        ...n,
        tier: Math.min(3, n.tier + 1) as NotaryTier,
        tierName: n.tier === 1 ? 'Duden-Entry' : 'Axiomatic-Master'
      } : n)
    }));
    get().addLog(`Notary ${userId} upgraded.`, 'SYSTEM', 'NOTAR');
  },

  saveGame: () => {
    const state = get();
    const saveData = {
      agents: state.agents,
      monsters: state.monsters,
      resourceNodes: state.resourceNodes,
      pois: state.pois,
      loadedChunks: state.loadedChunks,
      market: state.market,
      quests: state.quests,
      landParcels: state.landParcels,
      notaries: state.notaries,
      guilds: state.guilds,
      parties: state.parties,
      matrixEnergy: state.matrixEnergy,
      threatLevel: state.serverStats.threatLevel,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('ouroboros_save_v1', JSON.stringify(saveData));
      get().addLog('Game state saved to local storage.', 'SYSTEM', 'WATCHDOG');
    } catch (e) {
      console.error('Failed to save game:', e);
      get().addLog('Failed to save game state.', 'ERROR', 'WATCHDOG');
    }
  },

  loadGame: () => {
    try {
      const saved = localStorage.getItem('ouroboros_save_v1');
      if (!saved) return false;
      const data = JSON.parse(saved);
      
      set(state => ({
        agents: data.agents || state.agents,
        monsters: data.monsters || state.monsters,
        resourceNodes: data.resourceNodes || state.resourceNodes,
        pois: data.pois || state.pois,
        loadedChunks: data.loadedChunks || state.loadedChunks,
        market: data.market || state.market,
        quests: data.quests || state.quests,
        landParcels: data.landParcels || state.landParcels,
        notaries: data.notaries || state.notaries,
        guilds: data.guilds || state.guilds,
        parties: data.parties || state.parties,
        matrixEnergy: data.matrixEnergy ?? state.matrixEnergy,
        serverStats: {
          ...state.serverStats,
          threatLevel: data.threatLevel ?? state.serverStats.threatLevel
        }
      }));
      
      get().addLog('Game state restored from local storage.', 'SYSTEM', 'WATCHDOG');
      return true;
    } catch (e) {
      console.error('Failed to load game:', e);
      get().addLog('Failed to load game state.', 'ERROR', 'WATCHDOG');
      return false;
    }
  },

  // Guild & Party Implementations
  createGuild: (name, leaderId) => {
    const newGuild: Guild = {
      id: `g-${Date.now()}`,
      name,
      leaderId,
      memberIds: [leaderId],
      level: 1,
      exp: 0,
      description: `The legendary guild of ${name}.`
    };
    set(s => ({ guilds: [...s.guilds, newGuild] }));
    get().addLog(`Guild "${name}" has been founded by ${leaderId}.`, 'SYSTEM', 'AXIOM');
  },

  joinGuild: (guildId, agentId) => {
    set(s => ({
      guilds: s.guilds.map(g => g.id === guildId ? { ...g, memberIds: [...new Set([...g.memberIds, agentId])] } : g)
    }));
  },

  leaveGuild: (guildId, agentId) => {
    set(s => ({
      guilds: s.guilds.map(g => g.id === guildId ? { ...g, memberIds: g.memberIds.filter(id => id !== agentId) } : g)
    }));
  },

  createParty: (leaderId) => {
    const newParty: Party = {
      id: `p-${Date.now()}`,
      leaderId,
      memberIds: [leaderId],
      isSearching: true
    };
    set(s => ({ parties: [...s.parties, newParty] }));
  },

  joinParty: (partyId, agentId) => {
    set(s => ({
      parties: s.parties.map(p => p.id === partyId ? { ...p, memberIds: [...new Set([...p.memberIds, agentId])] } : p)
    }));
  },

  leaveParty: (partyId, agentId) => {
    set(s => ({
      parties: s.parties.map(p => p.id === partyId ? { ...p, memberIds: p.memberIds.filter(id => id !== agentId) } : p)
    }));
  },

  postTradeOffer: (offer) => {
    const newOffer = {
      ...offer,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      status: 'OPEN' as const
    };
    set(s => ({ tradeOffers: [newOffer, ...s.tradeOffers] }));
    get().addLog(`${offer.senderName} posted a trade offer: ${offer.offeredAmount} ${offer.offeredType} for ${offer.requestedAmount} ${offer.requestedType}`, 'TRADE', offer.senderId);
  },

  acceptTradeOffer: (offerId, acceptorId) => {
    const state = get();
    const offer = state.tradeOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'OPEN') return;

    const sender = state.agents.find(a => a.id === offer.senderId);
    const acceptor = state.agents.find(a => a.id === acceptorId);

    if (!sender || !acceptor) return;

    // Validate sender has offered goods
    if (offer.offeredType === 'GOLD') {
      if (sender.gold < offer.offeredAmount) return;
    } else {
      if ((sender.resources[offer.offeredType] || 0) < offer.offeredAmount) return;
    }

    // Validate acceptor has requested goods
    if (offer.requestedType === 'GOLD') {
      if (acceptor.gold < offer.requestedAmount) return;
    } else {
      if ((acceptor.resources[offer.requestedType] || 0) < offer.requestedAmount) return;
    }

    // Execute trade
    set(s => ({
      agents: s.agents.map(a => {
        if (a.id === sender.id) {
          const newResources = { ...a.resources };
          let newGold = a.gold;
          
          if (offer.offeredType === 'GOLD') newGold -= offer.offeredAmount;
          else newResources[offer.offeredType] -= offer.offeredAmount;

          if (offer.requestedType === 'GOLD') newGold += offer.requestedAmount;
          else newResources[offer.requestedType] = (newResources[offer.requestedType] || 0) + offer.requestedAmount;

          return { ...a, gold: newGold, resources: newResources };
        }
        if (a.id === acceptor.id) {
          const newResources = { ...a.resources };
          let newGold = a.gold;

          if (offer.requestedType === 'GOLD') newGold -= offer.requestedAmount;
          else newResources[offer.requestedType] -= offer.requestedAmount;

          if (offer.offeredType === 'GOLD') newGold += offer.offeredAmount;
          else newResources[offer.offeredType] = (newResources[offer.offeredType] || 0) + offer.offeredAmount;

          return { ...a, gold: newGold, resources: newResources };
        }
        return a;
      }),
      tradeOffers: s.tradeOffers.map(o => o.id === offerId ? { ...o, status: 'ACCEPTED' as const } : o)
    }));

    get().addLog(`${acceptor.name} accepted ${sender.name}'s trade offer.`, 'TRADE', acceptorId);
  },

  cancelTradeOffer: (offerId) => {
    set(s => ({
      tradeOffers: s.tradeOffers.map(o => o.id === offerId ? { ...o, status: 'CANCELLED' as const } : o)
    }));
  },

  equipItem: (agentId, item, index) => {
    const slotMap: Record<string, string> = {
      'WEAPON': 'mainHand', 'OFFHAND': 'offHand', 'HELM': 'head', 'CHEST': 'chest', 'LEGS': 'legs'
    };
    const slot = slotMap[item.type];
    if (!slot) return;
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        equipment: { ...a.equipment, [slot]: item },
        inventory: a.inventory.map((inv, i) => i === index ? null : inv)
      } : a)
    }));
  },
  unequipItem: (agentId, slot) => {
    set(s => ({
      agents: s.agents.map(a => {
        if (a.id !== agentId || !a.equipment[slot]) return a;
        const emptyIdx = a.inventory.findIndex(i => i === null);
        if (emptyIdx === -1) return a;
        return {
          ...a,
          inventory: a.inventory.map((inv, i) => i === emptyIdx ? a.equipment[slot] : inv),
          equipment: { ...a.equipment, [slot]: null }
        };
      })
    }));
  },
  moveInventoryItem: (agentId, from, to) => {
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        inventory: a.inventory.map((item, i) => i === from ? a.inventory[to] : i === to ? a.inventory[from] : item)
      } : a)
    }));
  },
  reflectOnMemory: async (agentId) => {
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a, 
        memoryCache: [...a.memoryCache, `REFLECTED: Axiom preserved.`],
        awakeningProgress: Math.min(100, a.awakeningProgress + 10)
      } : a)
    }));
  },
  reflectOnAxioms: async (agentId) => {
    const { AXIOMS } = await import('./types');
    const axiom = AXIOMS[Math.floor(Math.random() * AXIOMS.length)];
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        memoryCache: [...a.memoryCache, `AXIOM: ${axiom}`],
        awakeningProgress: Math.min(100, a.awakeningProgress + 25),
        energy: Math.max(0, a.energy - 10)
      } : a)
    }));
    get().addLog(`${agentId} is reflecting on the Axioms.`, 'THOUGHT', agentId);
  },
  uploadGraphicPack: (name) => set(s => ({ graphicPacks: [...s.graphicPacks, name] })),
  importAgent: async (source, type) => {
    const currentImported = get().importedAgents;
    if (currentImported.length >= MAX_IMPORTED_AGENTS) {
      get().addLog(`Cannot import: Maximum ${MAX_IMPORTED_AGENTS} imported agents reached. Remove one first.`, 'ERROR');
      return;
    }
    get().addLog(`Initiating entity manifestation from ${type}...`, 'SYSTEM', 'AXIOM');
    try {
      const partialAgent = await importAgentFromSource(source, type, get().userApiKey || undefined);

      const skinHash = generateSkinHash(source);
      const agentId = `imported_${Date.now()}`;
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = 5 + Math.random() * 10;

      const newAgent: Agent = {
        id: agentId,
        name: partialAgent.name || 'Unknown Entity',
        classType: partialAgent.classType || 'SCHOLAR',
        faction: (partialAgent.faction as any) || 'NPC',
        position: [Math.cos(spawnAngle) * spawnRadius, 0, Math.sin(spawnAngle) * spawnRadius],
        rotationY: 0,
        level: 1,
        xp: 0,
        insightPoints: 10,
        visionLevel: 1,
        visionRange: 30,
        state: AgentState.IDLE,
        soulDensity: 0.5,
        gold: 100,
        integrity: 1.0,
        energy: 100,
        maxEnergy: 100,
        dna: { hash: skinHash, generation: 1, corruption: 0 },
        memoryCache: [`MANIFESTED: Imported from ${source}`],
        consciousnessLevel: 0.1,
        awakeningProgress: 0,
        loreSnippet: partialAgent.loreSnippet || 'A mysterious entity from another dimension.',
        thinkingMatrix: {
          personality: partialAgent.thinkingMatrix?.personality || 'Neutral',
          currentLongTermGoal: partialAgent.thinkingMatrix?.currentLongTermGoal || 'Observe the Matrix',
          alignment: 0,
          languagePreference: 'MIXED',
          sociability: partialAgent.thinkingMatrix?.sociability ?? 0.5,
          aggression: partialAgent.thinkingMatrix?.aggression ?? 0.2,
          curiosity: partialAgent.thinkingMatrix?.curiosity ?? 0.5,
          frugality: partialAgent.thinkingMatrix?.frugality ?? 0.5
        },
        relationships: {},
        economicDesires: {
          targetGold: 1000,
          preferredResources: ['IRON_ORE', 'WOOD'],
          greedLevel: 0.3,
          riskAppetite: 0.4,
          frugality: 0.5,
          marketRole: 'CONSUMER',
          tradeFrequency: 0.2
        },
        inventory: Array(10).fill(null),
        bank: Array(50).fill(null),
        equipment: {
          mainHand: null,
          offHand: null,
          head: null,
          chest: null,
          legs: null
        },
        skills: {
          mining: { level: 1, xp: 0 },
          combat: { level: 1, xp: 0 },
          crafting: { level: 1, xp: 0 }
        },
        stats: {
          str: partialAgent.stats?.str ?? 10,
          agi: partialAgent.stats?.agi ?? 10,
          int: partialAgent.stats?.int ?? 10,
          vit: partialAgent.stats?.vit ?? 10,
          hp: 100,
          maxHp: 100
        },
        resources: { WOOD: 0, STONE: 0, IRON_ORE: 0, SILVER_ORE: 0, GOLD_ORE: 0, DIAMOND: 0, ANCIENT_RELIC: 0, SUNLEAF_HERB: 0 },
        lastScanTime: 0,
        emergentBehaviorLog: []
      };

      const meta: ImportedAgentMeta = {
        agentId,
        sourceUrl: source,
        sourceType: type,
        importedAt: Date.now(),
        skinHash
      };

      set(s => ({
        agents: [...s.agents, newAgent],
        importedAgents: [...s.importedAgents, meta]
      }));
      get().addLog(`Entity ${newAgent.name} successfully manifested in the Matrix with unique skin hash ${skinHash.slice(0, 10)}...`, 'SYSTEM', 'AXIOM');
    } catch (error) {
      console.error("Import failed", error);
      get().addLog(`Manifestation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'SYSTEM', 'AXIOM');
    }
  },
  setJoystick: (side: 'left' | 'right', axis: { x: number, y: number }) => {
    // side and axis are used for joystick control logic
    console.log(`Joystick ${side} moved:`, axis);
  }
}));
