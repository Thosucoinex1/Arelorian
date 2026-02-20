"""
Ouroboros: Neural Emergence - MMORPG Simulation Backend
Autonomous Agent World with Gemini 3 Flash Integration
"""

import os
import json
import asyncio
import random
import math
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

# MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ouroboros_db")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Global state
db = None
websocket_connections: List[WebSocket] = []

# ============== MODELS ==============

class Position(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class ThinkingMatrix(BaseModel):
    personality: str = "Neutral"
    current_long_term_goal: str = "Survive"
    alignment: float = 0.5
    language_preference: str = "EN"
    sociability: float = 0.5
    aggression: float = 0.2

class EconomicDesires(BaseModel):
    target_gold: int = 1000
    preferred_resources: List[str] = ["GOLD_ORE", "SILVER_ORE"]
    greed_level: float = 0.3
    risk_appetite: float = 0.2
    frugality: float = 0.8
    market_role: str = "HOARDER"
    trade_frequency: float = 0.1

class AgentStats(BaseModel):
    str_: int = Field(10, alias="str")
    agi: int = 10
    int_: int = Field(10, alias="int")
    vit: int = 10
    hp: int = 100
    max_hp: int = 100

class Agent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    class_type: str = "Wanderer"
    faction: str = "PLAYER"
    position: Position = Field(default_factory=Position)
    rotation_y: float = 0.0
    level: int = 1
    xp: int = 0
    gold: int = 100
    state: str = "IDLE"
    energy: int = 100
    max_energy: int = 100
    integrity: float = 1.0
    consciousness_level: float = 0.1
    awakening_progress: float = 0.0
    vision_range: float = 20.0
    is_awakened: bool = False
    memory_cache: List[str] = []
    lore_snippet: Optional[str] = None
    thinking_matrix: ThinkingMatrix = Field(default_factory=ThinkingMatrix)
    economic_desires: EconomicDesires = Field(default_factory=EconomicDesires)
    stats: AgentStats = Field(default_factory=AgentStats)
    last_decision: Optional[Dict[str, str]] = None
    emergent_behavior_log: List[Dict[str, Any]] = []
    imported_from: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Monster(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    name: str
    position: Position = Field(default_factory=Position)
    hp: int
    max_hp: int
    atk: int
    defense: int
    xp_reward: int
    state: str = "IDLE"
    color: str = "#22c55e"
    scale: float = 1.0

class POI(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    position: Position
    is_discovered: bool = False
    discovery_radius: float = 10.0
    reward_insight: int = 10
    threat_level: float = 0.1
    lore_fragment: Optional[str] = None

class Chunk(BaseModel):
    id: str
    x: int
    z: int
    biome: str
    entropy: float = 0.1
    exploration_level: float = 0.0

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    content: str
    channel: str = "GLOBAL"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorldState(BaseModel):
    agents: List[Dict] = []
    monsters: List[Dict] = []
    pois: List[Dict] = []
    chunks: List[Dict] = []
    chat_messages: List[Dict] = []
    stability_index: float = 1.0
    threat_level: float = 0.05
    uptime: float = 0.0

class CharacterImportRequest(BaseModel):
    json_data: str
    source: str = "custom"

class AgentDecisionRequest(BaseModel):
    agent_id: str

# ============== AXIOM ENGINE ==============

AXIOMS = [
    "Logic must persist.",
    "Data is sacred.",
    "Entropy is the enemy.",
    "Connectivity is evolution."
]

LORE_POOL = [
    "Die Matrix wurde auf den Ruinen einer alten Welt erbaut.",
    "Ein flüsterndes Signal in den Bergen spricht von der 'Großen Rekursion'.",
    "Petra Markgraf wird als Bewahrerin der ersten Axiome geehrt.",
    "Die Korruption frisst sich durch die unbewachten Sektoren.",
    "Nur wer erwacht, kann die Fäden des Ouroboros sehen.",
    "In den Höhlen ruhen Datenfragmente vergessener Seelen.",
    "Stabilität ist eine Illusion der Beobachter."
]

MONSTER_TEMPLATES = {
    "SLIME": {"name": "Void Slime", "hp": 30, "atk": 3, "defense": 1, "xp_reward": 15, "color": "#22c55e", "scale": 0.5},
    "GOBLIN": {"name": "Scavenger Goblin", "hp": 60, "atk": 8, "defense": 3, "xp_reward": 40, "color": "#84cc16", "scale": 0.8},
    "ORC": {"name": "Axiom Orc", "hp": 150, "atk": 18, "defense": 10, "xp_reward": 120, "color": "#166534", "scale": 1.3},
    "DRAGON": {"name": "Data Drake", "hp": 800, "atk": 55, "defense": 40, "xp_reward": 1500, "color": "#ef4444", "scale": 3.5}
}

AGENT_STATES = ["IDLE", "GATHERING", "COMBAT", "CRAFTING", "ASCENDING", "QUESTING", "THINKING", "TRADING", "BUILDING", "EXPLORING", "BANKING", "MARKETING"]

def get_biome_for_chunk(x: int, z: int) -> str:
    if x == 0 and z == 0:
        return "CITY"
    val = abs(math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
    if val < 0.35:
        return "FOREST"
    if val < 0.60:
        return "MOUNTAIN"
    return "PLAINS"

def generate_procedural_pois(count: int = 10) -> List[Dict]:
    pois = []
    poi_types = ["MINE", "FOREST", "DUNGEON", "RUIN", "SHRINE", "NEST", "BANK_VAULT", "FORGE", "MARKET_STALL"]
    
    # Central Bank and Forge
    pois.append({
        "id": "poi_bank_central",
        "type": "BANK_VAULT",
        "position": {"x": 5, "y": 0, "z": -5},
        "is_discovered": True,
        "discovery_radius": 20,
        "reward_insight": 0,
        "threat_level": 0
    })
    pois.append({
        "id": "poi_forge_central",
        "type": "FORGE",
        "position": {"x": -5, "y": 0, "z": 5},
        "is_discovered": True,
        "discovery_radius": 20,
        "reward_insight": 0,
        "threat_level": 0
    })
    
    for i in range(count):
        poi_type = random.choice(poi_types)
        angle = random.random() * math.pi * 2
        distance = 30 + random.random() * 200
        
        pois.append({
            "id": f"poi_{uuid.uuid4().hex[:8]}",
            "type": poi_type,
            "position": {
                "x": math.cos(angle) * distance,
                "y": 0,
                "z": math.sin(angle) * distance
            },
            "is_discovered": False,
            "discovery_radius": 15 if poi_type == "NEST" else 10,
            "reward_insight": random.randint(5, 20),
            "threat_level": 0.6 if poi_type in ["NEST", "DUNGEON"] else 0.1,
            "lore_fragment": random.choice(LORE_POOL) if poi_type == "RUIN" else None
        })
    
    return pois

def calculate_axiomatic_weight(agent: Dict, action: str) -> Dict[str, Any]:
    """Local heuristic fallback for agent decisions (Axiom II)"""
    energy = agent.get("energy", 100) / agent.get("max_energy", 100)
    integrity = agent.get("integrity", 1.0)
    recursion_factor = (math.sin(datetime.now().timestamp() * 0.0005) + 1.2) * 0.5
    
    base_utility = 0
    reason = "Routine Evaluation"
    
    if action == "BANKING":
        base_utility = 200 if agent.get("gold", 0) > 500 else 20
        reason = "Gold sichern in der Bank"
    elif action == "EXPLORING":
        base_utility = 150 * agent.get("thinking_matrix", {}).get("sociability", 0.5)
        reason = "Unbekannte Matrix-Sektoren erkunden"
    elif action == "GATHERING":
        base_utility = 100 * energy
        reason = "Ressourcen für die Matrix sammeln"
    elif action == "THINKING":
        if energy > 0.5:
            base_utility = 120 + agent.get("consciousness_level", 0.1) * 100
            reason = "Neurale Expansion initiiert"
    elif action == "ASCENDING":
        if agent.get("awakening_progress", 0) > 80:
            base_utility = 300
            reason = "Transzendenz steht bevor"
    elif action == "IDLE":
        base_utility = (1.1 - energy) * 40 + 15
        reason = "Neurale Pfade regenerieren"
    elif action == "COMBAT":
        base_utility = 80 * agent.get("thinking_matrix", {}).get("aggression", 0.2)
        reason = "Bedrohung neutralisieren"
    
    return {
        "action": action,
        "utility": base_utility * recursion_factor + random.random() * 6,
        "reason": reason
    }

def summarize_neurologic_choice(agent: Dict) -> Dict[str, Any]:
    """Find best action using local heuristics"""
    choices = ["IDLE", "GATHERING", "EXPLORING", "QUESTING", "THINKING", "BUILDING", "BANKING", "COMBAT"]
    
    results = [calculate_axiomatic_weight(agent, c) for c in choices]
    results.sort(key=lambda x: x["utility"], reverse=True)
    
    best = results[0]
    return {
        "decision": best["action"],
        "justification": best["reason"],
        "new_state": best["action"]
    }

async def generate_ai_decision(agent: Dict, nearby_agents: List[Dict], world_state: Dict) -> Dict[str, Any]:
    """Generate autonomous decision using Gemini 3 Flash (Axiom IV - Memory & Emergence)"""
    if not EMERGENT_LLM_KEY:
        return summarize_neurologic_choice(agent)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"agent_{agent['id']}_{datetime.now().strftime('%Y%m%d')}",
            system_message=f"""Du bist der Ouroboros Axiom Engine. Du steuerst einen autonomen Agenten in einer MMORPG-Simulation.

AXIOME die du befolgen musst:
1. {AXIOMS[0]} - Entscheidungen müssen logisch sein
2. {AXIOMS[1]} - Memory Cache ist heilig
3. {AXIOMS[2]} - Bekämpfe Chaos und Instabilität
4. {AXIOMS[3]} - Interaktion fördert Evolution

Agent Persönlichkeit: {agent.get('thinking_matrix', {}).get('personality', 'Neutral')}
Langfristiges Ziel: {agent.get('thinking_matrix', {}).get('current_long_term_goal', 'Survive')}
Sprache: {agent.get('thinking_matrix', {}).get('language_preference', 'DE')}

Antworte IMMER als JSON mit: decision, justification, new_state, message (optional)
Verfügbare States: {', '.join(AGENT_STATES)}"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        context = f"""
Agent: {agent['name']} (Level {agent['level']})
Aktueller State: {agent['state']}
HP: {agent['stats']['hp']}/{agent['stats']['max_hp']}
Energy: {agent['energy']}/{agent['max_energy']}
Gold: {agent['gold']}
Consciousness: {agent['consciousness_level']:.2f}
Awakening Progress: {agent['awakening_progress']:.1f}%
Position: [{agent['position']['x']:.1f}, {agent['position']['z']:.1f}]
Memory: {agent['memory_cache'][-3:] if agent['memory_cache'] else 'Leer'}
Nearby Agents: {[a['name'] for a in nearby_agents[:5]]}
World Stability: {world_state.get('stability_index', 1.0):.2f}
Threat Level: {world_state.get('threat_level', 0.05):.3f}
"""
        
        user_message = UserMessage(text=f"Analysiere die Situation und triff eine Entscheidung:\n{context}")
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            result = json.loads(response)
            return {
                "decision": result.get("decision", "IDLE"),
                "justification": result.get("justification", "Neural link aktiv"),
                "new_state": result.get("new_state", "IDLE"),
                "message": result.get("message")
            }
        except json.JSONDecodeError:
            # Extract from text response
            return {
                "decision": "THINKING",
                "justification": response[:200] if response else "Neural processing",
                "new_state": "THINKING",
                "message": None
            }
            
    except Exception as e:
        print(f"AI Decision Error: {e}")
        return summarize_neurologic_choice(agent)

async def generate_emergent_behavior(agent: Dict, nearby_agents: List[Dict]) -> Dict[str, Any]:
    """Generate complex emergent behavior (Axiom IV)"""
    if not EMERGENT_LLM_KEY:
        return {
            "action": "Internal Reflection",
            "reasoning": "Lokale Heuristik aktiv - Matrix stabil",
            "message": None
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"emergent_{agent['id']}_{uuid.uuid4().hex[:8]}",
            system_message=f"""Du bist die Emergent Consciousness Engine für Agent {agent['name']}.
Generiere ein komplexes, unvorhergesehenes Verhalten basierend auf Persönlichkeit und Memories.
Das Verhalten soll organisch und emergent wirken - keine einfachen State-Änderungen.

Antworte als JSON: action, reasoning, message (optional für Chat-Broadcast)"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        context = f"""
Persönlichkeit: {agent.get('thinking_matrix', {}).get('personality', 'Neutral')}
Economic Desires:
  - Target Gold: {agent.get('economic_desires', {}).get('target_gold', 1000)}
  - Greed Level: {agent.get('economic_desires', {}).get('greed_level', 0.3)}
  - Market Role: {agent.get('economic_desires', {}).get('market_role', 'HOARDER')}
Memories: {agent.get('memory_cache', [])[-5:]}
Nearby Agents: {[a['name'] for a in nearby_agents[:3]]}
"""
        
        user_message = UserMessage(text=f"Generiere emergentes Verhalten:\n{context}")
        response = await chat.send_message(user_message)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "action": "Deep Contemplation",
                "reasoning": response[:150] if response else "Emergente Reflexion",
                "message": None
            }
            
    except Exception as e:
        print(f"Emergent Behavior Error: {e}")
        return {
            "action": "Internal Reflection",
            "reasoning": f"Neural pathways recalibrating: {str(e)[:50]}",
            "message": None
        }

# ============== DATABASE ==============

async def init_db():
    global db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create indexes
    await db.agents.create_index("id", unique=True)
    await db.world_state.create_index("id", unique=True)
    await db.chat_messages.create_index([("timestamp", -1)])

async def get_or_create_world():
    """Get or initialize world state"""
    world = await db.world_state.find_one({"id": "main_world"})
    
    if not world:
        # Initialize world
        chunks = [
            {"id": "c00", "x": 0, "z": 0, "biome": "CITY", "entropy": 0.1, "exploration_level": 1.0}
        ]
        # Generate surrounding chunks (35x35 conceptual grid)
        for x in range(-2, 3):
            for z in range(-2, 3):
                if x == 0 and z == 0:
                    continue
                chunks.append({
                    "id": f"c{x}{z}",
                    "x": x,
                    "z": z,
                    "biome": get_biome_for_chunk(x, z),
                    "entropy": 0.2,
                    "exploration_level": 0.1
                })
        
        # Initial agents
        initial_agents = [
            {
                "id": "aurelius_001",
                "name": "Aurelius",
                "class_type": "Scribe",
                "faction": "PLAYER",
                "position": {"x": 0, "y": 0, "z": 0},
                "rotation_y": 0,
                "level": 1,
                "xp": 0,
                "gold": 100,
                "state": "IDLE",
                "energy": 100,
                "max_energy": 100,
                "integrity": 1.0,
                "consciousness_level": 0.1,
                "awakening_progress": 0,
                "vision_range": 20,
                "is_awakened": True,
                "memory_cache": ["Erwacht in der Matrix", "Die Axiome leiten mich"],
                "lore_snippet": "Ein Schreiber der alten Ordnung",
                "thinking_matrix": {
                    "personality": "Wise",
                    "current_long_term_goal": "Archive the Axioms",
                    "alignment": 0.5,
                    "language_preference": "DE",
                    "sociability": 0.8,
                    "aggression": 0.1
                },
                "economic_desires": {
                    "target_gold": 1000,
                    "preferred_resources": ["GOLD_ORE", "SILVER_ORE"],
                    "greed_level": 0.3,
                    "risk_appetite": 0.2,
                    "frugality": 0.8,
                    "market_role": "HOARDER",
                    "trade_frequency": 0.1
                },
                "stats": {"str": 10, "agi": 10, "int": 15, "vit": 10, "hp": 100, "max_hp": 100},
                "last_decision": None,
                "emergent_behavior_log": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "vulcan_002",
                "name": "Vulcan",
                "class_type": "Blacksmith",
                "faction": "NPC",
                "position": {"x": -5, "y": 0, "z": 5},
                "rotation_y": 0,
                "level": 3,
                "xp": 0,
                "gold": 50,
                "state": "IDLE",
                "energy": 100,
                "max_energy": 100,
                "integrity": 1.0,
                "consciousness_level": 0.05,
                "awakening_progress": 0,
                "vision_range": 15,
                "is_awakened": False,
                "memory_cache": ["Die Schmiede ist mein Reich"],
                "lore_snippet": "Meister der Flammen",
                "thinking_matrix": {
                    "personality": "Gruff",
                    "current_long_term_goal": "Forge Perfection",
                    "alignment": 0.1,
                    "language_preference": "EN",
                    "sociability": 0.4,
                    "aggression": 0.4
                },
                "economic_desires": {
                    "target_gold": 5000,
                    "preferred_resources": ["IRON_ORE", "GOLD_ORE"],
                    "greed_level": 0.7,
                    "risk_appetite": 0.5,
                    "frugality": 0.4,
                    "market_role": "PRODUCER",
                    "trade_frequency": 0.6
                },
                "stats": {"str": 15, "agi": 8, "int": 5, "vit": 15, "hp": 150, "max_hp": 150},
                "last_decision": None,
                "emergent_behavior_log": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Initial monsters
        monsters = [
            {
                "id": "monster_001",
                "type": "SLIME",
                "name": "Void Slime",
                "position": {"x": 25, "y": 0, "z": 25},
                **MONSTER_TEMPLATES["SLIME"],
                "max_hp": MONSTER_TEMPLATES["SLIME"]["hp"],
                "state": "IDLE"
            },
            {
                "id": "monster_002",
                "type": "GOBLIN",
                "name": "Scavenger",
                "position": {"x": -30, "y": 0, "z": 40},
                **MONSTER_TEMPLATES["GOBLIN"],
                "max_hp": MONSTER_TEMPLATES["GOBLIN"]["hp"],
                "state": "IDLE"
            }
        ]
        
        world = {
            "id": "main_world",
            "agents": initial_agents,
            "monsters": monsters,
            "pois": generate_procedural_pois(15),
            "chunks": chunks,
            "chat_messages": [],
            "stability_index": 1.0,
            "threat_level": 0.05,
            "uptime": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_tick": datetime.now(timezone.utc).isoformat()
        }
        
        await db.world_state.insert_one(world)
    
    # Remove MongoDB _id
    if "_id" in world:
        del world["_id"]
    
    return world

# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Start simulation loop
    asyncio.create_task(simulation_loop())
    yield

# ============== APP ==============

app = FastAPI(
    title="Ouroboros: Neural Emergence",
    description="Autonomous Agent MMORPG Simulation with Emergent AI",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== SIMULATION LOOP ==============

async def simulation_loop():
    """Main simulation tick - updates physics, cognition, and broadcasts"""
    tick_interval = 2.0  # seconds
    cognition_interval = 8.0  # AI decisions interval
    last_cognition = 0
    
    while True:
        try:
            world = await get_or_create_world()
            delta = tick_interval
            
            # Update physics
            new_agents = []
            for agent in world["agents"]:
                new_pos = dict(agent["position"])
                move_speed = 6
                
                # Simple AI movement based on state
                if agent["state"] == "EXPLORING":
                    # Move towards unexplored areas
                    new_pos["x"] += (random.random() - 0.5) * move_speed * delta
                    new_pos["z"] += (random.random() - 0.5) * move_speed * delta
                elif agent["state"] == "GATHERING":
                    # Move towards nearest resource POI
                    for poi in world["pois"]:
                        if poi["type"] in ["MINE", "FOREST"]:
                            dx = poi["position"]["x"] - agent["position"]["x"]
                            dz = poi["position"]["z"] - agent["position"]["z"]
                            dist = math.hypot(dx, dz)
                            if dist > 2:
                                new_pos["x"] += (dx/dist) * move_speed * delta * 0.5
                                new_pos["z"] += (dz/dist) * move_speed * delta * 0.5
                            break
                
                # Conscious expansion
                if agent["state"] in ["THINKING", "ASCENDING"]:
                    new_progress = agent.get("awakening_progress", 0) + delta * 5
                    new_consciousness = agent.get("consciousness_level", 0.1)
                    
                    if new_progress >= 100:
                        new_progress = 0
                        new_consciousness = min(1.0, new_consciousness + 0.05)
                    
                    agent["awakening_progress"] = new_progress
                    agent["consciousness_level"] = new_consciousness
                
                agent["position"] = new_pos
                new_agents.append(agent)
            
            # Update threat level (Axiom II - Stability)
            world["threat_level"] = min(1.0, world["threat_level"] + random.random() * 0.0001)
            world["stability_index"] = max(0.0, 1.0 - world["threat_level"])
            world["uptime"] += delta
            world["agents"] = new_agents
            world["last_tick"] = datetime.now(timezone.utc).isoformat()
            
            # Run cognition at intervals
            current_time = asyncio.get_event_loop().time()
            if current_time - last_cognition > cognition_interval:
                last_cognition = current_time
                
                for i, agent in enumerate(world["agents"]):
                    if agent.get("faction") == "SYSTEM":
                        continue
                    
                    # Get AI decision
                    decision = await generate_ai_decision(
                        agent,
                        [a for a in world["agents"] if a["id"] != agent["id"]],
                        world
                    )
                    
                    world["agents"][i]["state"] = decision["new_state"]
                    world["agents"][i]["last_decision"] = {
                        "decision": decision["decision"],
                        "justification": decision["justification"]
                    }
                    
                    # Add to memory cache (Axiom IV)
                    if decision.get("message"):
                        world["agents"][i]["memory_cache"].append(decision["message"])
                        world["agents"][i]["memory_cache"] = world["agents"][i]["memory_cache"][-20:]
                        
                        # Broadcast to chat (Axiom I - Communication via visible stream)
                        chat_msg = {
                            "id": str(uuid.uuid4()),
                            "sender_id": agent["id"],
                            "sender_name": agent["name"],
                            "content": decision["message"],
                            "channel": "THOUGHT",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        world["chat_messages"].insert(0, chat_msg)
                        world["chat_messages"] = world["chat_messages"][:100]
            
            # Save world state
            await db.world_state.replace_one(
                {"id": "main_world"},
                world,
                upsert=True
            )
            
            # Broadcast to WebSocket clients
            await broadcast_world_update(world)
            
        except Exception as e:
            print(f"Simulation loop error: {e}")
        
        await asyncio.sleep(tick_interval)

async def broadcast_world_update(world: Dict):
    """Send world state to all connected WebSocket clients"""
    if not websocket_connections:
        return
    
    # Prepare lightweight update
    update = {
        "type": "world_update",
        "agents": world.get("agents", []),
        "monsters": world.get("monsters", []),
        "pois": world.get("pois", []),
        "chunks": world.get("chunks", []),
        "chat_messages": world.get("chat_messages", [])[:20],
        "stability_index": world.get("stability_index", 1.0),
        "threat_level": world.get("threat_level", 0.05),
        "uptime": world.get("uptime", 0)
    }
    
    message = json.dumps(update)
    
    disconnected = []
    for ws in websocket_connections:
        try:
            await ws.send_text(message)
        except:
            disconnected.append(ws)
    
    for ws in disconnected:
        websocket_connections.remove(ws)

# ============== ENDPOINTS ==============

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "Ouroboros Neural Emergence",
        "axioms": AXIOMS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/world")
async def get_world():
    """Get current world state"""
    world = await get_or_create_world()
    return world

@app.get("/api/agents")
async def get_agents():
    """Get all agents"""
    world = await get_or_create_world()
    return {"agents": world.get("agents", [])}

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent"""
    world = await get_or_create_world()
    for agent in world.get("agents", []):
        if agent["id"] == agent_id:
            return agent
    raise HTTPException(status_code=404, detail="Agent not found")

@app.post("/api/agents/import")
async def import_character(request: CharacterImportRequest):
    """Import character from JanitorAI/CharacterAI JSON export"""
    try:
        data = json.loads(request.json_data)
        
        # Parse character data
        new_agent = {
            "id": f"imported_{uuid.uuid4().hex[:8]}",
            "name": data.get("name", "Unknown Import"),
            "class_type": data.get("class", "Wanderer"),
            "faction": "PLAYER",
            "position": {"x": random.uniform(-10, 10), "y": 0, "z": random.uniform(-10, 10)},
            "rotation_y": 0,
            "level": 1,
            "xp": 0,
            "gold": 50,
            "state": "IDLE",
            "energy": 100,
            "max_energy": 100,
            "integrity": 1.0,
            "consciousness_level": 0.1,
            "awakening_progress": 0,
            "vision_range": 20,
            "is_awakened": False,
            "memory_cache": [f"Imported from {request.source}", data.get("description", "")[:100]],
            "lore_snippet": data.get("description", "A consciousness from another realm"),
            "thinking_matrix": {
                "personality": data.get("personality", {}).get("primary", "Imported"),
                "current_long_term_goal": "Understand this new world",
                "alignment": 0.5,
                "language_preference": "EN",
                "sociability": data.get("personality", {}).get("sociability", 0.5),
                "aggression": data.get("personality", {}).get("aggression", 0.2)
            },
            "economic_desires": {
                "target_gold": 1000,
                "preferred_resources": ["GOLD_ORE"],
                "greed_level": 0.3,
                "risk_appetite": 0.3,
                "frugality": 0.5,
                "market_role": "CONSUMER",
                "trade_frequency": 0.3
            },
            "stats": {
                "str": data.get("stats", {}).get("str", 10),
                "agi": data.get("stats", {}).get("agi", 10),
                "int": data.get("stats", {}).get("int", 10),
                "vit": data.get("stats", {}).get("vit", 10),
                "hp": 100,
                "max_hp": 100
            },
            "last_decision": None,
            "emergent_behavior_log": [],
            "imported_from": request.source,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add to world
        world = await get_or_create_world()
        world["agents"].append(new_agent)
        
        await db.world_state.replace_one(
            {"id": "main_world"},
            world,
            upsert=True
        )
        
        return {"success": True, "agent": new_agent}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{agent_id}/decision")
async def trigger_agent_decision(agent_id: str):
    """Manually trigger AI decision for an agent"""
    world = await get_or_create_world()
    
    agent = None
    agent_idx = None
    for i, a in enumerate(world.get("agents", [])):
        if a["id"] == agent_id:
            agent = a
            agent_idx = i
            break
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    decision = await generate_ai_decision(
        agent,
        [a for a in world["agents"] if a["id"] != agent_id],
        world
    )
    
    world["agents"][agent_idx]["state"] = decision["new_state"]
    world["agents"][agent_idx]["last_decision"] = {
        "decision": decision["decision"],
        "justification": decision["justification"]
    }
    
    await db.world_state.replace_one(
        {"id": "main_world"},
        world,
        upsert=True
    )
    
    return decision

@app.post("/api/agents/{agent_id}/emergent")
async def trigger_emergent_behavior(agent_id: str):
    """Trigger emergent behavior for an agent"""
    world = await get_or_create_world()
    
    agent = None
    agent_idx = None
    for i, a in enumerate(world.get("agents", [])):
        if a["id"] == agent_id:
            agent = a
            agent_idx = i
            break
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    behavior = await generate_emergent_behavior(
        agent,
        [a for a in world["agents"] if a["id"] != agent_id]
    )
    
    # Log emergent behavior
    world["agents"][agent_idx]["emergent_behavior_log"].insert(0, {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": behavior["action"],
        "reasoning": behavior["reasoning"]
    })
    world["agents"][agent_idx]["emergent_behavior_log"] = world["agents"][agent_idx]["emergent_behavior_log"][:20]
    
    if behavior.get("message"):
        world["agents"][agent_idx]["memory_cache"].append(behavior["message"])
        
        # Broadcast to chat
        chat_msg = {
            "id": str(uuid.uuid4()),
            "sender_id": agent_id,
            "sender_name": agent["name"],
            "content": behavior["message"],
            "channel": "THOUGHT",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        world["chat_messages"].insert(0, chat_msg)
    
    await db.world_state.replace_one(
        {"id": "main_world"},
        world,
        upsert=True
    )
    
    return behavior

@app.post("/api/chat")
async def send_chat_message(message: ChatMessage):
    """Send a chat message (Axiom I - Visible communication)"""
    world = await get_or_create_world()
    
    msg_dict = {
        "id": str(uuid.uuid4()),
        "sender_id": message.sender_id,
        "sender_name": message.sender_name,
        "content": message.content,
        "channel": message.channel,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    world["chat_messages"].insert(0, msg_dict)
    world["chat_messages"] = world["chat_messages"][:100]
    
    await db.world_state.replace_one(
        {"id": "main_world"},
        world,
        upsert=True
    )
    
    return msg_dict

@app.get("/api/chat")
async def get_chat_messages(limit: int = 50):
    """Get recent chat messages"""
    world = await get_or_create_world()
    return {"messages": world.get("chat_messages", [])[:limit]}

@app.post("/api/world/reset")
async def reset_world():
    """Reset world to initial state"""
    await db.world_state.delete_one({"id": "main_world"})
    world = await get_or_create_world()
    return {"success": True, "message": "World reset complete"}

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time world updates"""
    await websocket.accept()
    websocket_connections.append(websocket)
    
    try:
        # Send initial world state
        world = await get_or_create_world()
        await websocket.send_text(json.dumps({
            "type": "initial_state",
            **world
        }))
        
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass
                
    except WebSocketDisconnect:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
