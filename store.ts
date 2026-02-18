
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Quest, Item, StructureType, LandParcel, Structure,
  Monster, MonsterType, MONSTER_TEMPLATES, Battle, ActionProposal, ChatChannel
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
  manualProposalAction: (proposalId: string, action: 'APPROVE' | 'DECLINE') => Promise<void>;
  processProposalDecision: (proposalId: string, deciderId?: string) => Promise<void>;
}

const countResource = (agent: Agent, type: string): number => {
    return agent.inventory.reduce((acc, item) => {
        if (item && item.type === 'MATERIAL' && item.subtype === type) {
            return acc + 1;
        }
        return acc;
    }, 0);
};

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
            stats: { str: 10, agi: 10, int: 15, vit: 12, hp: 120, maxHp: 120 }
        }
    ];

    // Seed some initial materials for Aurelius to demonstrate autonomous building
    for(let i=0; i<12; i++) {
        initialAgents[0].inventory[i] = {
            id: `seed_${i}`, name: 'Raw Material', type: 'MATERIAL', subtype: i < 6 ? 'WOOD' : 'STONE',
            rarity: 'COMMON', stats: {}, description: 'Initial building stock.'
        };
    }

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
                const dist = 2;
                return {
                    ...agent,
                    position: [agent.position[0] + Math.cos(angle) * dist, agent.position[1], agent.position[2] + Math.sin(angle) * dist] as [number, number, number]
                };
            }
            return agent;
        });
        return { agents: newAgents, serverStats: { ...state.serverStats, uptime: state.serverStats.uptime + delta } };
    });
  },

  runCognition: async () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastLocalThinkTime < 6000) return;
    
    set({ lastLocalThinkTime: now });

    for (const agent of state.agents) {
        if (agent.faction !== 'PLAYER' && agent.faction !== 'NPC') continue;
        
        const decisionResult = await generateAutonomousDecision(
            agent, 
            state.agents.filter(a => a.id !== agent.id),
            state.resourceNodes,
            state.logs.slice(0, 10),
            agent.position[0] === 0 && agent.position[2] === 0
        );

        const summary = summarizeNeurologicChoice(agent, state.agents, state.resourceNodes, state.landParcels);
        
        if (summary.choice === AgentState.BUILDING || summary.choice === AgentState.ALLIANCE_FORMING) {
             const proposalId = `prop_${now}_${agent.id}`;
             const type = summary.choice === AgentState.BUILDING ? 'BUILD' : 'ALLIANCE';
             let description = decisionResult.thought || `Agent ${agent.name} proposes ${type}: ${summary.reason}`;
             let costGold = 0, costWood = 0, costStone = 0;
             let targetId = undefined;

             if (type === 'BUILD') {
                 const p = state.landParcels.find(lp => lp.ownerId === null);
                 if (p) {
                    costGold = p.price; costWood = 5; costStone = 5;
                    targetId = p.id;
                    description = `[EXECUTIVE] Proposing settlement at ${p.name}. (Cost: ${costGold}g, ${costWood}w, ${costStone}s)`;
                 }
             }

             if (targetId || type === 'ALLIANCE') {
                 const newProposal: ActionProposal = { id: proposalId, agentId: agent.id, type, status: 'PENDING', description, costGold, costWood, costStone, targetId };
                 
                 set(s => ({
                     actionProposals: [...s.actionProposals, newProposal].slice(-10),
                     chatMessages: [...s.chatMessages, {
                        id: `msg_${proposalId}`, senderId: agent.id, senderName: agent.name, 
                        message: description, channel: 'THOUGHT' as ChatChannel, timestamp: now, proposalId
                     }].slice(-50)
                 }));

                 // AUTONOMOUS SOVEREIGNTY: Agent triggers its own decision-making process
                 setTimeout(() => get().processProposalDecision(proposalId), 2500);
             }
        } else {
            set(s => ({
                agents: s.agents.map(a => a.id === agent.id ? { 
                    ...a, 
                    state: decisionResult.newState || summary.choice,
                    lastChoiceLogic: decisionResult.thought 
                } : a)
            }));
        }
    }
  },

  processProposalDecision: async (proposalId, deciderId) => {
    const state = get();
    const proposal = state.actionProposals.find(p => p.id === proposalId);
    if (!proposal || proposal.status !== 'PENDING') return;

    const agent = state.agents.find(a => a.id === (deciderId || proposal.agentId));
    if (!agent) return;

    try {
        const decision = await evaluateActionProposal(agent, proposal);
        
        if (decision.approved) {
            if (proposal.type === 'BUILD') {
                const woodIndices = agent.inventory.map((item, idx) => item?.subtype === 'WOOD' ? idx : -1).filter(idx => idx !== -1);
                const stoneIndices = agent.inventory.map((item, idx) => item?.subtype === 'STONE' ? idx : -1).filter(idx => idx !== -1);
                
                const canFund = agent.gold >= (proposal.costGold || 0) && woodIndices.length >= (proposal.costWood || 0) && stoneIndices.length >= (proposal.costStone || 0);

                if (canFund) {
                    // CONCRETE RESOURCE CONSUMPTION
                    const newInventory = [...agent.inventory];
                    for(let i=0; i<(proposal.costWood||0); i++) newInventory[woodIndices[i]] = null;
                    for(let i=0; i<(proposal.costStone||0); i++) newInventory[stoneIndices[i]] = null;

                    get().addLog(`${agent.name} [SUCCESS]: Build complete at ${proposal.targetId}`, 'SYSTEM', agent.name);
                    get().buildStructure(proposal.targetId!, 'HOUSE');
                    
                    set(s => ({
                        agents: s.agents.map(a => a.id === agent.id ? { 
                            ...a, 
                            gold: a.gold - (proposal.costGold || 0),
                            inventory: newInventory,
                            memoryCache: [...a.memoryCache, `[PLANNING_SUCCESS] Build at ${proposal.targetId} finalized. Experience gained.`]
                        } : a),
                        actionProposals: s.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'EXECUTED', decisionReasoning: decision.reasoning } : p)
                    }));
                } else {
                    get().addLog(`${agent.name} [FAILURE]: Insufficient materials for build.`, 'SYSTEM', agent.name);
                    set(s => ({ 
                        agents: s.agents.map(a => a.id === agent.id ? { ...a, memoryCache: [...a.memoryCache, "[PLANNING_FAILURE] Attempted build but lacked physical assets. Must prioritize gathering."] } : a),
                        actionProposals: s.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'DECLINED', decisionReasoning: "[Self-Correction] Critical resource deficit detected during execution check." } : p) 
                    }));
                }
            } else if (proposal.type === 'ALLIANCE') {
                set(s => ({ actionProposals: s.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'APPROVED', decisionReasoning: decision.reasoning } : p) }));
            }
        } else {
            set(s => ({ 
                agents: s.agents.map(a => a.id === agent.id ? { ...a, memoryCache: [...a.memoryCache, `[PLANNING_DECLINED] I rejected my own proposal: ${decision.reasoning}`] } : a),
                actionProposals: s.actionProposals.map(p => p.id === proposalId ? { ...p, status: 'DECLINED', decisionReasoning: decision.reasoning } : p) 
            }));
        }
    } catch (e) {
        console.error("Autonomous planning failed", e);
    }
  },

  manualProposalAction: async (proposalId, action) => {
    const s = get();
    set({
        actionProposals: s.actionProposals.map(p => p.id === proposalId ? { 
            ...p, 
            status: action === 'APPROVE' ? 'APPROVED' : 'DECLINED',
            decisionReasoning: "Manual Notar Override Triggered." 
        } : p)
    });
    if (action === 'APPROVE') {
        get().processProposalDecision(proposalId);
    }
  },

  addLog: (message, type, sender) => {
    const newLog: LogEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), message, type, sender: sender || 'SYSTEM' };
    set(state => ({ logs: [newLog, ...state.logs].slice(0, 100) }));
    if (type === 'THOUGHT' || type === 'SYSTEM' || type === 'TRADE') {
        set(state => ({ chatMessages: [...state.chatMessages, { id: newLog.id, senderId: sender || 'SYSTEM', senderName: sender || 'SYSTEM', message, channel: (type === 'THOUGHT' ? 'THOUGHT' : 'GLOBAL') as ChatChannel, timestamp: newLog.timestamp }].slice(-50) }));
    }
  },

  sendSignal: async (content) => {
    const { addLog } = get();
    addLog(`Signal broadcast: ${content}`, 'SYSTEM', 'NOTAR');
    const response = await generateSocialResponse(get().agents[0], 'Terminal', content, get().logs.map(l => l.message));
    addLog(response.reply, 'THOUGHT', get().agents[0].name);
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleMount: (agentId) => set(state => ({ agents: state.agents.map(a => a.id === agentId ? { ...a, state: a.state === AgentState.MOUNTED ? AgentState.IDLE : AgentState.MOUNTED } : a) })),
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
      newInventory[inventoryIndex] = agent.equipment[slot];
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: { ...a.equipment, [slot!]: item }, inventory: newInventory } : a) };
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
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, equipment: { ...a.equipment, [slot]: null }, inventory: newInventory } : a) };
  }),
  moveInventoryItem: (agentId, from, to) => set(state => {
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) return state;
      const newInventory = [...agent.inventory];
      [newInventory[from], newInventory[to]] = [newInventory[to], newInventory[from]];
      return { agents: state.agents.map(a => a.id === agentId ? { ...a, inventory: newInventory } : a) };
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
            id: Math.random().toString(36).substr(2, 9), name: partial.name || 'Unknown', classType: 'Import', faction: 'NPC', position: [Math.random() * 20 - 10, 0, Math.random() * 20 - 10], rotationY: 0, level: 1, xp: 0, state: AgentState.IDLE, soulDensity: 0.5, gold: 100, stabilityIndex: 1.0, energy: 100, maxEnergy: 100, integrity: 1.0, dna: { hash: '0xIMPORT', generation: 1, corruption: 0 }, memoryCache: ['Materialized in Axiom.'], thinkingMatrix: partial.thinkingMatrix || { personality: 'Neutral', currentLongTermGoal: 'Observe', alignment: 0, languagePreference: 'EN' }, skills: {}, inventory: Array(20).fill(null), equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: partial.stats || { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }, loreSnippet: partial.loreSnippet
        };
        set(state => ({ agents: [...state.agents, newAgent] }));
    }
  },
  toggleMap: (show) => set({ showMap: show }),
  setJoystick: (side, value) => {},
  buildStructure: (parcelId, type) => set(state => {
      const parcels = state.landParcels.map(p => p.id === parcelId ? { ...p, structures: [...p.structures, { id: Math.random().toString(), type, position: p.position }] } : p);
      return { landParcels: parcels };
  }),
  certifyParcel: (parcelId) => set(state => ({ landParcels: state.landParcels.map(p => p.id === parcelId ? { ...p, isCertified: true } : p) })),
  reflectOnMemory: async (agentId) => {
      const agent = get().agents.find(a => a.id === agentId);
      if (!agent) return;
      const reflection = await analyzeMemories(agent);
      set(state => ({ agents: state.agents.map(a => a.id === agentId ? { ...a, memoryCache: [...a.memoryCache, `REFLECTED: ${reflection.analysis}`], thinkingMatrix: { ...a.thinkingMatrix, personality: reflection.updatedPersonality || a.thinkingMatrix.personality, currentLongTermGoal: reflection.updatedGoal || a.thinkingMatrix.currentLongTermGoal, alignment: a.thinkingMatrix.alignment + (reflection.alignmentShift || 0) } } : a) }));
  }
})));
