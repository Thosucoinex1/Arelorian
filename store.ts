
import { create } from 'zustand';
import { Agent, AgentState, ResourceNode, AuctionListing, LogEntry, ChatMessage, ChatChannel, MemoryEntry, Item, ItemType, ResourceType, LandParcel, Quest, ProductType, Structure, StructureType } from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { isAgentInSafeZone, getBiomeForChunk, generateResourcesForChunk, generateCreaturesForChunk } from './utils';

export interface Chunk { id: string; x: number; z: number; biome: string; }
export interface Vegetation { id: string; type: 'TREE' | 'ROCK'; position: [number, number, number]; scale: number; rotation: number; }
export type User = { id: string; email: string };

// --- Emergent Item Evolution ---
const evolveItem = (item: Item, ownerName: string): Item => {
    const evolvedItem = { ...item };
    evolvedItem.experience = 0; // Reset experience
    evolvedItem.rarity = item.rarity === 'COMMON' ? 'UNCOMMON' : item.rarity === 'UNCOMMON' ? 'RARE' : 'EPIC';
    evolvedItem.name = `${ownerName}'s ${item.name}`;
    evolvedItem.stats.dmg = (evolvedItem.stats.dmg || 5) + 5;
    evolvedItem.stats.str = (evolvedItem.stats.str || 0) + 2;
    return evolvedItem;
}

const generateAnomaly = (): Agent => ({
  id: `anomaly-${Math.random().toString(16).slice(2)}`,
  name: "System Anomaly",
  classType: "Glitch",
  faction: 'ANOMALY',
  position: [(Math.random() - 0.5) * 70, 0, (Math.random() - 0.5) * 70],
  rotationY: Math.random() * Math.PI * 2,
  level: 5 + Math.floor(Math.random() * 5),
  state: AgentState.COMBAT,
  soulDensity: 0,
  gold: 50,
  isAwakened: true,
  memoryCache: [],
  thinkingMatrix: { personality: "Erratic, hostile", currentLongTermGoal: "Destabilize Axiom", alignment: -1, languagePreference: 'MIXED' },
  skills: { mining: 0, woodcutting: 0, herbalism: 0, crafting: 0, negotiation: 0 },
  inventory: Array(16).fill(null),
  equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
  stats: { str: 20, agi: 15, int: 5, vit: 20, hp: 200, maxHp: 200 }
});

interface GameState {
  user: User | null;
  agents: Agent[];
  // ... (rest of state properties)
  lastAnomalySpawn: number;
  
  // Actions
  // ...
  buildStructure: (parcelId: string, structureType: StructureType) => void;
  certifyParcel: (parcelId: string) => void;
  // ... (rest of actions)
  
  // The original state properties
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
  lastThoughtTime: number;
  hasNotaryLicense: boolean;
  agentSlots: number;
  
  // Mobile Controls
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  setJoystick: (stick: 'left' | 'right', value: { x: number; y: number }) => void;
  
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

  // Inventory Actions
  equipItem: (agentId: string, item: Item, itemIndex: number) => void;
  unequipItem: (agentId: string, slot: keyof Agent['equipment']) => void;
  moveInventoryItem: (agentId: string, fromIndex: number, toIndex: number) => void;
}

const generateInitialAgent = (id: string, name: string, isGerman: boolean): Agent => ({
  id, name,
  classType: Math.random() > 0.5 ? 'Paladin' : 'Technomancer',
  faction: 'PLAYER',
  position: [(Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40],
  rotationY: Math.random() * Math.PI * 2,
  level: 1, state: AgentState.IDLE, soulDensity: 0.5, gold: 100, isAwakened: false,
  memoryCache: [],
  thinkingMatrix: { 
    personality: isGerman ? "Ruhig, fokussiert auf Handwerk" : "Aggressive, seeking glory", 
    currentLongTermGoal: "Survive and prosper", 
    alignment: 0, 
    languagePreference: isGerman ? 'DE' : 'EN',
    desires: ['Acquire a better weapon', 'Earn gold']
  },
  skills: { mining: 1, woodcutting: 1, herbalism: 1, crafting: 1, negotiation: 1 },
  inventory: Array(16).fill(null),
  equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
  stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 },
  targetId: null,
  allianceId: null,
});

