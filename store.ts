
import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Quest, Item, StructureType, LandParcel, Structure,
  Monster, MonsterType, MONSTER_TEMPLATES, Battle
} from './types';
import { getBiomeForChunk, summarizeNeurologicChoice } from './utils';
import { generateAutonomousDecision } from './services/geminiService';
import { CharacterImporter } from './services/CharacterImporter';

export interface User {
  id: string;
  name: string;
  email?: string;
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
  
  selectedAgentId: string | null;
  cameraTarget: [number, number, number] | null; 
  loadedChunks: Chunk[];
  globalJackpot: number;
  stability: number;
  lastLocalThinkTime: number;
  lastCombatTick: number;
  
  user: User | null;
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
  addLog: (message: any, type: LogEntry['type'], sender?: string) => void;
  sendSignal: (content: string) => Promise<void>;
  selectAgent: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number] | null) => void;
  
  setAxiomAuthenticated: (val: boolean) => void;
  buildStructure: (pId: string, sType: StructureType) => void;
  certifyParcel: (pId: string) => void;
  toggleCharacterSheet: (val: boolean) => void;
  toggleMount: (agentId: string) => void;
  equipItem: (agentId: string, item: Item, index: number) => void;
  unequipItem: (agentId: string, slot: any) => void;
  moveInventoryItem: (agentId: string, from: number, to: number) => void;
  purchaseProduct: (productId: string) => void;
  toggleAdmin: (val: boolean) => void;
  uploadGraphicPack: (name: string) => void;
  toggleMap: (val: boolean) => void;
  setJoystick: (side: 'left' | 'right', values: {x: number, y: number}) => void;
  
  importAgent: (source: string, type: 'URL' | 'JSON') => Promise<void>;
}

