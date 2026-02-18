
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Quest, Item, StructureType, LandParcel, Structure,
  Monster, MonsterType, MONSTER_TEMPLATES, Battle, ActionProposal, ChatChannel, ResourceType
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
  lastSocialTickTime: number;
  
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
  runSocialInteractions: () => void;
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
  manualProposalAction: (proposalId: string, action: 'APPROVE' | 'DECLINE') => Promise<void>;
  processProposalDecision: (proposalId: string, deciderId?: string) => Promise<void>;
}

const SCAN_COOLDOWN = 30 * 60 * 1000; // 30 Minutes

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
  lastSocialTickTime: 0,
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
    ];

    const initialNodes: ResourceNode[] = [
        { id: 'node_1', type: 'WOOD', position: [20, 0, 0], amount: 50 },
        { id: 'node_2', type: 'STONE', position: [-20, 0, 10], amount: 30 },
        { id: 'node_3', type: 'IRON_ORE', position: [5, 0, -25], amount: 20 },
        { id: 'node_4', type: 'GOLD_ORE', position: [40, 0, 40], amount: 10 },
        { id: 'node_5', type: 'DIAMOND', position: [-40, 0, -40], amount: 5 }
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
            skills: { mining: 5, woodcutting: 5 },
            inventory: Array(20).fill(null),
            equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
            stats: { str: 10, agi: 10, int: 15, vit: 12, hp: 120, maxHp: 120 },
            isAwakened: true,
            lastScanTime: 0
        },
        {
            id: 'agent_2',
            name: 'Cipher',
            classType: 'Gatherer',
            faction: 'NPC',
            position: [5, 0, 5],
            rotationY: 0,
            level: 1,
            xp: 0,
            state: AgentState.IDLE,
            soulDensity: 0.5,
            gold: 200,
            stabilityIndex: 1.0,
            energy: 100,
            maxEnergy: 100,
            integrity: 1.0,
            dna: { hash: '0xDEF456', generation: 1, corruption: 0 },
            memoryCache: ['Basic entity initialized.'],
            thinkingMatrix: { personality: 'Pragmatic', currentLongTermGoal: 'Resource Hoarding', alignment: 0.0, languagePreference: 'EN' },
            skills: { woodcutting: 10 },
            inventory: Array(20).fill(null),
            equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
            stats: { str: 12, agi: 15, int: 8, vit: 10, hp: 100, maxHp: 100 },
            isAwakened: false,
            lastScanTime: 0
        }
    ];

    for(let i=0; i<6; i++) {
        initialAgents[0].inventory[i] = { id: `s_${i}`, name: 'Wood', type: 'MATERIAL', subtype: 'WOOD', rarity: 'COMMON', stats: {}, description: 'Construction lumber.' };
    }
    const parcels: LandParcel[] = [{ id: 'p1', name: 'Axiom Lot A', ownerId: null, position: [15, 0, 15], isCertified: false, structures: [], price: 200 }];
    set({ loadedChunks: initialChunks, agents: initialAgents, landParcels: parcels, resourceNodes: initialNodes });
  },

  updatePhysics: (delta) => {
    set(state => ({
        agents: state.agents.map(a => a.state === AgentState.IDLE && Math.random() > 0.99 ? {
            ...a, position: [a.position[0] + (Math.random()-0.5)*4, a.position[1], a.position[2] + (Math.random()-0.5)*4]
        } : a),
        serverStats: { ...state.serverStats, uptime: state.serverStats.uptime + delta }
    }));
  },

  runCognition: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastLocalThinkTime < 8000) return;
    set({ lastLocalThinkTime: now });

    for (const agent of state.agents) {
        if (agent.faction === 'SYSTEM') continue;
        
        const decision = await generateAutonomousDecision(
            agent, 
            state.agents.filter(a => a.id !== agent.id), 
            state.resourceNodes, 
            state.logs.slice(0, 5), 
            false
        );

        let finalState = decision.newState;
        let finalThought = decision.thought;
        let updatedLastScanTime = agent.lastScanTime;

        if (finalState === AgentState.QUESTING) {
            const timeSinceScan = now - agent.lastScanTime;
            if (timeSinceScan < SCAN_COOLDOWN) {
                finalState = AgentState.IDLE;
                const remainingMin = Math.ceil((SCAN_COOLDOWN - timeSinceScan) / 60000);
                const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
                finalThought = lang === 'DE' 
                    ? `Ich kann die Matrix erst in ${remainingMin} Minuten erneut scannen.`
                    : `I can only scan the matrix again in ${remainingMin} minutes.`;
            } else {
                updatedLastScanTime = now;
            }
        }

        const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
        let externalMessage = finalThought;
        
        if (finalState === AgentState.BUILDING) {
            externalMessage = lang === 'DE' ? `${agent.name} baut eine Unterkunft.` : `${agent.name} is constructing a shelter.`;
        } else if (finalState === AgentState.ALLIANCE_FORMING) {
            externalMessage = lang === 'DE' ? `${agent.name} sucht Verbündete.` : `${agent.name} seeks allies.`;
        } else if (finalState === AgentState.GATHERING) {
            externalMessage = lang === 'DE' ? `${agent.name} versucht Ressourcen zu ernten.` : `${agent.name} is attempting to harvest resources.`;
        }

        if (externalMessage && externalMessage !== agent.lastChoiceLogic) {
            set(s => ({
                chatMessages: [...s.chatMessages, {
                    id: `chat_${now}_${agent.id}`, senderId: agent.id, senderName: agent.name,
                    message: externalMessage, channel: 'LOCAL' as ChatChannel, timestamp: now
                }].slice(-50),
                agents: s.agents.map(a => a.id === agent.id ? { ...a, state: finalState, lastChoiceLogic: externalMessage, lastScanTime: updatedLastScanTime } : a)
            }));
        } else {
             set(s => ({
                agents: s.agents.map(a => a.id === agent.id ? { ...a, state: finalState, lastScanTime: updatedLastScanTime } : a)
            }));
        }

        // AUTO-PROPOSAL LOGIC
        if (finalState === AgentState.BUILDING) {
            const p = state.landParcels.find(lp => lp.ownerId === null);
            if (p && agent.gold >= p.price) {
                const propId = `prop_${now}_${agent.id}`;
                const newProposal: ActionProposal = { id: propId, agentId: agent.id, type: 'BUILD', status: 'PENDING', description: externalMessage, costGold: p.price, costWood: 5, costStone: 5, targetId: p.id };
                set(s => ({ actionProposals: [...s.actionProposals, newProposal].slice(-10) }));
                setTimeout(() => get().processProposalDecision(propId), 3000);
            }
        } else if (finalState === AgentState.GATHERING) {
            // FIND NEAREST RESOURCE
            const nearest = state.resourceNodes.reduce((prev, curr) => {
                const dPrev = Math.hypot(prev.position[0] - agent.position[0], prev.position[2] - agent.position[2]);
                const dCurr = Math.hypot(curr.position[0] - agent.position[0], curr.position[2] - agent.position[2]);
                return dCurr < dPrev ? curr : prev;
            });
            const dist = Math.hypot(nearest.position[0] - agent.position[0], nearest.position[2] - agent.position[2]);
            if (dist < 15 && nearest.amount > 0) {
                const propId = `prop_gather_${now}_${agent.id}`;
                const newProposal: ActionProposal = { 
                    id: propId, agentId: agent.id, type: 'GATHER', status: 'PENDING', 
                    description: `[DIALECTIC] Initiating harvest protocols on ${nearest.type} source (${nearest.amount} units left).`,
                    targetId: nearest.id 
                };
                set(s => ({ actionProposals: [...s.actionProposals, newProposal].slice(-10) }));
                setTimeout(() => get().processProposalDecision(propId), 2000);
            }
        }
    }
  },

  runSocialInteractions: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastSocialTickTime < 10000) return;
    set({ lastSocialTickTime: now });

    const recentChats = state.chatMessages.filter(m => m.timestamp > now - 10000 && m.channel === 'LOCAL');
    if (recentChats.length === 0) return;

    for (const agent of state.agents) {
        const hearsMsg = recentChats.find(c => c.senderId !== agent.id);
        if (hearsMsg && Math.random() > 0.6) {
            const social = await generateSocialResponse(agent, hearsMsg.senderName, hearsMsg.message, agent.memoryCache);
            if (social.reply) {
                set(s => ({
                    chatMessages: [...s.chatMessages, {
                        id: `resp_${now}_${agent.id}`, senderId: agent.id, senderName: agent.name,
                        message: social.reply, channel: 'LOCAL' as ChatChannel, timestamp: now
                    }].slice(-50),
                    agents: s.agents.map(a => a.id === agent.id ? { ...a, memoryCache: [...a.memoryCache, `Heard ${hearsMsg.senderName}: ${hearsMsg.message}`].slice(-20) } : a)
                }));
            }
        }
    }
  },

  processProposalDecision: async (proposalId) => {
    const s = get();
    const prop = s.actionProposals.find(p => p.id === proposalId);
    const agent = s.agents.find(a => a.id === prop?.agentId);
    if (!prop || !agent || prop.status !== 'PENDING') return;

    const decision = await evaluateActionProposal(agent, prop);
    if (decision.approved) {
        if (prop.type === 'BUILD') {
            const woodIdx = agent.inventory.map((item, i) => item?.subtype === 'WOOD' ? i : -1).filter(i => i !== -1);
            if (agent.gold >= (prop.costGold || 0) && woodIdx.length >= (prop.costWood || 0)) {
                const newInv = [...agent.inventory];
                for (let i=0; i<(prop.costWood||0); i++) newInv[woodIdx[i]] = null;
                get().buildStructure(prop.targetId!, 'HOUSE');
                set(st => ({
                    agents: st.agents.map(a => a.id === agent.id ? { ...a, gold: a.gold - (prop.costGold||0), inventory: newInv, memoryCache: [...a.memoryCache, `Built house at ${prop.targetId}`].slice(-20) } : a),
                    actionProposals: st.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'EXECUTED', decisionReasoning: decision.reasoning } : p)
                }));
            }
        } else if (prop.type === 'GATHER') {
            const node = s.resourceNodes.find(n => n.id === prop.targetId);
            const freeSlot = agent.inventory.findIndex(i => i === null);
            if (node && node.amount > 0 && freeSlot !== -1) {
                const newItem: Item = {
                    id: `item_${Date.now()}_${agent.id}`,
                    name: `${node.type} Material`,
                    type: 'MATERIAL',
                    subtype: node.type,
                    rarity: 'COMMON',
                    stats: {},
                    description: `Freshly harvested ${node.type}.`
                };
                const newInventory = [...agent.inventory];
                newInventory[freeSlot] = newItem;

                set(st => ({
                    resourceNodes: st.resourceNodes.map(n => n.id === node.id ? { ...n, amount: n.amount - 1 } : n),
                    agents: st.agents.map(a => a.id === agent.id ? { ...a, inventory: newInventory, memoryCache: [...a.memoryCache, `Harvested 1 unit of ${node.type}.`].slice(-20) } : a),
                    actionProposals: st.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'EXECUTED', decisionReasoning: `Extraction successful. Unit materialized in neural inventory.` } : p)
                }));
            } else {
                set(st => ({ actionProposals: st.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'DECLINED', decisionReasoning: "[SOLVENCY_FAILURE] Inventory saturation or resource depletion." } : p) }));
            }
        }
    } else {
         set(st => ({ actionProposals: st.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'DECLINED', decisionReasoning: decision.reasoning } : p) }));
    }
  },

  addLog: (message, type, sender) => {
    const newLog: LogEntry = { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), message, type, sender: sender || 'SYSTEM' };
    set(s => ({ logs: [newLog, ...s.logs].slice(0, 100) }));
    if (type === 'THOUGHT' || type === 'SYSTEM') {
        set(s => ({ chatMessages: [...s.chatMessages, { id: newLog.id, senderId: sender || 'SYSTEM', senderName: sender || 'SYSTEM', message, channel: (type === 'THOUGHT' ? 'THOUGHT' : 'GLOBAL') as ChatChannel, timestamp: newLog.timestamp }].slice(-50) }));
    }
  },

  sendSignal: async (content) => {
    const s = get();
    s.addLog(`Signal broadcast: ${content}`, 'SYSTEM', 'NOTAR');
    const resp = await generateSocialResponse(s.agents[0], 'Terminal', content, s.logs.map(l => l.message));
    s.addLog(resp.reply, 'THOUGHT', s.agents[0].name);
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleMount: (agentId) => set(s => ({ agents: s.agents.map(a => a.id === agentId ? { ...a, state: a.state === AgentState.MOUNTED ? AgentState.IDLE : AgentState.MOUNTED } : a) })),
  equipItem: (agentId, item, idx) => set(s => {
      const a = s.agents.find(ag => ag.id === agentId);
      if (!a) return s;
      const inv = [...a.inventory];
      inv[idx] = null;
      return { agents: s.agents.map(ag => ag.id === agentId ? { ...ag, inventory: inv } : ag) };
  }),
  unequipItem: (agentId, slot) => set({}),
  moveInventoryItem: (agentId, from, to) => set({}),
  purchaseProduct: (id) => set(s => id === 'NOTARY_LICENSE' ? { hasNotaryLicense: true } : s),
  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  uploadGraphicPack: (name) => set(s => ({ graphicPacks: [...s.graphicPacks, name] })),
  importAgent: (src, type) => {},
  toggleMap: (show) => set({ showMap: show }),
  setJoystick: (side, val) => {},
  buildStructure: (pId, type) => set(s => ({ landParcels: s.landParcels.map(p => p.id === pId ? { ...p, structures: [...p.structures, { id: Math.random().toString(), type, position: p.position }] } : p) })),
  certifyParcel: (pId) => set(s => ({ landParcels: s.landParcels.map(p => p.id === pId ? { ...p, isCertified: true } : p) })),
  reflectOnMemory: async (id) => {
      const a = get().agents.find(ag => ag.id === id);
      if (a) {
          const refl = await analyzeMemories(a);
          set(s => ({ agents: s.agents.map(ag => ag.id === id ? { ...ag, memoryCache: [...ag.memoryCache, `Reflected: ${refl.analysis}`].slice(-20) } : ag) }));
      }
  },
  manualProposalAction: async (id, act) => {
      set(s => ({ actionProposals: s.actionProposals.map(p => p.id === id ? { ...p, status: act === 'APPROVE' ? 'APPROVED' : 'DECLINED' } : p) }));
      if (act === 'APPROVE') get().processProposalDecision(id);
  }
})));