export const useStore = create<GameState>((set, get) => ({
  user: null, agents: [], resourceNodes: [], auctionHouse: [], logs: [], chatMessages: [],
  selectedAgentId: null, device: { isMobile: /Mobi/i.test(navigator.userAgent), width: window.innerWidth, height: window.innerHeight },
  loadedChunks: [], vegetation: [], showCharacterSheet: false,
  notaryBalance: 5000,
  landParcels: [
    { id: 'p1', name: 'The Iron Fields', coordinates: [10, 10], value: 1200, ownerId: null, structures: [] },
    { id: 'p2', name: 'Sanctuary East', coordinates: [20, 0], value: 2500, ownerId: null, structures: [] },
    { id: 'p3', name: 'Whispering Woods', coordinates: [-15, 5], value: 800, ownerId: null, structures: [] }
  ],
  showAdmin: false, showMap: false, serverStats: { uptime: 3600, tickRate: 20, memoryUsage: 128 },
  graphicPacks: ['Base Textures v1', 'Axiom Shaders Pack'],
  quests: [{ id: 'q1', timestamp: Date.now() - 20000, title: 'Soul Harvest', description: 'Gather 5 Soul Shards from the void.', rewardGold: 500 }],
  lastThoughtTime: 0, hasNotaryLicense: false, agentSlots: 4, lastAnomalySpawn: Date.now(),
  leftStick: { x: 0, y: 0 },
  rightStick: { x: 0, y: 0 },

  setJoystick: (stick, value) => set({ [stick === 'left' ? 'leftStick' : 'rightStick']: value }),
  login: (email) => set({ user: { id: `notary-id-${Math.random().toString(36).slice(2, 9)}`, email } }),
  logout: () => set({ user: null }),
  initGame: () => {
    if (get().agents.length > 0) return;
    
    // Procedural World Generation
    const newChunks: Chunk[] = [];
    const newResources: ResourceNode[] = [];
    const newCreatures: Agent[] = [];
    const worldSize = 1; // Creates a 3x3 grid (-1 to +1)

    for (let x = -worldSize; x <= worldSize; x++) {
        for (let z = -worldSize; z <= worldSize; z++) {
            const biome = getBiomeForChunk(x, z);
            const chunk: Chunk = { id: `${x},${z}`, x, z, biome };
            newChunks.push(chunk);
            newResources.push(...generateResourcesForChunk(chunk));
            newCreatures.push(...generateCreaturesForChunk(chunk));
        }
    }

    const playerAgents = [ generateInitialAgent('agent-1', 'Gunter', true), generateInitialAgent('agent-2', 'Alistair', false), generateInitialAgent('agent-3', 'Hilda', true), generateInitialAgent('agent-4', 'Shadow', false) ];
    playerAgents[0].inventory[0] = { id: 'item-1', name: 'Rusty Axe', type: 'WEAPON', subtype: 'Axe', rarity: 'COMMON', stats: { dmg: 5, str: 1 }, description: 'A basic woodsman axe.', color: 'gray-500', iconColor: 'gray-400', experience: 0 };
    playerAgents[0].inventory[1] = { id: 'item-2', name: 'Leather Cap', type: 'HELM', subtype: 'Leather', rarity: 'COMMON', stats: { vit: 2 }, description: 'Simple leather headwear.', color: 'yellow-800', iconColor: 'yellow-600' };
    
    set({ 
        agents: [...playerAgents, ...newCreatures], 
        resourceNodes: newResources,
        loadedChunks: newChunks,
    });
  },

  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, { ...msg, id: Math.random().toString(), timestamp: Date.now() }].slice(-100) })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  addLog: (message, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50) })),
  postAuction: (listing) => set(state => ({ auctionHouse: [...state.auctionHouse, { ...listing, id: Math.random().toString(), expiresAt: Date.now() + 3600000 }] })),
  purchaseLand: (id) => set(state => { /* ... existing logic ... */ return state; }),
  updateAgentLore: (id, lore) => set(state => ({ agents: state.agents.map(a => a.id === id ? { ...a, loreSnippet: lore } : a) })),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  uploadGraphicPack: (name) => set(state => ({ graphicPacks: [...state.graphicPacks, name], logs: [{ id: Math.random().toString(), timestamp: Date.now(), message: `Graphic pack '${name}' installed successfully.`, type: 'SYSTEM' }, ...state.logs] })),

  purchaseProduct: (productType) => { /* ... existing logic ... */ },
  
  buildStructure: (parcelId, structureType) => set(state => {
    const { user, addLog } = get();
    const parcel = state.landParcels.find(p => p.id === parcelId);
    if (!parcel || parcel.ownerId !== user?.id) {
        addLog("Error: Cannot build on unowned or non-existent land.", "SYSTEM");
        return state;
    }
    const newStructure: Structure = {
        id: `struct-${Math.random().toString(16).slice(2)}`,
        type: structureType,
        name: structureType === 'BANK' ? "Axiom Bank" : "Habitation Unit",
        builtAt: Date.now()
    };
    addLog(`Notary has erected a ${newStructure.name} on ${parcel.name}.`, 'AXIOM');
    return {
        landParcels: state.landParcels.map(p => p.id === parcelId ? { ...p, structures: [...(p.structures || []), newStructure] } : p)
    };
  }),
  
  certifyParcel: (parcelId) => set(state => {
    const { user, addLog } = get();
    const parcel = state.landParcels.find(p => p.id === parcelId);
    if (!parcel || parcel.ownerId !== user?.id || parcel.isCertified) return state;
    addLog(`Notary Seal Applied: ${parcel.name} is now a certified settlement.`, 'AXIOM');
    return {
        landParcels: state.landParcels.map(p => p.id === parcelId ? { ...p, isCertified: true } : p)
    };
  }),

  // --- INVENTORY ACTIONS ---
  equipItem: (agentId, item, itemIndex) => set(state => {
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return state;

    let targetSlot: keyof Agent['equipment'] | null = null;
    if (item.type === 'WEAPON') targetSlot = 'mainHand';
    else if (item.type === 'OFFHAND') targetSlot = 'offHand';
    else if (item.type === 'HELM') targetSlot = 'head';
    else if (item.type === 'CHEST') targetSlot = 'chest';
    else if (item.type === 'LEGS') targetSlot = 'legs';
    
    if (!targetSlot || agent.equipment[targetSlot] !== null) {
      return state; // Slot is invalid or already occupied
    }

    const newAgent = { ...agent };
    const newInventory = [...newAgent.inventory];
    
    newAgent.equipment = { ...newAgent.equipment, [targetSlot]: item };
    newInventory[itemIndex] = null;
    newAgent.inventory = newInventory;

    return { agents: state.agents.map(a => a.id === agentId ? newAgent : a) };
  }),

  unequipItem: (agentId, slot) => set(state => {
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent || !agent.equipment[slot]) return state;

    const emptyInvIndex = agent.inventory.findIndex(i => i === null);
    if (emptyInvIndex === -1) return state; // No space in inventory

    const newAgent = { ...agent };
    const newInventory = [...newAgent.inventory];
    const itemToUnequip = newAgent.equipment[slot];

    newInventory[emptyInvIndex] = itemToUnequip;
    newAgent.inventory = newInventory;
    newAgent.equipment = { ...newAgent.equipment, [slot]: null };

    return { agents: state.agents.map(a => a.id === agentId ? newAgent : a) };
  }),

  moveInventoryItem: (agentId, fromIndex, toIndex) => set(state => {
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return state;

    const newInventory = [...agent.inventory];
    const itemFrom = newInventory[fromIndex];
    const itemTo = newInventory[toIndex];
    
    // Swap items
    newInventory[toIndex] = itemFrom;
    newInventory[fromIndex] = itemTo;
    
    const newAgent = { ...agent, inventory: newInventory };

    return { agents: state.agents.map(a => a.id === agentId ? newAgent : a) };
  }),


  updateAgents: async (delta) => {
    const { agents, lastThoughtTime, addChatMessage, user, landParcels, addLog, lastAnomalySpawn, logs, resourceNodes } = get();
    const now = Date.now();
    
    if (now - lastAnomalySpawn > 120000) { // Spawn anomalies less frequently
        const anomaly = generateAnomaly();
        set(state => ({ agents: [...state.agents, anomaly], lastAnomalySpawn: now }));
        addLog(`A System Anomaly has manifested at [${anomaly.position[0].toFixed(0)}, ${anomaly.position[2].toFixed(0)}]!`, 'SYSTEM');
    }

    let activeUpdateResult: { agentId: string; response: any } | null = null;
    if (now - lastThoughtTime > 5000 && agents.some(a => a.faction === 'PLAYER')) {
      const playerAgents = agents.filter(a => a.faction === 'PLAYER');
      const thinkingAgent = playerAgents[Math.floor(Math.random() * playerAgents.length)];
      
      if (thinkingAgent) {
        set({ lastThoughtTime: now });
        try {
          const inSafeZone = isAgentInSafeZone(thinkingAgent, landParcels, user?.id || null);
          const nearbyAgents = agents.filter(a => {
            if (a.id === thinkingAgent.id) return false;
            const dist = Math.hypot(a.position[0] - thinkingAgent.position[0], a.position[2] - thinkingAgent.position[2]);
            return dist < 20; // Perception radius
          });
          const nearbyPlayerAgents = nearbyAgents.filter(a => a.faction === 'PLAYER');
          const nearbyCreatures = nearbyAgents.filter(a => a.faction === 'CREATURE' || a.faction === 'ANOMALY');

          const nearbyResourceNodes = resourceNodes.filter(r => {
            const dist = Math.hypot(r.position[0] - thinkingAgent.position[0], r.position[2] - thinkingAgent.position[2]);
            return dist < 20;
          });
          const recentLogs = logs.slice(0, 10);

          const response = await generateAutonomousDecision(thinkingAgent, nearbyPlayerAgents, nearbyCreatures, nearbyResourceNodes, recentLogs, inSafeZone);

          if(response.decision) {
            activeUpdateResult = { agentId: thinkingAgent.id, response };
            addLog(`${thinkingAgent.name} Thinks: ${response.thought}`, 'THOUGHT');
            if (response.message) { addChatMessage({ senderId: thinkingAgent.id, senderName: thinkingAgent.name, message: response.message, channel: 'LOCAL' }); }
             if (response.newQuest) {
                const { title, description, rewardGold } = response.newQuest;
                const newQuest: Quest = { id: `quest-${Math.random().toString(16).slice(2)}`, timestamp: now, title, description, rewardGold, questGiverId: thinkingAgent.id };
                set(state => ({ quests: [...state.quests, newQuest] }));
                addLog(`${thinkingAgent.name} has issued a new quest: "${title}"`, 'SYSTEM');
            }
            if (response.tradeOffer) {
                const { targetAgentName, offerItemName, requestItemName } = response.tradeOffer;
                addLog(`[TRADE] ${thinkingAgent.name} offers ${targetAgentName} a ${offerItemName} for a ${requestItemName}.`, 'TRADE');
            }
            if (response.allianceRequest) {
                const { targetAgentName, objective } = response.allianceRequest;
                addLog(`[ALLIANCE] ${thinkingAgent.name} asks ${targetAgentName} to form an alliance to ${objective}.`, 'AXIOM');
            }
          }
        } catch (e) { 
            console.error("Neural Failure:", e); 
            set({ lastThoughtTime: now }); 
        }
      }
    }

    const evolutionLogs: { message: string, type: LogEntry['type'] }[] = [];

    set(state => ({
      agents: state.agents.map(a => {
        let agent = { ...a };
        
        // Player Agent AI (Gemini Driven)
        if (agent.faction === 'PLAYER') {
            if (activeUpdateResult && agent.id === activeUpdateResult.agentId) {
              agent.state = activeUpdateResult.response.newState || agent.state;
              agent.targetId = activeUpdateResult.response.targetId || null;
              agent.memoryCache = [...agent.memoryCache, { id: Math.random().toString(), timestamp: Date.now(), description: activeUpdateResult.response.decision, importance: 0.9 }].slice(-20);
              agent.isAwakened = true;
            }

            if (agent.state === AgentState.COMBAT && agent.equipment.mainHand) {
                const oldMainHand = agent.equipment.mainHand;
                const experience = (oldMainHand.experience || 0) + 1;
                let newMainHand: Item;

                if (experience > 100) {
                    newMainHand = evolveItem(oldMainHand, agent.name);
                    evolutionLogs.push({ message: `${agent.name}'s ${oldMainHand.name} has evolved into ${newMainHand.name}!`, type: 'AXIOM' });
                } else {
                    newMainHand = { ...oldMainHand, experience };
                }

                agent = { ...agent, equipment: { ...agent.equipment, mainHand: newMainHand } };
            }
        }

        // Creature AI (Simple Logic)
        if (agent.faction === 'CREATURE') {
            if (agent.state !== AgentState.COMBAT) {
                const nearbyPlayers = state.agents.filter(p => p.faction === 'PLAYER' && Math.hypot(p.position[0] - agent.position[0], p.position[2] - agent.position[2]) < 10);
                if (nearbyPlayers.length > 0) {
                    agent.state = AgentState.COMBAT;
                    agent.targetId = nearbyPlayers[0].id;
                }
            } else if (!state.agents.find(p => p.id === agent.targetId)) {
                // Target is gone
                agent.state = AgentState.IDLE;
                agent.targetId = null;
            }
        }

        const newPos = [...agent.position] as [number, number, number];
        let newRot = agent.rotationY;

        const allEntities = [...state.agents, ...state.resourceNodes];
        const targetEntity = allEntities.find(e => e.id === agent.targetId);

        if (targetEntity) {
            const targetPos = targetEntity.position;
            const dx = targetPos[0] - agent.position[0];
            const dz = targetPos[2] - agent.position[2];
            const distance = Math.hypot(dx, dz);
            
            newRot = Math.atan2(dz, dx); // Face the target
            
            if (distance > 2) { // Move if not close enough
                const speed = 1.0 * delta;
                newPos[0] += Math.cos(newRot) * speed;
                newPos[2] += Math.sin(newRot) * speed;
            }
        } else {
             if (agent.state !== AgentState.IDLE && agent.state !== AgentState.THINKING) {
                const speed = (agent.faction === 'ANOMALY' ? 2.5 : 1.0) * delta;
                newPos[0] += Math.cos(agent.rotationY) * speed * (Math.random() - 0.5) * 0.2;
                newPos[2] += Math.sin(agent.rotationY) * speed * (Math.random() - 0.5) * 0.2;
            }
        }
        
        const worldBounds = 120;
        agent.position[0] = Math.max(-worldBounds, Math.min(worldBounds, newPos[0]));
        agent.position[2] = Math.max(-worldBounds, Math.min(worldBounds, newPos[2]));
        agent.rotationY = newRot;
        return agent;
      })
    }));

    // After the main state update, execute the queued side-effects
    evolutionLogs.forEach(log => addLog(log.message, log.type));
  }
}));