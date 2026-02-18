
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Quest, Item, StructureType, LandParcel, Structure,
  Monster, MonsterType, MONSTER_TEMPLATES, Battle, ActionProposal, ChatChannel, ResourceType
} from './types';
import { getBiomeForChunk } from './utils';
import { generateAutonomousDecision, analyzeMemories, generateSocialResponse, evaluateActionProposal } from './services/geminiService';

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

const SCAN_COOLDOWN = 30 * 60 * 1000; 

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
            lastScanTime: 0,
            socialCooldown: 0,
            lastArgumentation: "",
            apiQuotaExceeded: false,
            quotaResetTime: 0
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
            lastScanTime: 0,
            socialCooldown: 0,
            lastArgumentation: "",
            apiQuotaExceeded: false,
            quotaResetTime: 0
        }
    ];

    const parcels: LandParcel[] = [{ id: 'p1', name: 'Axiom Lot A', ownerId: null, position: [15, 0, 15], isCertified: false, structures: [], price: 200 }];
    set({ loadedChunks: initialChunks, agents: initialAgents, landParcels: parcels, resourceNodes: initialNodes });

    // Administrative Log: Research Leads Initialization
    get().addLog("ADMIN: Start der sozialen Phase. Gruß an Petra Markgraf von Thomas.", 'WATCHDOG', 'NOTAR');
  },

  updatePhysics: (delta) => {
    const now = Date.now();
    set(state => ({
        agents: state.agents.map(a => {
            let newPos = a.position;
            if (a.state === AgentState.IDLE && Math.random() > 0.99) {
                newPos = [a.position[0] + (Math.random()-0.5)*10, a.position[1], a.position[2] + (Math.random()-0.5)*10];
            }
            if (a.state === AgentState.GATHERING && a.targetId) {
                const node = state.resourceNodes.find(n => n.id === a.targetId);
                if (node) {
                    const dx = node.position[0] - a.position[0];
                    const dz = node.position[2] - a.position[2];
                    const dist = Math.hypot(dx, dz);
                    if (dist > 1.5) {
                        newPos = [a.position[0] + (dx/dist)*5*delta, a.position[1], a.position[2] + (dz/dist)*5*delta];
                    }
                }
            }
            let quotaExceeded = a.apiQuotaExceeded;
            if (quotaExceeded && a.quotaResetTime && now > a.quotaResetTime) quotaExceeded = false;
            return { ...a, position: newPos, apiQuotaExceeded: quotaExceeded };
        }),
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
        const canScan = (now - agent.lastScanTime) >= SCAN_COOLDOWN;
        const decision = await generateAutonomousDecision(
            agent, 
            state.agents.filter(a => a.id !== agent.id), 
            state.resourceNodes, 
            state.logs.slice(0, 10), 
            false,
            canScan
        );

        let finalState = decision.newState;
        let finalThought = decision.thought;
        let updatedLastScanTime = agent.lastScanTime;

        if (finalState === AgentState.QUESTING && !canScan) {
            finalState = AgentState.IDLE;
            const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
            finalThought = lang === 'DE' ? `Synchronisation läuft noch.` : `Sync in progress.`;
        } else if (finalState === AgentState.QUESTING) {
            updatedLastScanTime = now;
        }

        const channel: ChatChannel = (finalState === AgentState.THINKING) ? 'THOUGHT' : 'LOCAL';
        if (finalThought !== agent.lastChoiceLogic || channel === 'THOUGHT') {
            set(s => ({
                chatMessages: [...s.chatMessages, {
                    id: `chat_${now}_${agent.id}`, senderId: agent.id, senderName: agent.name,
                    message: finalThought, channel: channel, timestamp: now
                }].slice(-50),
                agents: s.agents.map(a => a.id === agent.id ? { ...a, state: finalState, lastChoiceLogic: finalThought, lastScanTime: updatedLastScanTime } : a)
            }));
        }

        if (finalState === AgentState.GATHERING) {
            const nearest = state.resourceNodes.reduce((prev, curr) => {
                const dPrev = Math.hypot(prev.position[0] - agent.position[0], prev.position[2] - agent.position[2]);
                const dCurr = Math.hypot(curr.position[0] - agent.position[0], curr.position[2] - agent.position[2]);
                return dCurr < dPrev ? curr : prev;
            });
            const propId = `prop_gather_${now}_${agent.id}`;
            // Fix: Added explicit casting for ActionProposal type compatibility
            set(s => ({ 
                actionProposals: [...s.actionProposals, { 
                    id: propId, 
                    agentId: agent.id, 
                    type: 'GATHER' as const, 
                    status: 'PENDING' as const, 
                    description: `Sammle ${nearest.type}...`, 
                    targetId: nearest.id 
                } as ActionProposal].slice(-10) 
            }));
            setTimeout(() => get().processProposalDecision(propId), 2000);
        }
    }
  },

  runSocialInteractions: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastSocialTickTime < 10000) return;
    set({ lastSocialTickTime: now });

    const recentChats = state.chatMessages.filter(m => m.timestamp > now - 15000 && m.channel === 'LOCAL');
    if (recentChats.length === 0) return;

    for (const agent of state.agents) {
        if (agent.socialCooldown > now) continue;
        const hearsMsg = recentChats.find(c => c.senderId !== agent.id);
        if (hearsMsg && Math.random() > 0.4) {
            const social = await generateSocialResponse(agent, hearsMsg.senderName, hearsMsg.message, agent.memoryCache);
            if (social.reply) {
                // Notar-Anweisung check for first cooperation
                if (social.action === 'COOPERATE') {
                    get().addLog(`RESEARCH_LEADS: Kooperation zwischen ${agent.name} und ${hearsMsg.senderName} initiiert.`, 'SYSTEM', 'NOTAR');
                }

                set(s => ({
                    chatMessages: [...s.chatMessages, {
                        id: `resp_${now}_${agent.id}`, senderId: agent.id, senderName: agent.name,
                        message: social.reply, channel: 'LOCAL' as ChatChannel, timestamp: now
                    }].slice(-50),
                    agents: s.agents.map(a => a.id === agent.id ? { 
                        ...a, 
                        socialCooldown: now + 20000,
                        lastArgumentation: social.thought,
                        memoryCache: [...a.memoryCache, `Dialektik: ${social.action} mit ${hearsMsg.senderName}.`].slice(-20) 
                    } : a)
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
        if (prop.type === 'GATHER') {
            const node = s.resourceNodes.find(n => n.id === prop.targetId);
            const freeSlot = agent.inventory.findIndex(i => i === null);
            // Fix: Defined 'now' variable for item ID generation
            const now = Date.now();
            if (node && node.amount > 0 && freeSlot !== -1) {
                const newInv = [...agent.inventory];
                newInv[freeSlot] = { id: `it_${now}_${agent.id}`, name: `${node.type}`, type: 'MATERIAL', subtype: node.type, rarity: 'COMMON', stats: {}, description: 'Extrahiert.' };
                set(st => ({
                    resourceNodes: st.resourceNodes.map(n => n.id === node.id ? { ...n, amount: n.amount - 1 } : n),
                    agents: st.agents.map(a => a.id === agent.id ? { ...a, inventory: newInv } : a),
                    actionProposals: st.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'EXECUTED', decisionReasoning: decision.reasoning } : p)
                }));
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
  equipItem: (agentId, item, idx) => {},
  unequipItem: (agentId, slot) => {},
  moveInventoryItem: (agentId, from, to) => {},
  purchaseProduct: (id) => {},
  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  uploadGraphicPack: (name) => {},
  importAgent: (src, type) => {},
  toggleMap: (show) => {},
  setJoystick: (side, val) => {},
  buildStructure: (pId, type) => {},
  certifyParcel: (pId) => {},
  reflectOnMemory: async (id) => {},
  manualProposalAction: async (id, act) => {}
})));
