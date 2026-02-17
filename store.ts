
import { create } from 'zustand';
import { Agent, AgentState, ResourceNode, AuctionListing, LogEntry, ChatMessage, ChatChannel, MemoryEntry, Item, ItemType, ResourceType, LandParcel, Quest, ProductType } from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { isAgentInSafeZone } from './utils';

export interface Chunk { id: string; x: number; z: number; biome: string; }
export interface Vegetation { id: string; type: 'TREE' | 'ROCK'; position: [number, number, number]; scale: number; rotation: number; }
export type User = { id: string; email: string };

interface GameState {
  user: User | null;
  agents: Agent[];
  resourceNodes: ResourceNode[];
  auctionHouse: AuctionListing[];
  logs: LogEntry[];
  chatMessages: ChatMessage[];
  selectedAgentId: string | null;
  device: { isMobile: boolean; width: number; height: number };
  loadedChunks: Chunk[];
  vegetation: Vegetation[];
  showCharacterSheet: boolean;
  notaryBalance: number;
  landParcels: LandParcel[];
  showAdmin: boolean;
  showMap: boolean;
  serverStats: { uptime: number; tickRate: number; memoryUsage: number };
  graphicPacks: string[];
  quests: Quest[];
  lastThoughtTime: number; // Cooldown tracker for API
  hasNotaryLicense: boolean;
  agentSlots: number;
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  initGame: () => void;
  updateAgents: (delta: number) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  selectAgent: (id: string | null) => void;
  toggleCharacterSheet: (show: boolean) => void;
  postAuction: (listing: Omit<AuctionListing, 'id' | 'expiresAt'>) => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  purchaseLand: (id: string) => void;
  updateAgentLore: (id: string, lore: string) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  uploadGraphicPack: (name: string) => void;
  purchaseProduct: (productType: ProductType) => void;
}

const generateInitialAgent = (id: string, name: string, isGerman: boolean): Agent => ({
  id,
  name,
  classType: Math.random() > 0.5 ? 'Paladin' : 'Technomancer',
  position: [(Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40],
  rotationY: Math.random() * Math.PI * 2,
  level: 1,
  state: AgentState.IDLE,
  soulDensity: 0.5,
  gold: 100,
  isAwakened: false,
  memoryCache: [],
  thinkingMatrix: {
    personality: isGerman ? "Ruhig, fokussiert auf Handwerk" : "Aggressive, seeking glory",
    currentLongTermGoal: "Survive and prosper",
    alignment: 0,
    languagePreference: isGerman ? 'DE' : 'EN'
  },
  skills: { mining: 1, woodcutting: 1, farming: 1, crafting: 1, negotiation: 1 },
  inventory: [],
  equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
  stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }
});

