
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Quest, Item, StructureType, LandParcel, Structure,
  Monster, MonsterType, MONSTER_TEMPLATES, Battle, ActionProposal
} from './types';
import { getBiomeForChunk, summarizeNeurologicChoice } from './utils';
import { generateAutonomousDecision, analyzeMemories, generateSocialResponse, evaluateActionProposal } from './services/geminiService';
import { CharacterImporter } from './services/CharacterImporter';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ServerStats {
  uptime: number;
  tickRate: number;
  memoryUsage: number;
  threatLevel: number;
}

export interface Event {
  id: string;
  type: 'RAID' | 'FESTIVAL';
  active: boolean;
  title: string;
  description: string;
}

interface GameState {
  agents: Agent[];
  monsters: Monster[];
  resourceNodes: ResourceNode[];
  logs: LogEntry[];
  chatMessages: ChatMessage[];
  battles: Battle[];
  actionProposals: ActionProposal[];
  
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  loadedChunks: Chunk[];
  globalJackpot: number;
  stability: number;
  lastLocalThinkTime: number;
  lastCombatTick: number;
  
  user: User;
  isAxiomAuthenticated: boolean;
  hasNotaryLicense: boolean;
  agentSlots: number;
  device: { isMobile: boolean };
  serverStats: ServerStats;
  landParcels: LandParcel[];
  auctionHouse: any[];
  activeEvents: Event[];
  showCharacterSheet: boolean;
  showAdmin: boolean;
  showMap: boolean;
  graphicPacks: string[];
  quests: Quest[];

  // Actions
  initGame: () => void;
  updatePhysics: (delta: number) => void;
  runCognition: () => void;
  addLog: (message: string, type: LogEntry['type'], sender?: string) => void;
  sendSignal: (content: string) => Promise<void>;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
  toggleCharacterSheet: (show: boolean) => void;
  toggleMount: (agentId: string) => void;
  equipItem: (agentId: string, item: Item, inventoryIndex: number) => void;
  unequipItem: (agentId: string, slot: string) => void;
  moveInventoryItem: (agentId: string, from: number, to: number) => void;
  purchaseProduct: (productId: string) => void;
  setAxiomAuthenticated: (auth: boolean) => void;
  toggleAdmin: (show: boolean) => void;
  uploadGraphicPack: (name: string) => void;
  importAgent: (source: string, type: 'URL' | 'JSON') => void;
  toggleMap: (show: boolean) => void;
  setJoystick: (side: 'left' | 'right', value: { x: number, y: number }) => void;
  buildStructure: (parcelId: string, type: StructureType) => void;
  certifyParcel: (parcelId: string) => void;
  reflectOnMemory: (agentId: string) => Promise<void>;
}

