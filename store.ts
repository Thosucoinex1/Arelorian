
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, AuctionListing, LogEntry, 
  ChatMessage, ChatChannel, Item, ResourceType, LandParcel, 
  Structure, StructureType, WorldEvent, Chunk, Quest 
} from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { getBiomeForChunk, generateResourcesForChunk, generateCreaturesForChunk } from './utils';
import { soundManager } from './services/SoundManager';

export type User = { id: string; email: string };

// Static obstacles for simple avoidance
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
  device: { isMobile: boolean; width: number; height: number };
  loadedChunks: Chunk[];
  activeEvents: WorldEvent[];
  globalJackpot: number;
  stability: number;
  lastThoughtTime: number;
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
  
  // Mobile Controls
  joystickData: { 
    left: { x: number; y: number }; 
    right: { x: number; y: number }; 
  };

  // Actions
  login: (email: string) => void;
  initGame: () => void;
  updateAgents: (delta: number) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  selectAgent: (id: string | null) => void;
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
  
  // Inventory Actions
  equipItem: (agentId: string, item: Item, inventoryIndex: number) => void;
  unequipItem: (agentId: string, slot: string) => void;
  moveInventoryItem: (agentId: string, fromIndex: number, toIndex: number) => void;
}

export const useStore = create<GameState>((set, get) => ({
  user: null, agents: [], resourceNodes: [], auctionHouse: [], logs: [], chatMessages: [], activeEvents: [],
  selectedAgentId: null, device: { isMobile: /Mobi/i.test(navigator.userAgent), width: window.innerWidth, height: window.innerHeight },
  loadedChunks: [], globalJackpot: 10000, stability: 1.0, lastThoughtTime: 0, lastRaidTime: Date.now(),
  gridSize: 35, quests: [], hasNotaryLicense: false, agentSlots: 50,
  serverStats: { uptime: 0, tickRate: 20, memoryUsage: 12.5, threatLevel: 0.1 },
  graphicPacks: ['Singularity v3.0'], landParcels: [],
  showCharacterSheet: false, showAdmin: false, showMap: false,
  joystickData: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },

  login: (email) => {
    const isSpecial = email.includes('notary') || email.includes('admin');
    set({ 
        user: { id: `notary-${Math.random().toString(36).slice(2)}`, email },
        hasNotaryLicense: isSpecial
    });
  },
  
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  setJoystick: (side, data) => set(state => ({
    joystickData: { ...state.joystickData, [side]: data }
  })),

  uploadGraphicPack: (name) => set(state => ({
      graphicPacks: [...state.graphicPacks, name],
      logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Graphic Pack '${name}' synchronized.`, type: 'SYSTEM' }, ...state.logs]
  })),

  equipItem: (agentId, item, inventoryIndex) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};

      const slot = item.type === 'WEAPON' ? 'mainHand' : 
                   item.type === 'OFFHAND' ? 'offHand' : 
                   item.type === 'HELM' ? 'head' : 
                   item.type === 'CHEST' ? 'chest' : 'legs';
      
      const prevItem = (agent.equipment as any)[slot];
      const newInventory = [...agent.inventory];
      newInventory[inventoryIndex] = prevItem || null;

      const newEquipment = { ...agent.equipment, [slot]: item };
      
      soundManager.playUI('CLICK');
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: newEquipment, inventory: newInventory } : a)
      };
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
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: newEquipment, inventory: newInventory } : a)
      };
  }),

  moveInventoryItem: (agentId, from, to) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const newInv = [...agent.inventory];
      [newInv[from], newInv[to]] = [newInv[to], newInv[from]];
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, inventory: newInv } : a)
      };
  }),

  toggleMount: (agentId) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return {};
      const isMounted = agent.state === AgentState.MOUNTED;
      const newState = isMounted ? AgentState.IDLE : AgentState.MOUNTED;
      soundManager.playUI('CLICK');
      return {
          agents: state.agents.map(a => a.id === agentId ? { ...a, state: newState } : a),
          logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: isMounted ? 'Dismounted.' : 'Mounted horse. Speed 4x.', type: 'SYSTEM' }, ...state.logs]
      };
  }),

  buildStructure: (parcelId, type) => set(state => {
      return {
          logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Construction of ${type} started on parcel ${parcelId}.`, type: 'SYSTEM' }, ...state.logs]
      };
  }),

  certifyParcel: (parcelId) => set(state => {
      return {
          logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Parcel ${parcelId} certified.`, type: 'AXIOM' }, ...state.logs]
      };
  }),
  
  purchaseProduct: (productId) => set(state => {
      if (productId === 'NOTARY_LICENSE') return { hasNotaryLicense: true };
      return {};
  }),

  initGame: () => {
    const { gridSize } = get();
    const newChunks: Chunk[] = [];
    const radius = Math.floor(gridSize / 2);
    
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const biome = getBiomeForChunk(x, z);
        newChunks.push({ id: `${x},${z}`, x, z, biome, depth: 0, entropy: Math.random() });
      }
    }

    const startPlayer: Agent = {
      id: 'player-1',
      name: 'RRA-Architect',
      classType: 'Novice',
      faction: 'PLAYER',
      position: [0, 0, 0],
      rotationY: 0,
      level: 1,
      xp: 0,
      state: AgentState.IDLE,
      soulDensity: 0.8,
      gold: 500,
      stabilityIndex: 1.0,
      dna: { hash: 'axiom-001', generation: 1, corruption: 0 },
      memoryCache: [],
      thinkingMatrix: { personality: 'Recursive', currentLongTermGoal: 'Build City', alignment: 1, languagePreference: 'MIXED' },
      skills: { woodcutting: 1, mining: 1, leadership: 1, charisma: 1 },
      inventory: Array(32).fill(null),
      equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
      stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 },
      stuckTicks: 0
    };

    set({ loadedChunks: newChunks, agents: [startPlayer] });
  },

  expandGrid: (targetX, targetZ) => {
    set(state => {
      const existingIds = new Set(state.loadedChunks.map(c => c.id));
      const newChunks: Chunk[] = [];
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        for (let z = targetZ - 1; z <= targetZ + 1; z++) {
          const id = `${x},${z}`;
          if (!existingIds.has(id)) {
            newChunks.push({ id, x, z, biome: getBiomeForChunk(x, z), depth: 0, entropy: Math.random() });
          }
        }
      }
      if (newChunks.length > 0) return { loadedChunks: [...state.loadedChunks, ...newChunks] };
      return {};
    });
  },

  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, { ...msg, id: Math.random().toString(), timestamp: Date.now() }].slice(-100) })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  addLog: (message, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50) })),

  updateAgents: async (delta) => {
    const state = get();
    const now = Date.now();
    const xpForLevel = (lvl: number) => Math.floor(1000 * Math.pow(1.025, lvl - 1));

    // Async AI Cognition Loop
    if (now - state.lastThoughtTime > 15000) {
      set({ lastThoughtTime: now });
      const activeAgents = state.agents.filter(a => a.faction === 'PLAYER' || a.faction === 'NPC');
      if (activeAgents.length > 0) {
        const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const nearbyA = state.agents.filter(a => a.id !== agent.id && Math.hypot(a.position[0]-agent.position[0], a.position[2]-agent.position[2]) < 60);
        const nearbyR = state.resourceNodes.filter(r => Math.hypot(r.position[0]-agent.position[0], r.position[2]-agent.position[2]) < 80);
        
        try {
          const decision = await generateAutonomousDecision(agent, nearbyA, nearbyR, state.logs.slice(0, 5), false);
          
          if (decision.message) {
            state.addChatMessage({ senderId: agent.id, senderName: agent.name, message: decision.message, channel: 'THOUGHT' });
          }

          if (decision.quest) {
            const newQuest: Quest = {
                id: `quest-${Math.random().toString(36).slice(2)}`,
                timestamp: Date.now(),
                issuerId: agent.id,
                ...decision.quest
            } as Quest;
            set(s => ({ quests: [...s.quests, newQuest] }));
            state.addLog(`New Organic Quest Spawned by ${agent.name}: ${newQuest.title}`, 'EVENT');
          }

          set(s => ({
            agents: s.agents.map(a => a.id === agent.id ? { 
              ...a, 
              state: decision.newState, 
              targetId: decision.targetId || a.targetId,
              alliedId: decision.alliedId || a.alliedId,
              stabilityIndex: Math.max(0, a.stabilityIndex - 0.001)
            } : a)
          }));
        } catch (e) {
          console.error("AI Update Failed", e);
        }
      }
    }

    // Physical Movement and Interaction Loop
    set(s => ({
        agents: s.agents.map(agent => {
            let nextPos = [...agent.position] as [number, number, number];
            let nextRotation = agent.rotationY;
            let nextXP = agent.xp;
            let nextLvl = agent.level;
            let nextStuck = agent.stuckTicks || 0;
            
            const speedBase = 4.0;
            const speedMultiplier = agent.state === AgentState.MOUNTED ? 4.0 : 1.0;
            const currentSpeed = speedBase * speedMultiplier * delta;
            
            const joystick = agent.id === 'player-1' ? s.joystickData.left : { x: 0, y: 0 };
            
            if (agent.id === 'player-1' && (joystick.x !== 0 || joystick.y !== 0)) {
                // Manual Player Control
                nextPos[0] += joystick.x * 12 * speedMultiplier * delta;
                nextPos[2] += joystick.y * 12 * speedMultiplier * delta;
                nextRotation = Math.atan2(joystick.x, joystick.y);
                agent.targetId = null;
                nextStuck = 0;
            } else if (agent.targetId) {
                // Autonomous Movement
                const targetNode = s.resourceNodes.find(r => r.id === agent.targetId) || s.agents.find(a => a.id === agent.targetId);
                if (targetNode) {
                    const dx = targetNode.position[0] - agent.position[0];
                    const dz = targetNode.position[2] - agent.position[2];
                    const dist = Math.hypot(dx, dz);
                    
                    if (dist > 2.0) {
                        let desiredDx = dx / dist;
                        let desiredDz = dz / dist;

                        // --- INTELLIGENT OBSTACLE AVOIDANCE ---
                        WORLD_STRUCTURES.forEach(struct => {
                            const sdx = agent.position[0] - struct.pos[0];
                            const sdz = agent.position[2] - struct.pos[1];
                            const sdist = Math.hypot(sdx, sdz);
                            if (sdist < struct.radius + 2) {
                                // Add repulsion force
                                const force = (struct.radius + 2 - sdist) / (struct.radius + 2);
                                desiredDx += (sdx / sdist) * force * 2.0;
                                desiredDz += (sdz / sdist) * force * 2.0;
                            }
                        });

                        // Re-normalize desired vector
                        const finalDist = Math.hypot(desiredDx, desiredDz);
                        desiredDx /= finalDist;
                        desiredDz /= finalDist;

                        // --- SMOOTH TURNING (Steering) ---
                        const targetAngle = Math.atan2(desiredDx, desiredDz);
                        let angleDiff = targetAngle - nextRotation;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        
                        nextRotation += angleDiff * 5.0 * delta; // Turn smoothing
                        
                        // Move forward in current rotation
                        const vx = Math.sin(nextRotation) * currentSpeed;
                        const vz = Math.cos(nextRotation) * currentSpeed;
                        
                        nextPos[0] += vx;
                        nextPos[2] += vz;

                        // --- STUCK DETECTION ---
                        // If we didn't move much closer to target, increment stuckTicks
                        const newDist = Math.hypot(targetNode.position[0] - nextPos[0], targetNode.position[2] - nextPos[2]);
                        if (dist - newDist < currentSpeed * 0.1) {
                            nextStuck++;
                        } else {
                            nextStuck = 0;
                        }

                        if (nextStuck > 120) { // Stuck for ~2 seconds at 60fps
                            // Re-route nudge
                            nextRotation += Math.PI / 2; 
                            nextStuck = 0;
                        }

                    } else if (agent.state === AgentState.GATHERING) {
                        nextXP += 25 * delta; 
                        if (nextXP >= xpForLevel(nextLvl)) {
                           nextLvl++;
                           soundManager.playCombat('MAGIC');
                           s.addLog(`${agent.name} reached level ${nextLvl}! Consciousness expanding.`, 'SYSTEM');
                        }
                        nextStuck = 0;
                    }
                }
            } else {
                nextStuck = 0;
            }
            
            return { 
                ...agent, 
                position: nextPos, 
                rotationY: nextRotation, 
                xp: nextXP, 
                level: nextLvl,
                stuckTicks: nextStuck
            };
        })
    }));
  }
}));