export const useStore = create<GameState>((set, get) => ({
  user: null,
  agents: [],
  resourceNodes: [],
  auctionHouse: [],
  logs: [],
  chatMessages: [],
  selectedAgentId: null,
  device: { isMobile: false, width: window.innerWidth, height: window.innerHeight },
  loadedChunks: [{ id: '0,0', x: 0, z: 0, biome: 'CITY' }],
  vegetation: [],
  showCharacterSheet: false,
  notaryBalance: 5000,
  landParcels: [
    { id: 'p1', name: 'The Iron Fields', coordinates: [10, 10], value: 1200, ownerId: null },
    { id: 'p2', name: 'Sanctuary East', coordinates: [20, 0], value: 2500, ownerId: null },
    { id: 'p3', name: 'Whispering Woods', coordinates: [-15, 5], value: 800, ownerId: null }
  ],
  showAdmin: false,
  showMap: false,
  serverStats: { uptime: 3600, tickRate: 20, memoryUsage: 128 },
  graphicPacks: ['Base Textures v1', 'Axiom Shaders Pack'],
  quests: [
    { id: 'q1', timestamp: Date.now() - 20000, title: 'Soul Harvest', description: 'Gather 5 Soul Shards from the void.', rewardGold: 500 }
  ],
  lastThoughtTime: 0,
  hasNotaryLicense: false,
  agentSlots: 4,

  login: (email) => set({ user: { id: `notary-id-${Math.random().toString(36).slice(2, 9)}`, email } }),
  logout: () => set({ user: null }),
  initGame: () => {
    if (get().agents.length > 0) return;
    const agents = [
      generateInitialAgent('agent-1', 'Gunter', true),
      generateInitialAgent('agent-2', 'Alistair', false),
      generateInitialAgent('agent-3', 'Hilda', true),
      generateInitialAgent('agent-4', 'Shadow', false)
    ];
    const resources: ResourceNode[] = [
      { id: 'res-1', type: 'ORE', position: [10, 0, 10], amount: 100 },
      { id: 'res-2', type: 'WOOD', position: [-15, 0, 5], amount: 100 },
      { id: 'res-3', type: 'FOOD', position: [5, 0, -10], amount: 100 }
    ];
    set({ agents, resourceNodes: resources });
  },

  addChatMessage: (msg) => set(state => ({
    chatMessages: [...state.chatMessages, { ...msg, id: Math.random().toString(), timestamp: Date.now() }].slice(-100)
  })),

  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  addLog: (message, type) => set(state => ({
    logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50)
  })),
  postAuction: (listing) => set(state => ({
    auctionHouse: [...state.auctionHouse, { ...listing, id: Math.random().toString(), expiresAt: Date.now() + 3600000 }]
  })),
  purchaseLand: (id) => set(state => {
    const parcel = state.landParcels.find(p => p.id === id);
    if (parcel && state.notaryBalance >= parcel.value && !parcel.ownerId) {
      return {
        notaryBalance: state.notaryBalance - parcel.value,
        landParcels: state.landParcels.map(p => p.id === id ? { ...p, ownerId: 'NOTARY' } : p),
        logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Purchased ${parcel.name} for ${parcel.value} gold.`, type: 'TRADE' }, ...state.logs]
      };
    }
    return state;
  }),
  updateAgentLore: (id, lore) => set(state => ({
    agents: state.agents.map(a => a.id === id ? { ...a, loreSnippet: lore } : a)
  })),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  uploadGraphicPack: (name) => set(state => ({
    graphicPacks: [...state.graphicPacks, name],
    logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Graphic pack '${name}' installed successfully.`, type: 'SYSTEM' }, ...state.logs]
  })),

  purchaseProduct: (productType) => {
    const { user, addLog, landParcels } = get();
    if (!user) {
      addLog("Authentication error: No Notary present.", "SYSTEM");
      return;
    }

    if (productType === 'LAND_PARCEL') {
      const availableParcel = landParcels.find(p => p.ownerId === null);
      if (availableParcel) {
        set(state => ({
          landParcels: state.landParcels.map(p => p.id === availableParcel.id ? { ...p, ownerId: user.id } : p),
          agentSlots: state.agentSlots + 5
        }));
        addLog(`Land Parcel '${availableParcel.name}' Secured by Notary ${user.id.slice(0, 6)}. +5 Agent Slots.`, 'SYSTEM');
      } else {
        addLog(`No available Land Parcels to acquire.`, 'SYSTEM');
      }
    }
    
    if (productType === 'NOTARY_LICENSE') {
      if (get().hasNotaryLicense) return;
      set({ hasNotaryLicense: true });
      addLog(`Notary License (Tier 3) acquired by ${user.id.slice(0,6)}. Guild creation unlocked.`, 'SYSTEM');
    }
  },

  updateAgents: async (delta) => {
    // FIX: Added `addLog` to the destructured state to fix a 'Cannot find name' error.
    const { agents, lastThoughtTime, addChatMessage, user, landParcels, addLog } = get();
    const now = Date.now();
    
    if (agents.length === 0) return;

    let activeUpdateResult: { agentId: string; response: any } | null = null;

    if (now - lastThoughtTime > 20000) {
      const thinkingAgentIndex = Math.floor(Math.random() * agents.length);
      const thinkingAgent = agents[thinkingAgentIndex];
      
      if (thinkingAgent) {
        set({ lastThoughtTime: now });
        try {
          const inSafeZone = isAgentInSafeZone(thinkingAgent, landParcels, user?.id || null);
          const response = await generateAutonomousDecision(thinkingAgent, [], [], [], inSafeZone);
          
          if(response.decision) {
            activeUpdateResult = { agentId: thinkingAgent.id, response };
            addLog(`${thinkingAgent.name} Thinks: ${response.thought}`, 'THOUGHT');
            if (response.message) {
              addChatMessage({ senderId: thinkingAgent.id, senderName: thinkingAgent.name, message: response.message, channel: 'LOCAL' });
            }
          }
        } catch (e) {
          console.error("Agent Awakening Error:", e);
          set({ lastThoughtTime: now - 15000 }); 
        }
      }
    }

    set(state => ({
      agents: state.agents.map(a => {
        let agent = { ...a };
        if (activeUpdateResult && agent.id === activeUpdateResult.agentId) {
          agent.state = activeUpdateResult.response.newState || agent.state;
          agent.memoryCache = [...agent.memoryCache, { id: Math.random().toString(), timestamp: Date.now(), description: activeUpdateResult.response.decision, importance: 0.9 }].slice(-20);
          agent.isAwakened = true;
        }

        if (agent.state === AgentState.COMBAT && agent.equipment.mainHand) {
            agent.equipment.mainHand.experience = (agent.equipment.mainHand.experience || 0) + 1;
        }

        const newPos = [...agent.position] as [number, number, number];
        let newRot = agent.rotationY;
        if (agent.state === AgentState.GATHERING) {
          const speed = 0.5 * delta;
          newPos[0] += Math.cos(newRot) * speed;
          newPos[2] += Math.sin(newRot) * speed;
          if (Math.random() < 0.02) newRot += (Math.random() - 0.5);
        } else if (agent.state !== AgentState.IDLE && agent.state !== AgentState.THINKING) {
          const speed = 1.0 * delta;
          newPos[0] += (Math.cos(agent.rotationY) * speed) * (Math.random() - 0.5) * 0.2;
          newPos[2] += (Math.sin(agent.rotationY) * speed) * (Math.random() - 0.5) * 0.2;
        }
        
        agent.position[0] = Math.max(-38, Math.min(38, newPos[0]));
        agent.position[2] = Math.max(-38, Math.min(38, newPos[2]));
        agent.rotationY = newRot;
        return agent;
      })
    }));
  }
}));
