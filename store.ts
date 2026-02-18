
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Item, 
  Monster, MonsterType, MONSTER_TEMPLATES, ChatChannel, ResourceType, POI, CraftingOrder, MarketState, Quest, LandParcel
} from './types';
import { getBiomeForChunk, generateProceduralPOIs } from './utils';
import { generateAutonomousDecision } from './services/geminiService';

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
  auctionHouse: any[];
  activeEvents: any[];
  graphicPacks: string[];
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  user: { id: string; name: string; email: string };
  device: { isMobile: boolean };
  lastLocalThinkTime: number;
  showMarket: boolean;
  showAdmin: boolean;
  showMap: boolean;
  showCharacterSheet: boolean;
  isAxiomAuthenticated: boolean;

  initGame: () => void;
  updatePhysics: (delta: number) => void;
  runCognition: () => void;
  runSocialInteractions: () => void;
  addLog: (message: string, type: LogEntry['type'], sender?: string) => void;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
  toggleMarket: (show: boolean) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  toggleCharacterSheet: (show: boolean) => void;
  setAxiomAuthenticated: (auth: boolean) => void;
  sendSignal: (msg: string) => void;
  purchaseProduct: (id: string) => void;
  equipItem: (agentId: string, item: Item, index: number) => void;
  unequipItem: (agentId: string, slot: keyof Agent['equipment']) => void;
  moveInventoryItem: (agentId: string, from: number, to: number) => void;
  reflectOnMemory: (agentId: string) => Promise<void>;
  uploadGraphicPack: (name: string) => void;
  importAgent: (source: string, type: 'URL' | 'JSON') => void;
  setJoystick: (side: 'left' | 'right', axis: { x: number, y: number }) => void;
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
  auctionHouse: [],
  activeEvents: [],
  graphicPacks: ['Default Architecture'],
  market: {
    prices: { WOOD: 5, STONE: 8, IRON_ORE: 15, SILVER_ORE: 40, GOLD_ORE: 100, DIAMOND: 500, ANCIENT_RELIC: 1000, SUNLEAF_HERB: 25 },
    inventory: { WOOD: 100, STONE: 100, IRON_ORE: 50, SILVER_ORE: 10, GOLD_ORE: 5, DIAMOND: 1, ANCIENT_RELIC: 0, SUNLEAF_HERB: 20 }
  },
  craftingOrders: [],
  selectedAgentId: null,
  cameraTarget: null,
  serverStats: { uptime: 0, tickRate: 60, memoryUsage: 128, threatLevel: 0.05 },
  user: { id: 'u1', name: 'Admin', email: 'projectouroboroscollective@gmail.com' },
  device: { isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) },
  lastLocalThinkTime: 0,
  showMarket: false,
  showAdmin: false,
  showMap: false,
  showCharacterSheet: false,
  isAxiomAuthenticated: false,

  initGame: () => {
    const initialChunks: Chunk[] = [
        { id: 'c00', x: 0, z: 0, biome: 'CITY', entropy: 0.1, explorationLevel: 1.0 },
        { id: 'c10', x: 1, z: 0, biome: getBiomeForChunk(1,0), entropy: 0.2, explorationLevel: 0.0 },
    ];

    const initialAgents: Agent[] = [
        {
            id: 'a1', name: 'Aurelius', classType: 'Scribe', faction: 'PLAYER', position: [0, 0, 0], rotationY: 0, level: 1, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 20, state: AgentState.IDLE, soulDensity: 1, gold: 100, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x1', generation: 1, corruption: 0 }, memoryCache: [], thinkingMatrix: { personality: 'Wise', currentLongTermGoal: 'Archive', alignment: 0.5, languagePreference: 'DE', sociability: 0.8 },
            skills: { mining: { level: 1, xp: 0 }, crafting: { level: 1, xp: 0 }, combat: { level: 1, xp: 0 } }, inventory: Array(10).fill(null), bank: Array(50).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }, lastScanTime: 0, isAwakened: true
        },
        {
          id: 'a2', name: 'Vulcan', classType: 'Blacksmith', faction: 'NPC', position: [-5, 0, 5], rotationY: 0, level: 3, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 15, state: AgentState.IDLE, soulDensity: 0.8, gold: 50, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x2', generation: 1, corruption: 0 }, memoryCache: [], thinkingMatrix: { personality: 'Gruff', currentLongTermGoal: 'Forge Perfection', alignment: 0.1, languagePreference: 'EN', aggression: 0.4 },
          skills: { mining: { level: 2, xp: 0 }, crafting: { level: 8, xp: 0 }, combat: { level: 4, xp: 0 } }, inventory: Array(10).fill(null), bank: Array(50).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 15, agi: 8, int: 5, vit: 15, hp: 150, maxHp: 150 }, lastScanTime: 0, isAwakened: false
        }
    ];

    const initialMonsters: Monster[] = [
      { id: 'm1', type: 'SLIME', name: 'Void Slime', position: [25, 0, 25], rotationY: 0, stats: { ...MONSTER_TEMPLATES.SLIME, maxHp: 30 }, xpReward: 15, state: 'IDLE', targetId: null, color: '#22c55e', scale: 0.5 },
      { id: 'm2', type: 'GOBLIN', name: 'Scavenger', position: [-30, 0, 40], rotationY: 0, stats: { ...MONSTER_TEMPLATES.GOBLIN, maxHp: 60 }, xpReward: 40, state: 'IDLE', targetId: null, color: '#84cc16', scale: 0.8 }
    ];

    set({ loadedChunks: initialChunks, agents: initialAgents, monsters: initialMonsters, pois: generateProceduralPOIs(10) });
    get().addLog("ADMIN: Welt initialisiert. Marktplatz eröffnet.", 'SYSTEM', 'NOTAR');
  },

  updatePhysics: (delta) => {
    set(state => {
      // Monster AI
      const newMonsters = state.monsters.map(m => {
        if (m.state === 'DEAD') return m;
        let newPos = [...m.position] as [number, number, number];
        let newState = m.state;
        let newTargetId = m.targetId;
        const closestAgent = state.agents.find(a => Math.hypot(a.position[0]-m.position[0], a.position[2]-m.position[2]) < 10);
        if (closestAgent) {
          newState = 'COMBAT';
          newTargetId = closestAgent.id;
          const dx = closestAgent.position[0] - m.position[0];
          const dz = closestAgent.position[2] - m.position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 1.5) {
            newPos[0] += (dx/dist) * 4 * delta;
            newPos[2] += (dz/dist) * 4 * delta;
          }
        } else {
          newState = 'IDLE';
          newTargetId = null;
        }
        return { ...m, position: newPos, state: newState, targetId: newTargetId };
      });

      // Agent AI
      const newAgents = state.agents.map(a => {
        let newPos = [...a.position] as [number, number, number];
        if (a.state === AgentState.MARKETING) {
           const market = state.pois.find(p => p.type === 'MARKET_STALL');
           if (market) {
              const dx = market.position[0] - a.position[0];
              const dz = market.position[2] - a.position[2];
              const dist = Math.hypot(dx, dz);
              if (dist > 1.5) {
                 newPos[0] += (dx/dist) * 10 * delta;
                 newPos[2] += (dz/dist) * 10 * delta;
              }
           }
        }
        return { ...a, position: newPos };
      });

      return { monsters: newMonsters, agents: newAgents, serverStats: { ...state.serverStats, uptime: state.serverStats.uptime + delta } };
    });
  },

  runCognition: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastLocalThinkTime < 8000) return;
    set({ lastLocalThinkTime: now });

    for (const agent of state.agents) {
      if (agent.faction === 'SYSTEM') continue;
      const decision = await generateAutonomousDecision(agent, state.agents.filter(a => a.id !== agent.id), state.resourceNodes, state.logs.slice(0, 5), false, true);
      set(s => ({
        agents: s.agents.map(a => a.id === agent.id ? { 
          ...a, 
          state: decision.newState, 
          lastDecision: { decision: decision.decision, justification: decision.justification } 
        } : a)
      }));
    }
  },

  runSocialInteractions: () => {
    // Simulated social logic loop
  },

  addLog: (message, type, sender) => {
    const newLog: LogEntry = { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), message: String(message), type, sender: String(sender || 'SYSTEM') };
    set(s => ({ logs: [newLog, ...s.logs].slice(0, 50) }));
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleMarket: (show) => set({ showMarket: show }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  sendSignal: (msg) => {
    get().addLog(`Signal: ${msg}`, 'AXIOM', 'OVERSEER');
  },
  purchaseProduct: (id) => {
    get().addLog(`Purchased product: ${id}`, 'TRADE', 'SYSTEM');
  },
  equipItem: (agentId, item, index) => {
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        equipment: { ...a.equipment, [item.type.toLowerCase()]: item },
        inventory: a.inventory.map((inv, i) => i === index ? null : inv)
      } : a)
    }));
  },
  unequipItem: (agentId, slot) => {
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        inventory: [...a.inventory.filter(i => i), a.equipment[slot]],
        equipment: { ...a.equipment, [slot]: null }
      } : a)
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
    get().addLog(`Agent ${agentId} is reflecting on memories...`, 'THOUGHT', agentId);
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        memoryCache: [...a.memoryCache, `REFLECTED: Consistency maintained at ${new Date().toLocaleTimeString()}`]
      } : a)
    }));
  },
  uploadGraphicPack: (name) => {
    set(s => ({ graphicPacks: [...s.graphicPacks, name] }));
  },
  importAgent: (source, type) => {
    get().addLog(`Importing entity from ${type}...`, 'SYSTEM', 'NOTAR');
  },
  setJoystick: (side, axis) => {
    // Handle joystick input for movement/camera
  }
})));
