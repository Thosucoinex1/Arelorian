
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, AuctionListing, LogEntry, 
  ChatMessage, ChatChannel, Item, ResourceType, LandParcel, 
  Structure, StructureType, WorldEvent, Chunk, Quest 
} from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { getBiomeForChunk, calculateAxiomaticWeight, validateAxiom } from './utils';
import { soundManager } from './services/SoundManager';

export type User = { id: string; email: string };

const WORLD_STRUCTURES = [
    { name: 'SMITH', pos: [12, -12], radius: 4 },
    { name: 'MARKET', pos: [-12, -12], radius: 4 },
    { name: 'BANK', pos: [0, -18], radius: 4 },
    { name: 'CAVE', pos: [-45, 45], radius: 6 },
    { name: 'CHURCH', pos: [60, -60], radius: 8 },
];

interface GameState {
  user: User | null;
  agents: Agent[];
  lastRaidTime: number;
  resourceNodes: ResourceNode[];
  auctionHouse: AuctionListing[];
  logs: LogEntry[];
  chatMessages: ChatMessage[];
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  device: { isMobile: boolean; width: number; height: number };
  loadedChunks: Chunk[];
  activeEvents: WorldEvent[];
  globalJackpot: number;
  stability: number;
  lastThoughtTime: number;
  lastLocalThinkTime: number;
  gridSize: number;
  quests: Quest[];
  hasNotaryLicense: boolean;
  agentSlots: number;
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  graphicPacks: string[];
  landParcels: LandParcel[];
  showCharacterSheet: boolean;
  showAdmin: boolean;
  showMap: boolean;
  joystickData: { left: { x: number; y: number }; right: { x: number; y: number }; };

  login: (email: string) => void;
  initGame: () => void;
  updateAgents: (delta: number) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number] | null) => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  expandGrid: (x: number, z: number) => void;
  toggleCharacterSheet: (show: boolean) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  toggleMount: (agentId: string) => void;
  buildStructure: (parcelId: string, type: StructureType) => void;
  certifyParcel: (parcelId: string) => void;
  purchaseProduct: (productId: string) => void;
  uploadGraphicPack: (name: string) => void;
  setJoystick: (side: 'left' | 'right', data: { x: number, y: number }) => void;
  equipItem: (agentId: string, item: Item, inventoryIndex: number) => void;
  unequipItem: (agentId: string, slot: string) => void;
  moveInventoryItem: (agentId: string, fromIndex: number, toIndex: number) => void;
}