// Fixed: Correctly exported useStore and implemented all missing actions required by the UI components.
export const useStore = create<GameState>((set, get) => ({
  agents: [],
  monsters: [],
  resourceNodes: [],
  logs: [],
  chatMessages: [],
  battles: [],
  actionProposals: [],
  selectedAgentId: null,
  cameraTarget: null,
  loadedChunks: [],
  globalJackpot: 1000,
  stability: 1.0,
  lastLocalThinkTime: 0,
  lastCombatTick: 0,
  user: { id: 'user_1', name: 'Admin', email: 'projectouroboroscollective@gmail.com' },
  isAxiomAuthenticated: false,
  hasNotaryLicense: false,
  agentSlots: 5,
  device: { isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) },
  serverStats: { uptime: 0, tickRate: 60, memoryUsage: 128, threatLevel: 0.05 },
  landParcels: [],
  auctionHouse: [],
  activeEvents: [],
  showCharacterSheet: false,
  showAdmin: false,
  showMap: false,
  graphicPacks: ['Standard Assets'],
  quests: [],

  initGame: () => {
    const initialChunks: Chunk[] = [
        { id: 'c00', x: 0, z: 0, biome: 'CITY', entropy: 0.1 },
        { id: 'c10', x: 1, z: 0, biome: getBiomeForChunk(1,0), entropy: 0.2 },
        { id: 'c01', x: 0, z: 1, biome: getBiomeForChunk(0,1), entropy: 0.2 },
        { id: 'c-10', x: -1, z: 0, biome: getBiomeForChunk(-1,0), entropy: 0.2 },
        { id: 'c0-1', x: 0, z: -1, biome: getBiomeForChunk(0,-1), entropy: 0.2 },
    ];

    const initialAgents: Agent[] = [
        {
            id: 'agent_1',
            name: 'Aurelius',
            classType: 'Scribe',
            faction: 'PLAYER',
            position: [0, 0, 0],
            rotationY: 0,
            level: 1,
            xp: 0,
            state: AgentState.IDLE,
            soulDensity: 0.8,
            gold: 500,
            stabilityIndex: 1.0,
            energy: 100,
            maxEnergy: 100,
            integrity: 0.95,
            dna: { hash: '0xABC123', generation: 1, corruption: 0 },
            memoryCache: ['Neural link established.'],
            thinkingMatrix: { personality: 'Philosophical', currentLongTermGoal: 'Archive Reality', alignment: 0.2, languagePreference: 'DE' },
            skills: { mining: 1, woodcutting: 1 },
            inventory: Array(20).fill(null),
            equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
            stats: { str: 10, agi: 10, int: 15, vit: 12, hp: 120, maxHp: 120 }
        }
    ];

    const parcels: LandParcel[] = [
        { id: 'p1', name: 'Axiom Lot A', ownerId: null, position: [15, 0, 15], isCertified: false, structures: [], price: 200 },
        { id: 'p2', name: 'Axiom Lot B', ownerId: null, position: [-15, 0, 15], isCertified: false, structures: [], price: 200 }
    ];

    set({ loadedChunks: initialChunks, agents: initialAgents, landParcels: parcels });
  },

  updatePhysics: (delta) => {
    set(state => {
        const newAgents = state.agents.map(agent => {
            if (agent.state === AgentState.IDLE && Math.random() > 0.99) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 5;
                return {
                    ...agent,
                    position: [agent.position[0] + Math.cos(angle) * dist, agent.position[1], agent.position[2] + Math.sin(angle) * dist] as [number, number, number]
                };
            }
            return agent;
        });
        
        const newServerStats = {
            ...state.serverStats,
            uptime: state.serverStats.uptime + delta
        };

        return { agents: newAgents, serverStats: newServerStats };
    });
  },

  runCognition: async () => {
    const { agents, resourceNodes, logs, landParcels } = get();
    for (const agent of agents) {
        if (agent.faction !== 'PLAYER' && agent.faction !== 'NPC') continue;
        const summary = summarizeNeurologicChoice(agent, agents, resourceNodes, landParcels);
        if (summary.choice !== agent.state) {
            get().addLog(`${agent.name}: ${summary.reason} (${summary.choice})`, 'THOUGHT', agent.id);
            set(state => ({
                agents: state.agents.map(a => a.id === agent.id ? { ...a, state: summary.choice } : a)
            }));
        }
    }
  },

  addLog: (message, type, sender) => {
    const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        message,
        type,
        sender: sender || 'SYSTEM'
    };
    set(state => ({ logs: [newLog, ...state.logs].slice(0, 100) }));
    
    if (type === 'THOUGHT' || type === 'SYSTEM' || type === 'TRADE') {
        const chatMsg: ChatMessage = {
            id: newLog.id,
            senderId: sender || 'SYSTEM',
            senderName: sender || 'SYSTEM',
            message,
            channel: type === 'THOUGHT' ? 'THOUGHT' : type === 'SYSTEM' ? 'SYSTEM' : 'GLOBAL',
            timestamp: newLog.timestamp
        };
        set(state => ({ chatMessages: [...state.chatMessages, chatMsg].slice(-50) }));
    }
  },

  sendSignal: async (content) => {
    const { addLog } = get();
    addLog(`Signal broadcast: ${content}`, 'SYSTEM', 'NOTAR');
    
    const response = await generateSocialResponse(
        get().agents[0], 
        'Terminal', 
        content, 
        get().logs.map(l => l.message)
    );
    
    addLog(response.reply, 'THOUGHT', get().agents[0].name);
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleMount: (agentId) => set(state => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, state: a.state === AgentState.MOUNTED ? AgentState.IDLE : AgentState.MOUNTED } : a)
  })),

  equipItem: (agentId, item, inventoryIndex) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return state;

      let slot: keyof Agent['equipment'] | null = null;
      if (item.type === 'WEAPON') slot = 'mainHand';
      else if (item.type === 'OFFHAND') slot = 'offHand';
      else if (item.type === 'HELM') slot = 'head';
      else if (item.type === 'CHEST') slot = 'chest';
      else if (item.type === 'LEGS') slot = 'legs';

      if (!slot) return state;

      const newInventory = [...agent.inventory];
      const oldEquipped = agent.equipment[slot];
      newInventory[inventoryIndex] = oldEquipped;

      return {
          agents: state.agents.map(a => a.id === agentId ? {
              ...a,
              equipment: { ...a.equipment, [slot!]: item },
              inventory: newInventory
          } : a)
      };
  }),

  unequipItem: (agentId, slot) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return state;

      const item = (agent.equipment as any)[slot];
      if (!item) return state;

      const freeIndex = agent.inventory.findIndex(i => i === null);
      if (freeIndex === -1) return state;

      const newInventory = [...agent.inventory];
      newInventory[freeIndex] = item;

      return {
          agents: state.agents.map(a => a.id === agentId ? {
              ...a,
              equipment: { ...a.equipment, [slot]: null },
              inventory: newInventory
          } : a)
      };
  }),

  moveInventoryItem: (agentId, from, to) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return state;
      const newInventory = [...agent.inventory];
      [newInventory[from], newInventory[to]] = [newInventory[to], newInventory[from]];
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, inventory: newInventory } : a)
      };
  }),

  purchaseProduct: (productId) => set(state => {
      if (productId === 'NOTARY_LICENSE') return { hasNotaryLicense: true };
      if (productId === 'LAND_PARCEL') {
          const idx = state.landParcels.findIndex(p => p.ownerId === null);
          if (idx !== -1) {
              const newParcels = [...state.landParcels];
              newParcels[idx] = { ...newParcels[idx], ownerId: state.user.id };
              return { landParcels: newParcels };
          }
      }
      return state;
  }),

  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  uploadGraphicPack: (name) => set(state => ({ graphicPacks: [...state.graphicPacks, name] })),
  
  importAgent: async (source, type) => {
    let partial: Partial<Agent> | null = null;
    if (type === 'URL') partial = await CharacterImporter.importFromURL(source);
    else partial = CharacterImporter.importFromJSON(source);

    if (partial) {
        const newAgent: Agent = {
            id: Math.random().toString(36).substr(2, 9),
            name: partial.name || 'Unknown',
            classType: 'Import',
            faction: 'NPC',
            position: [Math.random() * 20 - 10, 0, Math.random() * 20 - 10],
            rotationY: 0,
            level: 1, xp: 0, state: AgentState.IDLE, soulDensity: 0.5, gold: 100, stabilityIndex: 1.0, energy: 100, maxEnergy: 100, integrity: 1.0,
            dna: { hash: '0xIMPORT', generation: 1, corruption: 0 },
            memoryCache: ['Materialized in Axiom.'],
            thinkingMatrix: partial.thinkingMatrix || { personality: 'Neutral', currentLongTermGoal: 'Observe', alignment: 0, languagePreference: 'EN' },
            skills: {}, inventory: Array(20).fill(null),
            equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
            stats: partial.stats || { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 },
            loreSnippet: partial.loreSnippet
        };
        set(state => ({ agents: [...state.agents, newAgent] }));
    }
  },

  toggleMap: (show) => set({ showMap: show }),
  setJoystick: (side, value) => {
  },

  buildStructure: (parcelId, type) => set(state => {
      const parcels = state.landParcels.map(p => {
          if (p.id === parcelId) {
              const newStructure: Structure = { id: Math.random().toString(), type, position: p.position };
              return { ...p, structures: [...p.structures, newStructure] };
          }
          return p;
      });
      return { landParcels: parcels };
  }),

  certifyParcel: (parcelId) => set(state => ({
      landParcels: state.landParcels.map(p => p.id === parcelId ? { ...p, isCertified: true } : p)
  })),

  reflectOnMemory: async (agentId) => {
      const agent = get().agents.find(a => a.id === agentId);
      if (!agent) return;
      const reflection = await analyzeMemories(agent);
      set(state => ({
          agents: state.agents.map(a => a.id === agentId ? {
              ...a,
              memoryCache: [...a.memoryCache, `REFLECTED: ${reflection.analysis}`],
              thinkingMatrix: {
                  ...a.thinkingMatrix,
                  personality: reflection.updatedPersonality || a.thinkingMatrix.personality,
                  currentLongTermGoal: reflection.updatedGoal || a.thinkingMatrix.currentLongTermGoal,
                  alignment: a.thinkingMatrix.alignment + (reflection.alignmentShift || 0)
              }
          } : a)
      }));
  }
})));