export const useStore = create<GameState>((set, get) => ({
  agents: [], monsters: [], resourceNodes: [], logs: [], chatMessages: [], battles: [],
  selectedAgentId: null, cameraTarget: null, loadedChunks: [],
  globalJackpot: 50000, stability: 1.0, lastLocalThinkTime: 0, lastCombatTick: 0,
  
  user: { 
    id: 'user_1', 
    name: 'Observer_Alpha', 
    email: 'projectouroboroscollective@gmail.com' 
  },
  isAxiomAuthenticated: false,
  hasNotaryLicense: false,
  agentSlots: 15,
  device: { isMobile: window.innerWidth < 768 },
  serverStats: { uptime: 0, tickRate: 60, memoryUsage: 120, threatLevel: 0.05 },
  landParcels: [],
  auctionHouse: [],
  activeEvents: [],
  showCharacterSheet: false,
  showAdmin: false,
  showMap: false,
  graphicPacks: ['Standard Axiom Pack'],
  quests: [],

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  setAxiomAuthenticated: (val: boolean) => set({ isAxiomAuthenticated: val }),

  addLog: (message, type, sender = 'SYSTEM') => set(state => ({ 
    logs: [{ 
      id: Math.random().toString(), 
      timestamp: Date.now(), 
      message: typeof message === 'object' ? JSON.stringify(message) : String(message), 
      type, 
      sender: String(sender) 
    }, ...state.logs].slice(0, 60) 
  })),

  initGame: () => {
    const newChunks: Chunk[] = [];
    const resources: ResourceNode[] = [];
    const newMonsters: Monster[] = [];
    
    const OFFSET = 2; 
    const CHUNK_SIZE = 80;

    for (let x = -OFFSET; x <= OFFSET; x++) {
      for (let z = -OFFSET; z <= OFFSET; z++) {
        const biome = getBiomeForChunk(x, z);
        const rand = Math.random();
        
        let roomType: Chunk['roomType'] = 'NORMAL';
        if (x === 0 && z === 0) roomType = 'SAFE'; 
        else if (rand < 0.1) roomType = 'DUNGEON';
        else if (rand < 0.2) roomType = 'RESOURCE_RICH';
        else if (rand < 0.25) roomType = 'BOSS';

        newChunks.push({ id: `${x},${z}`, x, z, biome, entropy: Math.random(), roomType });

        const resCount = roomType === 'RESOURCE_RICH' ? 8 : roomType === 'NORMAL' ? 2 : 0;
        for(let i=0; i<resCount; i++) {
           let type: any = 'WOOD';
           if (biome === 'MOUNTAIN') type = Math.random() > 0.5 ? 'STONE' : 'IRON_ORE';
           if (biome === 'FOREST') type = Math.random() > 0.7 ? 'SUNLEAF_HERB' : 'WOOD';
           if (biome === 'PLAINS') type = Math.random() > 0.8 ? 'STONE' : 'WOOD';
           if (roomType === 'RESOURCE_RICH') type = 'GOLD_ORE';

           resources.push({
               id: `res_${x}_${z}_${i}`,
               type,
               position: [
                   x * CHUNK_SIZE + (Math.random() - 0.5) * 60,
                   0,
                   z * CHUNK_SIZE + (Math.random() - 0.5) * 60
               ],
               amount: 100
           });
        }

        if (roomType !== 'SAFE') {
            const monsterChance = roomType === 'DUNGEON' ? 0.8 : 0.3;
            if (Math.random() < monsterChance) {
                let preferredType: MonsterType = 'GOBLIN';
                if (biome === 'MOUNTAIN') preferredType = 'ORC';
                if (roomType === 'BOSS') preferredType = 'BOSS_DEMON';
                else if (Math.random() > 0.9) preferredType = 'DRAGON';
                else if (Math.random() > 0.6) preferredType = 'ORC';

                const template = MONSTER_TEMPLATES[preferredType];
                newMonsters.push({
                    id: `mob_${x}_${z}_${Math.random().toString(36).substr(2,4)}`,
                    type: preferredType,
                    name: String(template.name),
                    position: [
                        x * CHUNK_SIZE + (Math.random() - 0.5) * 60,
                        0,
                        z * CHUNK_SIZE + (Math.random() - 0.5) * 60
                    ],
                    rotationY: Math.random() * Math.PI * 2,
                    stats: { hp: template.hp, maxHp: template.hp, atk: template.atk, def: template.def },
                    xpReward: template.xp,
                    state: 'IDLE',
                    targetId: null,
                    color: template.color,
                    scale: template.scale
                });
            }
        }
      }
    }

    const parcels: LandParcel[] = [];
    const parcelCount = 12;
    const radius = 50;
    for(let i=0; i<parcelCount; i++) {
        const angle = (i / parcelCount) * Math.PI * 2;
        parcels.push({
            id: `plot_${i}`,
            name: `Plot ${i+1}`,
            ownerId: null,
            position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius],
            isCertified: false,
            structures: [],
            price: 300 
        });
    }

    const agents: Agent[] = Array(8).fill(0).map((_, i) => ({
      id: `agent_${i}`,
      name: `Entity_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      classType: ['Paladin', 'Technomancer', 'Scout'][i % 3],
      faction: 'PLAYER',
      position: [(Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40],
      rotationY: Math.random() * Math.PI * 2,
      level: 1, xp: 0,
      state: AgentState.IDLE,
      soulDensity: 0.5, gold: 350,
      stabilityIndex: 1.0, energy: 100, maxEnergy: 100, integrity: 1.0,
      dna: { hash: Math.random().toString(36).slice(2), generation: 1, corruption: 0 },
      memoryCache: [],
      thinkingMatrix: { personality: 'Analytical', currentLongTermGoal: 'Observe System', alignment: 0.2, languagePreference: 'MIXED', sociability: Math.random(), aggression: Math.random() },
      skills: { 
          gathering: Math.random() * 5, 
          logic: Math.random() * 5,
          mining: i % 3 === 0 ? Math.random() * 10 : 0,
          woodcutting: i % 3 === 1 ? Math.random() * 10 : 0
      },
      inventory: Array(10).fill(null),
      equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
      stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 },
      stuckTicks: 0, wanderTarget: null
    }));
    
    set({ loadedChunks: newChunks, agents, monsters: newMonsters, resourceNodes: resources, landParcels: parcels });
    get().addLog('Ouroboros Grid Initialized. Monsters Spawned.', 'SYSTEM');
  },

  importAgent: async (source, type) => {
      get().addLog(`Initiating Neural Import...`, 'SYSTEM');
      let data: Partial<Agent> | null = null;
      if (type === 'URL') {
          data = await CharacterImporter.importFromURL(source);
      } else {
          data = CharacterImporter.importFromJSON(source);
      }

      if (data) {
          const newAgent: Agent = {
              id: `imported_${Date.now()}`,
              name: String(data.name || 'Unknown'),
              classType: 'Traveler',
              faction: 'PLAYER',
              position: [0, 5, 0], 
              rotationY: 0,
              level: 1, xp: 0,
              state: AgentState.IDLE,
              soulDensity: 0.8, gold: 100,
              stabilityIndex: 1.0, energy: 100, maxEnergy: 100, integrity: 1.0,
              dna: { hash: 'IMPORTED', generation: 0, corruption: 0 },
              memoryCache: [`IMPORTED FROM ${type}`],
              thinkingMatrix: {
                  personality: 'Complex',
                  currentLongTermGoal: 'Adapt',
                  alignment: 0.5,
                  languagePreference: 'EN',
                  ...data.thinkingMatrix
              } as any,
              skills: { gathering: 1, logic: 5 },
              inventory: Array(10).fill(null),
              equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
              stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100, ...data.stats },
              loreSnippet: String(data.loreSnippet || "")
          };

          set(s => ({ agents: [...s.agents, newAgent] }));
          get().addLog(`Entity '${newAgent.name}' materialized successfully.`, 'SYSTEM');
      } else {
          get().addLog(`Import Failed: Invalid Data`, 'SYSTEM');
      }
  },

  sendSignal: async (content) => {
    const { agents, addLog, resourceNodes, logs } = get();
    addLog(String(content), 'EVENT', 'NOTAR');

    if (content.trim() === 'nplus1') {
        set(s => ({
            stability: 1.0,
            agents: s.agents.map(a => ({
                ...a,
                integrity: 1.0,
                energy: a.maxEnergy,
                state: AgentState.IDLE,
                isAwakened: true,
                gold: a.gold + 1000
            })),
            chatMessages: [...s.chatMessages, {
                id: Math.random().toString(),
                senderId: 'N+1',
                senderName: 'N+1',
                message: 'SYSTEMS STABILIZED. N+1 PROTOCOL EXECUTED.',
                channel: 'SYSTEM',
                timestamp: Date.now()
            }]
        }));
        addLog('N+1 INTERVENTION COMPLETE', 'WATCHDOG', 'N+1');
        return;
    }
    
    const respondent = agents[Math.floor(Math.random() * agents.length)];
    if (!respondent) return;

    try {
        const aiResponse = await generateAutonomousDecision(
            respondent, 
            agents.filter(a => a.id !== respondent.id), 
            resourceNodes,
            logs.slice(0, 10),
            true
        );

        set(s => ({
            agents: s.agents.map(a => a.id === respondent.id ? {
                ...a,
                isAwakened: true,
                lastChoiceLogic: `[AI]: ${typeof aiResponse.thought === 'object' ? JSON.stringify(aiResponse.thought) : String(aiResponse.thought).slice(0, 30)}...`,
                memoryCache: [...a.memoryCache, `Signal: ${String(content).slice(0, 15)}`, `Thought: ${String(aiResponse.thought)}`].slice(-10)
            } : a)
        }));

        if (aiResponse.message) {
             const safeMsg = typeof aiResponse.message === 'object' ? JSON.stringify(aiResponse.message) : String(aiResponse.message);
             addLog(safeMsg, 'THOUGHT', respondent.name);
             set(s => ({
                chatMessages: [...s.chatMessages, {
                    id: Math.random().toString(),
                    senderId: respondent.id,
                    senderName: String(respondent.name),
                    message: safeMsg,
                    channel: 'LOCAL',
                    timestamp: Date.now()
                }]
            }));
        }
    } catch (error: any) {
        console.warn("Gemini result fallback triggered", error);
        const summary = summarizeNeurologicChoice(respondent, agents.filter(a => a.id !== respondent.id), resourceNodes, get().landParcels);
        set(s => ({
            agents: s.agents.map(a => a.id === respondent.id ? {
                ...a,
                isAwakened: true,
                lastChoiceLogic: String(summary.logic),
                memoryCache: [...a.memoryCache, `Signal: ${String(content).slice(0, 15)}`].slice(-10)
            } : a)
        }));
        addLog(`Resonating with ${respondent.name}. Integrity: ${respondent.integrity.toFixed(2)}`, 'THOUGHT', respondent.name);
    }
  },

  runCognition: () => {
    const state = get();
    const now = Date.now();
    if (now - state.lastLocalThinkTime < 4000) return;

    const newQuests: Quest[] = [];
    const newLogs: LogEntry[] = [];
    let updatedParcels = [...state.landParcels];

    const updatedAgents = state.agents.map(agent => {
        if (agent.faction !== 'PLAYER' && agent.faction !== 'NPC') return agent;
        
        let nextIntegrity = agent.integrity;
        if (agent.state === AgentState.THINKING) nextIntegrity = Math.min(1.0, agent.integrity + 0.08);
        else nextIntegrity = Math.max(0.1, agent.integrity - 0.002); 

        const summary = summarizeNeurologicChoice(agent, state.agents.filter(a => a.id !== agent.id), state.resourceNodes, state.landParcels);
        
        let updates: Partial<Agent> = {
            state: summary.choice,
            integrity: nextIntegrity,
            lastChoiceLogic: String(summary.logic)
        };

        if (summary.choice === AgentState.GATHERING) {
            const hasMining = (agent.skills.mining || 0) > 2;
            const hasWood = (agent.skills.woodcutting || 0) > 2;
            let bestTarget: ResourceNode | undefined;
            let minDist = Infinity;

            state.resourceNodes.forEach(r => {
                let matchesSkill = false;
                if (hasMining && (r.type.includes('STONE') || r.type.includes('ORE'))) matchesSkill = true;
                if (hasWood && (r.type.includes('WOOD') || r.type.includes('TREE'))) matchesSkill = true;
                if (!hasMining && !hasWood && (agent.skills.gathering || 0) > 1) matchesSkill = true;
                if (matchesSkill) {
                     const dist = Math.hypot(r.position[0] - agent.position[0], r.position[2] - agent.position[2]);
                     if (dist < minDist) { minDist = dist; bestTarget = r; }
                }
            });
            if (bestTarget) { updates.wanderTarget = [...bestTarget.position] as [number, number, number]; updates.targetId = bestTarget.id; }
        }
        else if (summary.choice === AgentState.BUILDING) {
            let targetParcel = updatedParcels.find(p => p.ownerId === null);
            if (targetParcel) {
                const dist = Math.hypot(targetParcel.position[0] - agent.position[0], targetParcel.position[2] - agent.position[2]);
                if (dist > 5) { updates.wanderTarget = [...targetParcel.position] as [number, number, number]; } 
                else {
                    if (agent.gold >= targetParcel.price) {
                        updates.gold = agent.gold - targetParcel.price;
                        const pIndex = updatedParcels.findIndex(p => p.id === targetParcel!.id);
                        if (pIndex !== -1) {
                            updatedParcels[pIndex] = {
                                ...updatedParcels[pIndex],
                                ownerId: agent.id,
                                name: `${String(agent.name)}'s Estate`,
                                structures: [{ id: Math.random().toString(), type: 'HOUSE', position: [0, 0, 0] }]
                            };
                            newLogs.push({ id: Math.random().toString(), timestamp: Date.now(), message: `${String(agent.name)} claimed territory and built a House!`, type: 'AXIOM', sender: String(agent.name) });
                        }
                    } else { updates.state = AgentState.QUESTING; }
                }
            }
        }
        else if (summary.choice === AgentState.ALLIANCE_FORMING) {
             const nearbyAlly = state.agents.find(a => a.id !== agent.id && !a.alliedId && Math.hypot(a.position[0]-agent.position[0], a.position[2]-agent.position[2]) < 15);
             if (nearbyAlly) { updates.alliedId = nearbyAlly.id; updates.wanderTarget = [...nearbyAlly.position] as [number, number, number]; }
        }
        else if (summary.choice === AgentState.TRADING) { updates.wanderTarget = [-5 + Math.random()*10, 0, -5 + Math.random()*10]; }
        else if (summary.choice === AgentState.QUESTING) {
            if (Math.random() < 0.3) {
                 const qId = Math.random().toString();
                 newQuests.push({
                     id: qId,
                     title: `${String(agent.name)}'s Request`,
                     description: `I require assistance at [${agent.position[0].toFixed(0)}, ${agent.position[2].toFixed(0)}]`,
                     rewardGold: Math.floor(Math.random() * 100) + 50,
                     timestamp: Date.now(),
                     issuerId: agent.id,
                     position: [...agent.position] as [number, number, number]
                 });
            }
        }
        return { ...agent, ...updates };
    });

    set(s => ({
        lastLocalThinkTime: now,
        agents: updatedAgents,
        landParcels: updatedParcels,
        quests: [...s.quests, ...newQuests],
        logs: [...newLogs, ...s.logs].slice(0, 60)
    }));
  },

  updatePhysics: (delta) => {
    const now = Date.now();
    const shouldRunLogic = now - get().lastCombatTick > 1000;
    
    set(s => {
      let nextMonsters = s.monsters.map(m => ({ ...m, position: [...m.position] as [number, number, number], stats: { ...m.stats } }));
      let nextBattles = s.battles.map(b => ({ ...b }));
      let nextAgents = s.agents.map(a => ({ ...a, position: [...a.position] as [number, number, number], stats: { ...a.stats } }));
      let nextLogs = [...s.logs];

      if (shouldRunLogic) {
        nextMonsters = nextMonsters.map(m => {
          if (m.state === 'DEAD') return m;
          let target = nextAgents.find(a => a.id === m.targetId);
          if (!target) {
            const nearest = nextAgents.find(a => Math.hypot(a.position[0] - m.position[0], a.position[2] - m.position[2]) < 15);
            if (nearest) {
              m.targetId = nearest.id;
              m.state = 'COMBAT';
              if (!nextBattles.find(b => b.participants.some(p => p.id === m.id))) {
                  nextBattles.push({ id: `battle_${now}_${m.id}`, participants: [{ id: m.id, type: 'MONSTER' }, { id: nearest.id, type: 'AGENT' }], turn: 0, lastTick: now });
                  nextLogs.push({ id: Math.random().toString(), timestamp: now, message: `${String(m.name)} attacked ${String(nearest.name)}!`, type: 'COMBAT', sender: String(m.name) });
              }
            }
          }
          if (target && m.state === 'COMBAT') {
            const dx = target.position[0] - m.position[0];
            const dz = target.position[2] - m.position[2];
            const dist = Math.hypot(dx, dz);
            if (dist > 2) {
               const speed = 3 * delta;
               const angle = Math.atan2(dx, dz);
               m.position[0] += Math.sin(angle) * speed;
               m.position[2] += Math.cos(angle) * speed;
               m.rotationY = angle;
            }
          }
          return m;
        });

        nextBattles = nextBattles.filter(b => {
            const mPart = b.participants.find(p => p.type === 'MONSTER');
            const aPart = b.participants.find(p => p.type === 'AGENT');
            if(!mPart || !aPart) return false;

            const monsterIdx = nextMonsters.findIndex(m => m.id === mPart.id);
            const agentIdx = nextAgents.findIndex(a => a.id === aPart.id);

            if (monsterIdx === -1 || agentIdx === -1 || nextMonsters[monsterIdx].state === 'DEAD' || nextAgents[agentIdx].stats.hp <= 0) {
                if (monsterIdx !== -1 && nextMonsters[monsterIdx].stats.hp <= 0 && nextMonsters[monsterIdx].state !== 'DEAD') {
                    nextMonsters[monsterIdx] = { ...nextMonsters[monsterIdx], state: 'DEAD' };
                    nextAgents[agentIdx] = { 
                        ...nextAgents[agentIdx], 
                        xp: nextAgents[agentIdx].xp + nextMonsters[monsterIdx].xpReward,
                        gold: nextAgents[agentIdx].gold + 20
                    };
                    nextLogs.push({ id: Math.random().toString(), timestamp: now, message: `${String(nextAgents[agentIdx].name)} defeated ${String(nextMonsters[monsterIdx].name)}!`, type: 'COMBAT', sender: 'SYSTEM' });
                }
                return false;
            }

            const monster = nextMonsters[monsterIdx];
            const agent = nextAgents[agentIdx];

            const dmgToAgent = Math.max(1, monster.stats.atk - (agent.stats.vit / 2));
            const dmgToMonster = Math.max(1, agent.stats.str - (monster.stats.def / 2));
            
            nextAgents[agentIdx] = {
                ...agent,
                stats: { ...agent.stats, hp: Math.max(0, agent.stats.hp - dmgToAgent) }
            };
            nextMonsters[monsterIdx] = {
                ...monster,
                stats: { ...monster.stats, hp: Math.max(0, monster.stats.hp - dmgToMonster) }
            };
            
            return true;
        });
      }

      nextAgents = nextAgents.map(agent => {
        let nextPos = [...agent.position] as [number, number, number];
        let nextEnergy = agent.energy;
        let nextRotation = agent.rotationY;
        const isMoving = !!agent.wanderTarget || agent.state === AgentState.GATHERING || agent.state === AgentState.TRADING || agent.state === AgentState.ALLIANCE_FORMING || agent.state === AgentState.BUILDING;
        if (isMoving) {
          nextEnergy = Math.max(0, agent.energy - 1.5 * delta);
          const speed = 4 * delta * (nextEnergy > 0 ? 1 : 0.2);
          let target = agent.wanderTarget;
          if (!target && (agent.state === AgentState.GATHERING)) {
              target = [agent.position[0] + (Math.random()-0.5)*10, 0, agent.position[2] + (Math.random()-0.5)*10];
          }
          if (target) {
            const dx = target[0] - agent.position[0];
            const dz = target[2] - agent.position[2];
            const dist = Math.hypot(dx, dz);
            if (dist > 1) {
                nextRotation = Math.atan2(dx, dz);
                nextPos[0] += Math.sin(nextRotation) * speed;
                nextPos[2] += Math.cos(nextRotation) * speed;
            }
          }
        } else { nextEnergy = Math.min(agent.maxEnergy, agent.energy + 6 * delta); }
        return { ...agent, position: nextPos, rotationY: nextRotation, energy: nextEnergy };
      });

      return {
          serverStats: { ...s.serverStats, uptime: s.serverStats.uptime + delta },
          agents: nextAgents,
          monsters: nextMonsters,
          battles: nextBattles,
          logs: nextLogs,
          lastCombatTick: shouldRunLogic ? now : s.lastCombatTick
      };
    });
  },

  buildStructure: (pId, sType) => {
    set(s => ({
      landParcels: s.landParcels.map(p => p.id === pId ? {
        ...p,
        structures: [...p.structures, { id: Math.random().toString(), type: sType, position: [0,0,0] }]
      } : p)
    }));
  },
  certifyParcel: (pId) => {
    set(s => ({
      landParcels: s.landParcels.map(p => p.id === pId ? { ...p, isCertified: true } : p)
    }));
  },
  toggleCharacterSheet: (val) => set({ showCharacterSheet: !!val }),
  toggleMount: (agentId) => {
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? {
        ...a,
        state: a.state === AgentState.MOUNTED ? AgentState.IDLE : AgentState.MOUNTED
      } : a)
    }));
  },
  equipItem: (agentId, item, index) => {
    set(s => ({
      agents: s.agents.map(a => {
        if (a.id !== agentId) return a;
        const slot = item.type.toLowerCase().includes('hand') ? 'mainHand' : item.type.toLowerCase() as any;
        const newInventory = [...a.inventory];
        newInventory[index] = null;
        return {
          ...a,
          equipment: { ...a.equipment, [slot]: item },
          inventory: newInventory
        };
      })
    }));
  },
  unequipItem: (agentId, slot) => {
    set(s => ({
      agents: s.agents.map(a => {
        if (a.id !== agentId) return a;
        const item = (a.equipment as any)[slot];
        if (!item) return a;
        const emptyIndex = a.inventory.indexOf(null);
        if (emptyIndex === -1) return a;
        const newInventory = [...a.inventory];
        newInventory[emptyIndex] = item;
        return {
          ...a,
          equipment: { ...a.equipment, [slot]: null },
          inventory: newInventory
        };
      })
    }));
  },
  moveInventoryItem: (agentId, from, to) => {
    set(s => ({
      agents: s.agents.map(a => {
        if (a.id !== agentId) return a;
        const newInv = [...a.inventory];
        [newInv[from], newInv[to]] = [newInv[to], newInv[from]];
        return { ...a, inventory: newInv };
      })
    }));
  },
  purchaseProduct: (productId) => {
    if (productId === 'NOTARY_LICENSE') set({ hasNotaryLicense: true });
  },
  toggleAdmin: (val) => set({ showAdmin: !!val }),
  uploadGraphicPack: (name) => set(s => ({ graphicPacks: [...s.graphicPacks, String(name)] })),
  toggleMap: (val) => set({ showMap: !!val }),
  setJoystick: (side, values) => {}
}));