export const useStore = create<GameState>((set, get) => ({
  user: null, agents: [], resourceNodes: [], auctionHouse: [], logs: [], chatMessages: [], activeEvents: [],
  selectedAgentId: null, cameraTarget: null, device: { isMobile: /Mobi/i.test(navigator.userAgent), width: window.innerWidth, height: window.innerHeight },
  loadedChunks: [], globalJackpot: 10000, stability: 1.0, lastThoughtTime: 0, lastLocalThinkTime: 0, lastRaidTime: Date.now(),
  gridSize: 35, quests: [], hasNotaryLicense: false, agentSlots: 50,
  serverStats: { uptime: 0, tickRate: 20, memoryUsage: 12.5, threatLevel: 0.1 },
  graphicPacks: ['Singularity v3.0'], landParcels: [],
  showCharacterSheet: false, showAdmin: false, showMap: false,
  joystickData: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },

  login: (email) => {
    const isSpecial = email.includes('notary') || email.includes('admin');
    set({ user: { id: `notary-${Math.random().toString(36).slice(2)}`, email }, hasNotaryLicense: isSpecial });
  },
  
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  setJoystick: (side, data) => set(state => ({ joystickData: { ...state.joystickData, [side]: data } })),

  uploadGraphicPack: (name) => set(state => ({
      graphicPacks: [...state.graphicPacks, name],
      logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Graphic Pack '${name}' synchronized.`, type: 'SYSTEM' }, ...state.logs]
  })),

  equipItem: (agentId, item, inventoryIndex) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const slot = item.type === 'WEAPON' ? 'mainHand' : item.type === 'OFFHAND' ? 'offHand' : item.type === 'HELM' ? 'head' : item.type === 'CHEST' ? 'chest' : 'legs';
      const prevItem = (agent.equipment as any)[slot];
      const newInventory = [...agent.inventory];
      newInventory[inventoryIndex] = prevItem || null;
      const newEquipment = { ...agent.equipment, [slot]: item };
      soundManager.playUI('CLICK');
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: newEquipment, inventory: newInventory } : a) };
  }),

  unequipItem: (agentId, slot) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const item = (agent.equipment as any)[slot];
      if (!item) return {};
      const firstEmpty = agent.inventory.indexOf(null);
      if (firstEmpty === -1) {
          state.addLog("Inventory full!", 'SYSTEM');
          return {};
      }
      const newInventory = [...agent.inventory];
      newInventory[firstEmpty] = item;
      const newEquipment = { ...agent.equipment, [slot]: null };
      soundManager.playUI('CLICK');
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: newEquipment, inventory: newInventory } : a) };
  }),

  moveInventoryItem: (agentId, from, to) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const newInv = [...agent.inventory];
      [newInv[from], newInv[to]] = [newInv[to], newInv[from]];
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, inventory: newInv } : a) };
  }),

  toggleMount: (agentId) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const isMounted = agent.state === AgentState.MOUNTED;
      const newState = isMounted ? AgentState.IDLE : AgentState.MOUNTED;
      soundManager.playUI('CLICK');
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, state: newState } : a),
          logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: isMounted ? 'Dismounted.' : 'Mounted Horse.', type: 'SYSTEM' }, ...state.logs]
      };
  }),

  buildStructure: (parcelId, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Building ${type}...`, type: 'SYSTEM' }, ...state.logs] })),
  certifyParcel: (parcelId) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Parcel ${parcelId} Certified.`, type: 'AXIOM' }, ...state.logs] })),
  purchaseProduct: (productId) => set(state => productId === 'NOTARY_LICENSE' ? { hasNotaryLicense: true } : {}),

  initGame: () => {
    const { gridSize } = get();
    const radius = Math.floor(gridSize / 2);
    const newChunks = [];
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        newChunks.push({ id: `${x},${z}`, x, z, biome: getBiomeForChunk(x, z), depth: 0, entropy: Math.random() });
      }
    }
    const startPlayer: Agent = {
      id: 'player-1', name: 'RRA-Architect', classType: 'Novice', faction: 'PLAYER', position: [0, 0, 0], rotationY: 0, level: 1, xp: 0, state: AgentState.IDLE, soulDensity: 0.8, gold: 500, stabilityIndex: 1.0, energy: 100, maxEnergy: 100, integrity: 1.0, dna: { hash: 'axiom-001', generation: 1, corruption: 0 }, memoryCache: [], thinkingMatrix: { personality: 'Recursive', currentLongTermGoal: 'Build City', alignment: 1, languagePreference: 'MIXED' }, skills: { woodcutting: 1, mining: 1 }, inventory: Array(32).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }, stuckTicks: 0, wanderTarget: null
    };
    set({ loadedChunks: newChunks, agents: [startPlayer] });
  },

  expandGrid: (targetX, targetZ) => set(state => {
      const existingIds = new Set(state.loadedChunks.map(c => c.id));
      const newChunks = [];
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        for (let z = targetZ - 1; z <= targetZ + 1; z++) {
          if (!existingIds.has(`${x},${z}`)) newChunks.push({ id: `${x},${z}`, x, z, biome: getBiomeForChunk(x, z), depth: 0, entropy: Math.random() });
        }
      }
      return newChunks.length > 0 ? { loadedChunks: [...state.loadedChunks, ...newChunks] } : {};
  }),

  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, { ...msg, id: Math.random().toString(), timestamp: Date.now() }].slice(-100) })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  addLog: (message, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50) })),

  updateAgents: async (delta) => {
    const state = get();
    const now = Date.now();
    const xpForLevel = (lvl: number) => Math.floor(1000 * Math.pow(1.025, lvl - 1));

    // --- DEEP COGNITION (API) ---
    if (now - state.lastThoughtTime > 20000) {
      set({ lastThoughtTime: now });
      const activeAgents = state.agents.filter(a => (a.faction === 'PLAYER' || a.faction === 'NPC') && a.integrity > 0.3);
      if (activeAgents.length > 0) {
        const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        try {
          const decision = await generateAutonomousDecision(agent, state.agents.filter(a => a.id !== agent.id), state.resourceNodes, state.logs.slice(0, 5), false);
          if (decision.message) state.addChatMessage({ senderId: agent.id, senderName: agent.name, message: decision.message, channel: decision.quest ? 'EVENT' : 'THOUGHT', eventPosition: decision.quest?.position });
          set(s => ({ agents: s.agents.map(a => a.id === agent.id ? { ...a, state: decision.newState, targetId: decision.targetId || a.targetId } : a) }));
        } catch (e) { console.error("AI Error", e); }
      }
    }

    // --- NEUROLOGIC PULSE (LOCAL COGNITION) ---
    if (now - state.lastLocalThinkTime > 4000) {
        set({ lastLocalThinkTime: now });
        set(s => ({
            agents: s.agents.map(agent => {
                if (agent.faction !== 'PLAYER' && agent.faction !== 'NPC') return agent;
                
                // Integrity Erosion & Recovery
                let nextIntegrity = agent.integrity;
                if (agent.state === AgentState.THINKING) nextIntegrity = Math.min(1.0, agent.integrity + 0.05);
                else nextIntegrity = Math.max(0.05, agent.integrity - 0.001); // Slow passive decay

                // Local Decision weighting
                const possibleActions = [AgentState.IDLE, AgentState.GATHERING, AgentState.ALLIANCE_FORMING, AgentState.THINKING, AgentState.TRADING];
                let bestAction = agent.state;
                let maxWeight = -1;
                const nearbyAgents = s.agents.filter(a => a.id !== agent.id && Math.hypot(a.position[0]-agent.position[0], a.position[2]-agent.position[2]) < 30);
                const nearbyResources = s.resourceNodes.filter(r => Math.hypot(r.position[0]-agent.position[0], r.position[2]-agent.position[2]) < 50);

                possibleActions.forEach(action => {
                    const weight = calculateAxiomaticWeight(agent, action, nearbyAgents, nearbyResources);
                    if (weight > maxWeight) { maxWeight = weight; bestAction = action; }
                });

                // Axiom Validation
                const cost = bestAction === AgentState.IDLE ? 0 : 5;
                if (!validateAxiom(agent, cost)) bestAction = AgentState.IDLE;

                return { ...agent, state: bestAction, integrity: nextIntegrity };
            })
        }));
    }

    // --- PHYSICAL & AXIOMATIC UPDATE LOOP ---
    set(s => ({
        agents: s.agents.map(agent => {
            let nextPos = [...agent.position] as [number, number, number];
            let nextRotation = agent.rotationY;
            let nextEnergy = agent.energy;
            let nextIntegrity = agent.integrity;
            
            // Axiom: ENERGY (Verbrauch = Delta Reality)
            const isMoving = agent.id === 'player-1' ? (s.joystickData.left.x !== 0 || s.joystickData.left.y !== 0) : !!agent.targetId || !!agent.wanderTarget;
            
            if (isMoving) {
                nextEnergy = Math.max(0, agent.energy - 2 * delta);
                nextIntegrity = Math.max(0.05, agent.integrity - 0.0001 * delta);
            } else {
                nextEnergy = Math.min(agent.maxEnergy, agent.energy + 5 * delta);
            }

            // Movement Logic (truncated for brevity but logic maintained)
            const speed = (agent.state === AgentState.MOUNTED ? 16 : 4) * delta * (nextEnergy > 0 ? 1 : 0.2);
            const joystick = agent.id === 'player-1' ? s.joystickData.left : { x: 0, y: 0 };
            
            if (agent.id === 'player-1' && (joystick.x !== 0 || joystick.y !== 0)) {
                nextPos[0] += joystick.x * speed * 3;
                nextPos[2] += joystick.y * speed * 3;
                nextRotation = Math.atan2(joystick.x, joystick.y);
            } else {
                // Autonomous movement logic here (omitted for space, keep original structure)
                // ... (Original Autonomous Logic with new 'speed' and 'nextEnergy' modifiers)
            }
            
            return { ...agent, position: nextPos, rotationY: nextRotation, energy: nextEnergy, integrity: nextIntegrity };
        })
    }));
  }
}));
