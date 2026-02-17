
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, AuctionListing, LogEntry, 
  ChatMessage, ChatChannel, Item, ResourceType, LandParcel, 
  Structure, StructureType, WorldEvent, Chunk, Quest 
} from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { getBiomeForChunk, generateResourcesForChunk, generateCreaturesForChunk, calculateAxiomaticWeight } from './utils';
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
  lastLocalThinkTime: number; // For non-API cognition
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
  
  // Inventory Actions
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
      stuckTicks: 0,
      wanderTarget: null
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
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  addLog: (message, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50) })),

  updateAgents: async (delta) => {
    const state = get();
    const now = Date.now();
    const xpForLevel = (lvl: number) => Math.floor(1000 * Math.pow(1.025, lvl - 1));

    // --- DEEP COGNITION (API-BASED) ---
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
            state.addChatMessage({ 
                senderId: agent.id, senderName: agent.name, 
                message: decision.message, channel: decision.quest ? 'EVENT' : 'THOUGHT',
                eventPosition: decision.quest?.position
            });
          }
          if (decision.quest) {
            const qPos = [agent.position[0] + (Math.random() - 0.5) * 40, 0, agent.position[2] + (Math.random() - 0.5) * 40] as [number, number, number];
            const newQuest: Quest = {
                id: `quest-${Math.random().toString(36).slice(2)}`,
                timestamp: Date.now(), issuerId: agent.id, position: qPos,
                ...decision.quest
            };
            set(s => ({ quests: [...s.quests, newQuest] }));
            state.addLog(`Organic Quest: ${newQuest.title}`, 'EVENT');
          }
          set(s => ({
            agents: s.agents.map(a => a.id === agent.id ? { 
              ...a, state: decision.newState, targetId: decision.targetId || a.targetId,
              alliedId: decision.alliedId || a.alliedId
            } : a)
          }));
        } catch (e) { console.error("AI Cognition Failure", e); }
      }
    }

    // --- LOCAL AXIOMATIC COGNITION (NON-API) ---
    // This allows agents to be "clever" in real-time based on environment forces
    if (now - state.lastLocalThinkTime > 3000) {
        set({ lastLocalThinkTime: now });
        set(s => ({
            agents: s.agents.map(agent => {
                if (agent.faction !== 'PLAYER' && agent.faction !== 'NPC') return agent;
                
                // Only "Think" if IDLE or already in a long state
                if (agent.state !== AgentState.IDLE && Math.random() > 0.3) return agent;

                const possibleActions = [AgentState.IDLE, AgentState.GATHERING, AgentState.ALLIANCE_FORMING, AgentState.TRADING];
                let bestAction = agent.state;
                let maxWeight = -1;

                const nearbyAgents = s.agents.filter(a => a.id !== agent.id && Math.hypot(a.position[0]-agent.position[0], a.position[2]-agent.position[2]) < 30);
                const nearbyResources = s.resourceNodes.filter(r => Math.hypot(r.position[0]-agent.position[0], r.position[2]-agent.position[2]) < 50);

                possibleActions.forEach(action => {
                    const weight = calculateAxiomaticWeight(agent, action, nearbyAgents, nearbyResources);
                    if (weight > maxWeight) {
                        maxWeight = weight;
                        bestAction = action;
                    }
                });

                // Auto-target nearest resource if gathering
                let newTargetId = agent.targetId;
                if (bestAction === AgentState.GATHERING && nearbyResources.length > 0) {
                    newTargetId = nearbyResources[0].id;
                }

                return { ...agent, state: bestAction, targetId: newTargetId };
            })
        }));
    }

    // --- PHYSICAL SIMULATION LOOP ---
    set(s => ({
        agents: s.agents.map(agent => {
            let nextPos = [...agent.position] as [number, number, number];
            let nextRotation = agent.rotationY;
            let nextXP = agent.xp;
            let nextLvl = agent.level;
            let nextStuck = agent.stuckTicks || 0;
            let nextWander = agent.wanderTarget;
            
            const speedBase = 4.0;
            const speedMultiplier = agent.state === AgentState.MOUNTED ? 4.0 : 1.0;
            const currentSpeed = speedBase * speedMultiplier * delta;
            
            const joystick = agent.id === 'player-1' ? s.joystickData.left : { x: 0, y: 0 };
            
            if (agent.id === 'player-1' && (joystick.x !== 0 || joystick.y !== 0)) {
                nextPos[0] += joystick.x * 12 * speedMultiplier * delta;
                nextPos[2] += joystick.y * 12 * speedMultiplier * delta;
                nextRotation = Math.atan2(joystick.x, joystick.y);
                agent.targetId = null;
                nextStuck = 0;
                nextWander = null;
            } else {
                let tX = agent.position[0];
                let tZ = agent.position[2];
                let hasTarget = false;

                if (agent.targetId) {
                    const targetNode = s.resourceNodes.find(r => r.id === agent.targetId) || s.agents.find(a => a.id === agent.targetId);
                    if (targetNode) {
                        tX = targetNode.position[0];
                        tZ = targetNode.position[2];
                        hasTarget = true;
                    }
                } else if (agent.state === AgentState.IDLE) {
                    if (!nextWander || Math.hypot(nextWander[0] - agent.position[0], nextWander[2] - agent.position[2]) < 1.0) {
                        if (Math.random() < 0.005) {
                            nextWander = [
                                agent.position[0] + (Math.random() - 0.5) * 30,
                                0,
                                agent.position[2] + (Math.random() - 0.5) * 30
                            ];
                        }
                    }
                    if (nextWander) {
                        tX = nextWander[0]; tZ = nextWander[2];
                        hasTarget = true;
                    }
                }

                if (hasTarget) {
                    const dx = tX - agent.position[0];
                    const dz = tZ - agent.position[2];
                    const dist = Math.hypot(dx, dz);
                    
                    if (dist > 1.5) {
                        let desiredDx = dx / dist;
                        let desiredDz = dz / dist;

                        WORLD_STRUCTURES.forEach(struct => {
                            const sdx = agent.position[0] - struct.pos[0];
                            const sdz = agent.position[2] - struct.pos[1];
                            const sdist = Math.hypot(sdx, sdz);
                            if (sdist < struct.radius + 2) {
                                const force = (struct.radius + 2 - sdist) / (struct.radius + 2);
                                desiredDx += (sdx / sdist) * force * 3.0;
                                desiredDz += (sdz / sdist) * force * 3.0;
                            }
                        });

                        s.agents.forEach(other => {
                            if (other.id === agent.id) return;
                            const adx = agent.position[0] - other.position[0];
                            const adz = agent.position[2] - other.position[2];
                            const adist = Math.hypot(adx, adz);
                            if (adist < 2.5) {
                                const aforce = (2.5 - adist) / 2.5;
                                desiredDx += (adx / adist) * aforce * 1.5;
                                desiredDz += (adz / adist) * aforce * 1.5;
                            }
                        });

                        const finalDist = Math.hypot(desiredDx, desiredDz);
                        desiredDx /= finalDist; desiredDz /= finalDist;
                        const targetAngle = Math.atan2(desiredDx, desiredDz);
                        let angleDiff = targetAngle - nextRotation;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        nextRotation += angleDiff * 5.0 * delta;
                        nextPos[0] += Math.sin(nextRotation) * currentSpeed;
                        nextPos[2] += Math.cos(nextRotation) * currentSpeed;

                        const newDist = Math.hypot(tX - nextPos[0], tZ - nextPos[2]);
                        if (dist - newDist < currentSpeed * 0.1) nextStuck++;
                        else nextStuck = 0;

                        if (nextStuck > 150) {
                            nextRotation += (Math.random() - 0.5) * Math.PI; 
                            nextStuck = 0; nextWander = null;
                        }
                    } else if (agent.state === AgentState.GATHERING) {
                        nextXP += 25 * delta; 
                        if (nextXP >= xpForLevel(nextLvl)) {
                           nextLvl++;
                           soundManager.playCombat('MAGIC');
                           s.addLog(`${agent.name} level ${nextLvl}!`, 'SYSTEM');
                        }
                    }
                }
            }
            
            return { 
                ...agent, position: nextPos, rotationY: nextRotation, 
                xp: nextXP, level: nextLvl, stuckTicks: nextStuck, wanderTarget: nextWander
            };
        })
    }));
  }
}));
