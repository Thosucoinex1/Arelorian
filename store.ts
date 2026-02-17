
import { create } from 'zustand';
import { Agent, AgentState, ResourceNode, AuctionListing, LogEntry, ChatMessage, ChatChannel, MemoryEntry, Item, ItemType, ResourceType, LandParcel, Quest, ProductType, Structure, StructureType, WorldEvent } from './types';
import { generateAutonomousDecision } from './services/geminiService';
import { isAgentInSafeZone, getBiomeForChunk, generateResourcesForChunk, generateCreaturesForChunk } from './utils';

export interface Chunk { id: string; x: number; z: number; biome: string; }
export interface Vegetation { id: string; type: 'TREE' | 'ROCK'; position: [number, number, number]; scale: number; rotation: number; }
export type User = { id: string; email: string };

const generateViking = (pos: [number, number, number]): Agent => ({
  id: `viking-${Math.random().toString(16).slice(2)}`,
  name: "Dark Viking Marauder",
  classType: "Berserker",
  faction: 'VIKING',
  position: pos,
  rotationY: 0,
  level: 12 + Math.floor(Math.random() * 5),
  state: AgentState.COMBAT,
  soulDensity: 0.8,
  gold: 50,
  memoryCache: [],
  thinkingMatrix: { personality: "Ruthless conqueror", currentLongTermGoal: "Raid Sanctuary", alignment: -1, languagePreference: 'EN' },
  skills: { mining: 0, woodcutting: 0, herbalism: 0, crafting: 0, negotiation: 0 },
  inventory: Array(16).fill(null),
  equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
  stats: { str: 30, agi: 15, int: 5, vit: 40, hp: 500, maxHp: 500 }
});

const generateNPC = (id: string, name: string, classType: string, pos: [number, number, number]): Agent => ({
  id, name, classType,
  faction: 'NPC',
  position: pos,
  rotationY: 0,
  level: 99,
  state: AgentState.IDLE,
  soulDensity: 1.0,
  gold: 99999,
  memoryCache: [],
  thinkingMatrix: { personality: "Helpful trade master", currentLongTermGoal: "Manage world economy", alignment: 1, languagePreference: 'EN' },
  skills: { mining: 0, woodcutting: 0, herbalism: 0, crafting: 10, negotiation: 10 },
  inventory: Array(16).fill(null),
  equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null },
  stats: { str: 50, agi: 50, int: 50, vit: 50, hp: 9999, maxHp: 9999 }
});

interface GameState {
  user: User | null;
  agents: Agent[];
  lastAnomalySpawn: number;
  lastRaidTime: number;
  resourceNodes: ResourceNode[];
  auctionHouse: AuctionListing[];
  logs: LogEntry[];
  chatMessages: ChatMessage[];
  selectedAgentId: string | null;
  device: { isMobile: boolean; width: number; height: number };
  loadedChunks: Chunk[];
  activeEvents: WorldEvent[];
  vegetation: Vegetation[];
  showCharacterSheet: boolean;
  notaryBalance: number;
  landParcels: LandParcel[];
  showAdmin: boolean;
  showMap: boolean;
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  graphicPacks: string[];
  quests: Quest[];
  lastThoughtTime: number;
  hasNotaryLicense: boolean;
  agentSlots: number;
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
  updateAgentLore: (id: string, lore: string) => void;
  toggleAdmin: (show: boolean) => void;
  toggleMap: (show: boolean) => void;
  uploadGraphicPack: (name: string) => void;
  purchaseProduct: (productType: ProductType) => void;
  equipItem: (agentId: string, item: Item, itemIndex: number) => void;
  unequipItem: (agentId: string, slot: keyof Agent['equipment']) => void;
  moveInventoryItem: (agentId: string, fromIndex: number, toIndex: number) => void;
  buildStructure: (parcelId: string, structureType: StructureType) => void;
  certifyParcel: (parcelId: string) => void;
}

