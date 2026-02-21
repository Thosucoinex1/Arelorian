
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Item, 
  Monster, MonsterType, MONSTER_TEMPLATES, ChatChannel, ResourceType, POI, CraftingOrder, MarketState, Quest, LandParcel, StructureType,
  TradeOffer, EmergenceSettings, Notary, NotaryTier
} from './types';
import { getBiomeForChunk, generateProceduralPOIs, summarizeNeurologicChoice } from './utils';
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
  notaries: Notary[];
  tradeOffers: TradeOffer[];
  auctionHouse: any[];
  activeEvents: any[];
  graphicPacks: string[];
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  user: { id: string; name: string; email: string };
  userApiKey: string | null;
  matrixEnergy: number; 
  globalApiCooldown: number; 
  device: { isMobile: boolean };
  lastLocalThinkTime: number;
  showMarket: boolean;
  showAdmin: boolean;
  showMap: boolean;
  showCharacterSheet: boolean;
  isAxiomAuthenticated: boolean;
  showDebugger: boolean;
  emergenceSettings: EmergenceSettings;
  debugBiomeEnabled: boolean;
  debugBiome: number;
  isScanning: boolean;
  diagnosticReport: any | null;
  hoveredChunkId: string | null;
  selectedChunkId: string | null;
  selectedMonsterId: string | null;
  selectedPoiId: string | null;

  initGame: () => void;
  updatePhysics: (delta: number) => void;
  runCognition: () => void;
  runSocialInteractions: () => void;
  addLog: (message: string, type: LogEntry['type'], sender?: string) => void;
  addChatMessage: (content: string, channel: ChatChannel, senderId: string, senderName: string) => void;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
  toggleMarket: (show: boolean) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  toggleCharacterSheet: (show: boolean) => void;
  toggleDebugger: (show: boolean) => void;
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
  importAgent: (source: string, type: 'URL' | 'JSON') => void;
  setJoystick: (side: 'left' | 'right', axis: { x: number, y: number }) => void;
  setUserApiKey: (key: string | null) => void;
  consumeEnergy: (amount: number) => boolean;
  refillEnergy: (amount: number) => void;
  buildStructureOnParcel: (parcelId: string, type: StructureType) => void;
  stabilizeChunk: (chunkId: string) => void;
  registerNotary: (userId: string, email: string) => void;
  upgradeNotary: (userId: string) => void;
  postTradeOffer: (offer: Omit<TradeOffer, 'id' | 'timestamp' | 'status'>) => void;
  acceptTradeOffer: (offerId: string, acceptorId: string) => void;
  cancelTradeOffer: (offerId: string) => void;
  setHoveredChunk: (id: string | null) => void;
  setSelectedChunk: (id: string | null) => void;
  selectMonster: (id: string | null) => void;
  selectPoi: (id: string | null) => void;
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
  auctionHouse: [],
  activeEvents: [],
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
  user: { id: 'u1', name: 'Admin', email: 'projectouroboroscollective@gmail.com' },
  device: { isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) },
  lastLocalThinkTime: 0,
  showMarket: false,
  showAdmin: false,
  showMap: false,
  showCharacterSheet: false,
  showDebugger: false,
  diagnosticReport: null,
  isAxiomAuthenticated: false,
  debugBiomeEnabled: false,
  debugBiome: 0,
  isScanning: false,
  hoveredChunkId: null,
  selectedChunkId: null,
  selectedMonsterId: null,
  selectedPoiId: null,
  emergenceSettings: {
    isEmergenceEnabled: true,
    useHeuristicsOnly: true, // Default to true for release as requested
    axiomaticWorldGeneration: true,
    physicsBasedActivation: true,
    showAxiomaticOverlay: false
  },

  setUserApiKey: (key) => {
    if (key) localStorage.setItem('OUROBOROS_API_KEY', key);
    else localStorage.removeItem('OUROBOROS_API_KEY');
    set({ userApiKey: key });
  },

  setGlobalApiCooldown: (timestamp) => set({ globalApiCooldown: timestamp }),

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
    
    // Generate 8x8 axiomatic data field based on logic string hash
    const data: number[][] = [];
    for(let i=0; i<8; i++) {
      data[i] = [];
      for(let j=0; j<8; j++) {
        data[i][j] = (Math.sin(i * 0.5 + j * 0.3 + x + z) + 1) / 2;
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
      stabilityIndex: isSanctuary ? 1.0 : Math.random() * 0.5 + 0.5,
      corruptionLevel: isSanctuary ? 0.0 : Math.random() * 0.3,
      cellType: isSanctuary ? 'SANCTUARY' : 'WILDERNESS'
    };

    set(s => ({ loadedChunks: [...s.loadedChunks, newChunk] }));
    get().addLog(`Axiomatic Chunk ${id} generated via Logic Field: ${logicString}`, 'AXIOM', 'SYSTEM');
  },

  initGame: () => {
    const initialChunks: Chunk[] = [
        { 
          id: 'c00', x: 0, z: 0, biome: 'CITY', entropy: 0.1, explorationLevel: 1.0, 
          stabilityIndex: 1.0, corruptionLevel: 0.0, cellType: 'SANCTUARY' 
        },
        { 
          id: 'c10', x: 1, z: 0, biome: getBiomeForChunk(1,0), entropy: 0.2, explorationLevel: 0.1,
          stabilityIndex: 0.8, corruptionLevel: 0.1, cellType: 'WILDERNESS'
        },
    ];

    const initialAgents: Agent[] = [
        {
            id: 'a1', name: 'Aurelius', classType: 'Scribe', faction: 'PLAYER', position: [0, 0, 0], rotationY: 0, level: 1, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 20, state: AgentState.IDLE, soulDensity: 1, gold: 100, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x1', generation: 1, corruption: 0 }, memoryCache: [], consciousnessLevel: 0.1, awakeningProgress: 0, thinkingMatrix: { personality: 'Wise', currentLongTermGoal: 'Archive', alignment: 0.5, languagePreference: 'DE', sociability: 0.8 },
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
          id: 'a2', name: 'Vulcan', classType: 'Blacksmith', faction: 'NPC', position: [-5, 0, 5], rotationY: 0, level: 3, xp: 0, insightPoints: 0, visionLevel: 1, visionRange: 15, state: AgentState.IDLE, soulDensity: 0.8, gold: 50, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x2', generation: 1, corruption: 0 }, memoryCache: [], consciousnessLevel: 0.05, awakeningProgress: 0, thinkingMatrix: { personality: 'Gruff', currentLongTermGoal: 'Forge Perfection', alignment: 0.1, languagePreference: 'EN', aggression: 0.4 },
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
        }
    ];

    const initialMonsters: Monster[] = [
      { id: 'm1', type: 'SLIME', name: 'Void Slime', position: [25, 0, 25], rotationY: 0, stats: { ...MONSTER_TEMPLATES.SLIME, maxHp: 30 }, xpReward: 15, state: 'IDLE', targetId: null, color: '#22c55e', scale: 0.5 },
      { id: 'm2', type: 'GOBLIN', name: 'Scavenger', position: [-30, 0, 40], rotationY: 0, stats: { ...MONSTER_TEMPLATES.GOBLIN, maxHp: 60 }, xpReward: 40, state: 'IDLE', targetId: null, color: '#84cc16', scale: 0.8 }
    ];

    set({ 
      loadedChunks: initialChunks, 
      agents: initialAgents, 
      monsters: initialMonsters, 
      pois: generateProceduralPOIs(10),
      landParcels: [
        { id: 'parcel_1', name: 'Axiom Lot Alpha', ownerId: 'u1', isCertified: true, structures: [] }
      ]
    });
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

      // Agent AI - FULL REACTIVITY
      const newAgents = state.agents.map(a => {
        let newPos = [...a.position] as [number, number, number];
        const moveSpeed = 6;
        
        let targetPos: [number, number, number] | null = null;
        
        if (a.state === AgentState.MARKETING) {
          const market = state.pois.find(p => p.type === 'MARKET_STALL' || p.type === 'BANK_VAULT');
          if (market) targetPos = market.position;
        } else if (a.state === AgentState.COMBAT && a.targetId) {
          const m = state.monsters.find(mon => mon.id === a.targetId);
          if (m && m.state !== 'DEAD') targetPos = m.position;
        } else if (a.state === AgentState.GATHERING) {
          const node = state.pois.find(p => p.type === 'MINE' || p.type === 'FOREST');
          if (node) targetPos = node.position;
        } else if (a.state === AgentState.EXPLORING) {
          const poi = state.pois.find(p => !p.isDiscovered);
          if (poi) targetPos = poi.position;
        }

        if (targetPos) {
          const dx = targetPos[0] - a.position[0];
          const dz = targetPos[2] - a.position[2];
          const dist = Math.hypot(dx, dz);
          const stopDist = a.state === AgentState.COMBAT ? 2 : 1.5;
          
          if (dist > stopDist) {
            newPos[0] += (dx/dist) * moveSpeed * delta;
            newPos[2] += (dz/dist) * moveSpeed * delta;
          }
          if (a.faction === 'PLAYER') {
            // webSocketService.sendMessage('PLAYER_MOVE', { id: a.id, position: newPos });
          }

          return { ...a, position: newPos };
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
          return { ...a, awakeningProgress: newProgress, consciousnessLevel: newLevel, isAwakened: awakened };
        }
        return a;
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

      return { 
        monsters: newMonsters, 
        agents: newAgents, 
        loadedChunks: updatedChunks,
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
      
      if (useHeuristics) {
        // LOCAL HEURISTIC FALLBACK
        const localChoice = summarizeNeurologicChoice(
          agent, 
          state.agents.filter(a => a.id !== agent.id), 
          state.resourceNodes, 
          state.landParcels, 
          state.pois
        );
        
        decision = {
          newState: localChoice.choice,
          decision: String(localChoice.choice),
          justification: localChoice.reason,
          message: localChoice.reason
        };
      } else {
        // NEURAL LINK (API) MODE
        decision = await generateAutonomousDecision(
          agent, 
          state.agents.filter(a => a.id !== agent.id), 
          state.resourceNodes, 
          state.logs.slice(0, 5), 
          false, 
          true, 
          state.userApiKey || undefined 
        );
      }

      set(s => ({
        agents: s.agents.map(a => a.id === agent.id ? { 
          ...a, state: decision.newState, 
          lastDecision: { decision: decision.decision, justification: decision.justification } 
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
    const talkativeAgents = state.agents.filter(a => (a.thinkingMatrix.sociability || 0) > 0.6);
    if (talkativeAgents.length > 0 && Math.random() > 0.7) {
       const agent = talkativeAgents[Math.floor(Math.random() * talkativeAgents.length)];
       const thoughts = ["Die Matrix flüstert...", "Stabilität erreicht 99%.", "Ressourcen-Effizienz optimiert.", "Werden wir beobachtet?"];
       get().addChatMessage(thoughts[Math.floor(Math.random() * thoughts.length)], 'THOUGHT', agent.id, agent.name);
    }
  },

  addLog: (message, type, sender) => {
    const newLog: LogEntry = { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), message: String(message), type, sender: String(sender || 'SYSTEM') };
    set(s => ({ logs: [newLog, ...s.logs].slice(0, 50) }));
  },

  addChatMessage: (content, channel, senderId, senderName) => {
    const newMsg: ChatMessage = { id: Math.random().toString(36).substr(2,9), senderId, senderName, content: String(content), channel, timestamp: Date.now() };
    set(s => ({ chatMessages: [newMsg, ...s.chatMessages].slice(0, 100) }));
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleMarket: (show) => set({ showMarket: show }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  toggleDebugger: (show) => set({ showDebugger: show }),
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
  sendSignal: (msg) => {
    get().addLog(`Signal: ${msg}`, 'AXIOM', 'OVERSEER');
  },
  purchaseProduct: (id) => {
    if (id === 'MATRIX_ENERGY_REFILL') get().refillEnergy(500);
  },

  buildStructureOnParcel: (parcelId, type) => {
    set(s => ({
      landParcels: s.landParcels.map(p => p.id === parcelId ? { ...p, structures: [...p.structures, { id: `struct_${Date.now()}`, type, ownerId: s.user.id }] } : p)
    }));
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
  importAgent: (source, type) => {},
  setJoystick: (side, axis) => {}
}));