export const useStore = create<GameState>((set, get) => ({
  user: null, agents: [], resourceNodes: [], auctionHouse: [], logs: [], chatMessages: [], activeEvents: [],
  selectedAgentId: null, device: { isMobile: /Mobi/i.test(navigator.userAgent), width: window.innerWidth, height: window.innerHeight },
  loadedChunks: [], vegetation: [], showCharacterSheet: false,
  notaryBalance: 5000,
  landParcels: [
    { id: 'p1', name: 'Sanctuary Central', coordinates: [0, 0], value: 0, ownerId: 'SYSTEM', structures: [
        { id: 's1', type: 'SMITH', name: 'Sanctuary Forge', builtAt: 0 },
        { id: 's2', type: 'MARKET', name: 'Sanctuary Exchange', builtAt: 0 }
    ], isCertified: true },
    { id: 'p2', name: 'The Iron Fields', coordinates: [10, 10], value: 1200, ownerId: null, structures: [] },
  ],
  showAdmin: false, showMap: false, serverStats: { uptime: 3600, tickRate: 20, memoryUsage: 128, threatLevel: 0 },
  graphicPacks: ['Base v1', 'Axiom Shaders', 'Viking Texture Pack'],
  quests: [],
  lastThoughtTime: 0, hasNotaryLicense: false, agentSlots: 10, lastAnomalySpawn: Date.now(), lastRaidTime: Date.now(),
  leftStick: { x: 0, y: 0 }, rightStick: { x: 0, y: 0 },

  setJoystick: (stick, value) => set({ [stick === 'left' ? 'leftStick' : 'rightStick']: value }),
  login: (email) => set({ user: { id: `notary-id-${Math.random().toString(36).slice(2, 9)}`, email } }),
  logout: () => set({ user: null }),
  initGame: () => {
    if (get().agents.length > 0) return;
    const newChunks: Chunk[] = [];
    const newResources: ResourceNode[] = [];
    const newCreatures: Agent[] = [];
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const biome = getBiomeForChunk(x, z);
        const chunk: Chunk = { id: `${x},${z}`, x, z, biome };
        newChunks.push(chunk);
        newResources.push(...generateResourcesForChunk(chunk));
        newCreatures.push(...generateCreaturesForChunk(chunk));
      }
    }
    const npcs = [
      generateNPC('npc-smith', 'Master Smith Kaelen', 'Smith', [5, 0, 5]),
      generateNPC('npc-market', 'Merchant Valerius', 'Merchant', [-5, 0, 5])
    ];
    set({ agents: [...npcs, ...newCreatures], resourceNodes: newResources, loadedChunks: newChunks });
  },

  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, { ...msg, id: Math.random().toString(), timestamp: Date.now() }].slice(-100) })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  addLog: (message, type) => set(state => ({ logs: [{ id: Math.random().toString(), timestamp: Date.now(), message, type }, ...state.logs].slice(0, 50) })),
  postAuction: (listing) => set(state => ({ auctionHouse: [...state.auctionHouse, { ...listing, id: Math.random().toString(), expiresAt: Date.now() + 3600000 }] })),
  updateAgentLore: (id, lore) => set(state => ({ agents: state.agents.map(a => a.id === id ? { ...a, loreSnippet: lore } : a) })),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  uploadGraphicPack: (name) => set(state => ({ graphicPacks: [...state.graphicPacks, name] })),
  purchaseProduct: (type) => {},
  equipItem: (agentId, item, index) => {},
  unequipItem: (agentId, slot) => {},
  moveInventoryItem: (aId, from, to) => {},
  buildStructure: (pId, type) => {},
  certifyParcel: (pId) => {},

  updateAgents: async (delta) => {
    const state = get();
    const now = Date.now();
    
    // Raid Cycle (Every 5 Minutes)
    if (now - state.lastRaidTime > 300000) {
        const vikings: Agent[] = [];
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            vikings.push(generateViking([Math.cos(angle) * 100, 0, Math.sin(angle) * 100]));
        }
        set({ 
            agents: [...state.agents, ...vikings], 
            lastRaidTime: now,
            activeEvents: [{ id: 'raid-1', type: 'RAID', title: 'The Midnight Raid', description: 'Dark Vikings are approaching Sanctuary!', startTime: now, endTime: now + 120000, active: true }]
        });
        state.addLog("[WORLD EVENT] The Midnight Raid has begun! Defensive protocols active.", 'EVENT');
        state.addChatMessage({ senderId: 'SYSTEM', senderName: 'Sanctuary Bell', message: "The Dark Vikings are coming! Man the walls!", channel: 'EVENT' });
    }

    // Agent Intelligence Cycle - Increased stability and error handling
    if (now - state.lastThoughtTime > 5000) {
        set({ lastThoughtTime: now });
        const players = state.agents.filter(a => a.faction === 'PLAYER');
        if (players.length > 0) {
            const agent = players[Math.floor(Math.random() * players.length)];
            const nearbyRes = state.resourceNodes.filter(r => Math.hypot(r.position[0]-agent.position[0], r.position[2]-agent.position[2]) < 40);
            
            try {
              const decision = await generateAutonomousDecision(agent, players.filter(p => p.id !== agent.id), state.agents.filter(a => a.faction !== 'PLAYER'), nearbyRes, state.logs.slice(0,5), false);
              
              set(s => ({
                  agents: s.agents.map(a => a.id === agent.id ? { ...a, state: decision.newState, targetId: decision.targetId, isAwakened: true } : a)
              }));
              state.addLog(`${agent.name}: ${decision.thought}`, 'THOUGHT');
            } catch (err) {
              // Penalty delay: if AI fails, wait longer before next attempt
              set({ lastThoughtTime: now + 10000 });
              console.error("AI cycle failed, adding penalty delay.");
            }
        }
    }

    // Movement & Collision Logic
    set(s => ({
        agents: s.agents.map(agent => {
            let nextPos = [...agent.position] as [number, number, number];
            let nextRot = agent.rotationY;

            // VIKING Logic: Move toward City Center (0,0)
            if (agent.faction === 'VIKING') {
                const distToCenter = Math.hypot(agent.position[0], agent.position[2]);
                if (distToCenter > 10) {
                    nextRot = Math.atan2(-agent.position[2], -agent.position[0]);
                    nextPos[0] += Math.cos(nextRot) * 2.0 * delta;
                    nextPos[2] += Math.sin(nextRot) * 2.0 * delta;
                } else {
                    agent.state = AgentState.COMBAT;
                }
            } else if (agent.faction === 'PLAYER') {
                // Proactive Resource Hunting
                if (agent.state === AgentState.GATHERING && !agent.targetId) {
                    const nearest = s.resourceNodes.find(r => Math.hypot(r.position[0]-agent.position[0], r.position[2]-agent.position[2]) < 30);
                    if (nearest) agent.targetId = nearest.id;
                }

                if (agent.targetId) {
                    const target = [...s.agents, ...s.resourceNodes].find(e => e.id === agent.targetId);
                    if (target) {
                        const dx = target.position[0] - agent.position[0];
                        const dz = target.position[2] - agent.position[2];
                        nextRot = Math.atan2(dz, dx);
                        if (Math.hypot(dx, dz) > 1.5) {
                            nextPos[0] += Math.cos(nextRot) * 1.5 * delta;
                            nextPos[2] += Math.sin(nextRot) * 1.5 * delta;
                        }
                    }
                }
            }

            return { ...agent, position: nextPos, rotationY: nextRot };
        })
    }));
  }
}));
