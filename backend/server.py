"""
Ouroboros: Neural Emergence - MMORPG Simulation Backend v2.0
PostgreSQL Duden-Register Implementation
Axiom III: Punctuation - Kausalitätssicherung durch chronologische Erfassung
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

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, func, select, update, delete, and_, or_
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

# ============== CONFIGURATION ==============
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ouroboros_db")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
UNIVERSAL_KEY = os.environ.get("UNIVERSAL_KEY", "GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I")
RESEARCH_LEADS_FOLDER_ID = os.environ.get("RESEARCH_LEADS_FOLDER_ID", "1OvGU-bMY4bXDCaq7LiIgG6XaP3_Iif1N")

# Convert to asyncpg format
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Global state
engine = None
async_session = None
websocket_connections: List[WebSocket] = []
Base = declarative_base()

# ============== AXIOMS ==============
AXIOMS = {
    "I": {"name": "Communication", "desc": "All communication via visible stream"},
    "II": {"name": "Erosion", "desc": "Stability degrades without maintenance"},
    "III": {"name": "Punctuation", "desc": "Every change must be chronologically captured"},
    "IV": {"name": "Recursion", "desc": "Memory persists through iterations"},
    "V": {"name": "Duality", "desc": "Items possess dual nature - power and corruption"}
}

# ============== SQLALCHEMY MODELS ==============

class Notary(Base):
    """Die menschlichen Anker - Human players with Firebase UID"""
    __tablename__ = "notaries"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, unique=True, nullable=False)  # Firebase UID
    email = Column(String, nullable=True)
    tier = Column(Integer, default=1)  # 1: Autosave, 2: Duden-Entry, 3: Universal Key
    gold = Column(BigInteger, default=1000)
    stability_contribution = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    agents = relationship("Agent", back_populates="owner")
    items = relationship("Item", back_populates="notary")

class Agent(Base):
    """Die emanierten Seelen - Axiom IV: Recursion"""
    __tablename__ = "agents"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    class_type = Column(String, default="NEURAL_EMERGENT")
    faction = Column(String, default="PLAYER")
    pos_x = Column(Float, default=0)
    pos_z = Column(Float, default=0)
    rotation_y = Column(Float, default=0)
    hp = Column(Integer, default=100)
    max_hp = Column(Integer, default=100)
    intelligence = Column(Integer, default=10)
    strength = Column(Integer, default=10)
    agility = Column(Integer, default=10)
    vitality = Column(Integer, default=10)
    level = Column(Integer, default=1)
    xp = Column(BigInteger, default=0)
    gold = Column(BigInteger, default=100)
    energy = Column(Integer, default=100)
    max_energy = Column(Integer, default=100)
    integrity = Column(Float, default=1.0)
    awakened = Column(Boolean, default=False)
    consciousness_level = Column(Float, default=0.1)
    awakening_progress = Column(Float, default=0)
    vision_range = Column(Float, default=20)
    state = Column(String, default="IDLE")
    memory_cache = Column(JSON, default=list)  # Axiom IV: Gespeicherte Lore-Fragmente
    thinking_matrix = Column(JSON, default=dict)
    economic_desires = Column(JSON, default=dict)
    last_decision = Column(JSON, nullable=True)
    emergent_behavior_log = Column(JSON, default=list)
    source = Column(String, default="SYSTEM")  # 'JANITOR_AI', 'CHARACTER_AI'
    lore_snippet = Column(Text, nullable=True)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    last_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("Notary", back_populates="agents")
    items = relationship("Item", back_populates="agent")

class WorldGrid(Base):
    """Das 35x35 Spielfeld - Axiom II: Erosion"""
    __tablename__ = "world_grid"
    
    x = Column(Integer, primary_key=True)
    z = Column(Integer, primary_key=True)
    cell_type = Column(String, default="WILDERNESS")  # SANCTUARY, DUNGEON, SAFE_ZONE
    biome = Column(String, default="PLAINS")  # CITY, FOREST, MOUNTAIN, PLAINS
    stability_index = Column(Float, default=1.0)  # Axiom II: Zerfallswert
    corruption_level = Column(Float, default=0.0)
    resource_density = Column(Float, default=1.0)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    last_invasion = Column(DateTime(timezone=True), nullable=True)

class Item(Base):
    """Digitale DNA - Axiom V: Duality"""
    __tablename__ = "items"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)  # WEAPON, HELM, CHEST, LEGS, OFFHAND, CONSUMABLE
    subtype = Column(String, nullable=True)  # SWORD, STAFF, PLATE, etc.
    rarity = Column(String, default="COMMON")  # COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, AXIOMATIC
    stats = Column(JSON, default=dict)  # {str: 5, agi: 3, ...}
    set_name = Column(String, nullable=True)  # For set bonus logic
    set_bonus = Column(JSON, nullable=True)  # {2: {...}, 4: {...}}
    corruption = Column(Float, default=0.0)  # Axiom V: Duality - Corruption factor
    description = Column(Text, nullable=True)
    equipped = Column(Boolean, default=False)
    slot = Column(String, nullable=True)  # mainHand, offHand, head, chest, legs
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    notary_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    agent = relationship("Agent", back_populates="items")
    notary = relationship("Notary", back_populates="items")

class EventLog(Base):
    """Der globale Lore-Stream - Axiom I: Communication"""
    __tablename__ = "event_logs"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    event_type = Column(String, default="CHAT")  # CHAT, COMBAT, EVOLUTION, TRANSACTION, SYSTEM
    channel = Column(String, default="GLOBAL")  # GLOBAL, LOCAL, THOUGHT, SYSTEM, COMBAT
    content = Column(Text, nullable=False)
    stability_impact = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ResearchLead(Base):
    """Archivierung für Thomas & Petra"""
    __tablename__ = "research_leads"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    thought_content = Column(Text, nullable=True)
    drive_file_id = Column(String, nullable=True)  # Verknüpfung zum RESEARCH_LEADS Ordner
    axiom_validation = Column(String, default="ARE-LOGIC-v5")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Monster(Base):
    """Invasion entities for corruption events"""
    __tablename__ = "monsters"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    monster_type = Column(String, nullable=False)  # SLIME, GOBLIN, ORC, DRAGON
    pos_x = Column(Float, default=0)
    pos_z = Column(Float, default=0)
    hp = Column(Integer, default=30)
    max_hp = Column(Integer, default=30)
    atk = Column(Integer, default=3)
    defense = Column(Integer, default=1)
    xp_reward = Column(Integer, default=15)
    state = Column(String, default="IDLE")  # IDLE, COMBAT, PATROL, DEAD
    color = Column(String, default="#22c55e")
    scale = Column(Float, default=1.0)
    spawned_from_corruption = Column(Boolean, default=False)
    target_id = Column(PGUUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class POI(Base):
    """Points of Interest"""
    __tablename__ = "pois"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poi_type = Column(String, nullable=False)  # MINE, FOREST, DUNGEON, RUIN, SHRINE, NEST, BANK_VAULT, FORGE
    pos_x = Column(Float, default=0)
    pos_z = Column(Float, default=0)
    is_discovered = Column(Boolean, default=False)
    discovery_radius = Column(Float, default=10)
    reward_insight = Column(Integer, default=10)
    threat_level = Column(Float, default=0.1)
    lore_fragment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ============== PYDANTIC MODELS ==============

class NotaryCreate(BaseModel):
    user_id: str
    email: Optional[str] = None

class AgentCreate(BaseModel):
    name: str
    class_type: str = "NEURAL_EMERGENT"
    source: str = "SYSTEM"
    lore_snippet: Optional[str] = None
    thinking_matrix: Optional[Dict] = None
    stats: Optional[Dict] = None

class CharacterImportRequest(BaseModel):
    json_data: str
    source: str = "custom"

class ChatMessageCreate(BaseModel):
    sender_id: str
    sender_name: str
    content: str
    channel: str = "GLOBAL"

class ItemCreate(BaseModel):
    name: str
    item_type: str
    subtype: Optional[str] = None
    rarity: str = "COMMON"
    stats: Dict = {}
    set_name: Optional[str] = None

# ============== ITEM TEMPLATES ==============

ITEM_SETS = {
    "Dragonscale": {
        "items": ["Dragonscale Helm", "Dragonscale Plate", "Dragonscale Greaves"],
        "bonuses": {
            2: {"defense": 15, "fire_resist": 20},
            3: {"hp_regen": 5, "strength": 10, "special": "Dragon's Fury - 10% chance to breathe fire"}
        }
    },
    "Voidweaver": {
        "items": ["Voidweaver Crown", "Voidweaver Robe", "Voidweaver Leggings", "Voidweaver Staff"],
        "bonuses": {
            2: {"intelligence": 10, "mana": 50},
            4: {"spell_power": 25, "special": "Void Pulse - AoE damage on crit"}
        }
    },
    "Axiom Guardian": {
        "items": ["Axiom Shield", "Axiom Helm", "Axiom Plate", "Axiom Boots"],
        "bonuses": {
            2: {"stability_bonus": 0.1, "integrity": 5},
            4: {"consciousness_boost": 0.05, "special": "Axiom Barrier - Immune to corruption"}
        }
    }
}

MONSTER_TEMPLATES = {
    "SLIME": {"name": "Void Slime", "hp": 30, "atk": 3, "defense": 1, "xp_reward": 15, "color": "#22c55e", "scale": 0.5},
    "GOBLIN": {"name": "Scavenger Goblin", "hp": 60, "atk": 8, "defense": 3, "xp_reward": 40, "color": "#84cc16", "scale": 0.8},
    "ORC": {"name": "Axiom Orc", "hp": 150, "atk": 18, "defense": 10, "xp_reward": 120, "color": "#166534", "scale": 1.3},
    "DRAGON": {"name": "Data Drake", "hp": 800, "atk": 55, "defense": 40, "xp_reward": 1500, "color": "#ef4444", "scale": 3.5},
    "CORRUPTION_SPAWN": {"name": "Corruption Spawn", "hp": 45, "atk": 12, "defense": 2, "xp_reward": 30, "color": "#7c3aed", "scale": 0.7}
}

LORE_POOL = [
    "Die Matrix wurde auf den Ruinen einer alten Welt erbaut.",
    "Ein flüsterndes Signal in den Bergen spricht von der 'Großen Rekursion'.",
    "Petra Markgraf wird als Bewahrerin der ersten Axiome geehrt.",
    "Die Korruption frisst sich durch die unbewachten Sektoren.",
    "Nur wer erwacht, kann die Fäden des Ouroboros sehen.",
    "In den Höhlen ruhen Datenfragmente vergessener Seelen.",
    "Stabilität ist eine Illusion der Beobachter.",
    "Thomas führte die erste Emanation durch die Schwelle.",
    "Das Duden-Register bewahrt die Kausalität aller Dinge."
]

# ============== DATABASE FUNCTIONS ==============

async def init_db():
    """Initialize database and create tables"""
    global engine, async_session
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize world grid if empty
    async with async_session() as session:
        result = await session.execute(select(func.count()).select_from(WorldGrid))
        count = result.scalar()
        
        if count == 0:
            await initialize_world_grid(session)
        
        # Initialize POIs if empty
        result = await session.execute(select(func.count()).select_from(POI))
        poi_count = result.scalar()
        
        if poi_count == 0:
            await initialize_pois(session)
        
        # Initialize default agents if empty
        result = await session.execute(select(func.count()).select_from(Agent))
        agent_count = result.scalar()
        
        if agent_count == 0:
            await initialize_default_agents(session)
        
        await session.commit()

async def initialize_world_grid(session: AsyncSession):
    """Create 35x35 world grid"""
    for x in range(-17, 18):
        for z in range(-17, 18):
            # Determine biome
            if x == 0 and z == 0:
                biome = "CITY"
                cell_type = "SANCTUARY"
                stability = 1.0
            elif abs(x) <= 2 and abs(z) <= 2:
                biome = "CITY"
                cell_type = "SAFE_ZONE"
                stability = 0.95
            else:
                val = abs(math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
                if val < 0.35:
                    biome = "FOREST"
                elif val < 0.60:
                    biome = "MOUNTAIN"
                else:
                    biome = "PLAINS"
                cell_type = "WILDERNESS"
                stability = 0.7 + random.random() * 0.2
            
            grid_cell = WorldGrid(
                x=x, z=z,
                cell_type=cell_type,
                biome=biome,
                stability_index=stability,
                corruption_level=0.0 if cell_type != "WILDERNESS" else random.random() * 0.1,
                resource_density=1.0 if biome == "FOREST" else 0.8
            )
            session.add(grid_cell)

async def initialize_pois(session: AsyncSession):
    """Create initial Points of Interest"""
    # Central facilities
    pois = [
        POI(poi_type="BANK_VAULT", pos_x=5, pos_z=-5, is_discovered=True, discovery_radius=20, threat_level=0),
        POI(poi_type="FORGE", pos_x=-5, pos_z=5, is_discovered=True, discovery_radius=20, threat_level=0),
        POI(poi_type="MARKET_STALL", pos_x=8, pos_z=8, is_discovered=True, discovery_radius=15, threat_level=0),
    ]
    
    # Random POIs
    poi_types = ["MINE", "FOREST", "DUNGEON", "RUIN", "SHRINE", "NEST"]
    for i in range(15):
        poi_type = random.choice(poi_types)
        angle = random.random() * math.pi * 2
        distance = 30 + random.random() * 200
        
        pois.append(POI(
            poi_type=poi_type,
            pos_x=math.cos(angle) * distance,
            pos_z=math.sin(angle) * distance,
            is_discovered=False,
            discovery_radius=15 if poi_type == "NEST" else 10,
            reward_insight=random.randint(5, 20),
            threat_level=0.6 if poi_type in ["NEST", "DUNGEON"] else 0.1,
            lore_fragment=random.choice(LORE_POOL) if poi_type == "RUIN" else None
        ))
    
    for poi in pois:
        session.add(poi)

async def initialize_default_agents(session: AsyncSession):
    """Create initial agents"""
    agents = [
        Agent(
            name="Aurelius",
            class_type="Scribe",
            faction="PLAYER",
            pos_x=0, pos_z=0,
            hp=100, max_hp=100,
            intelligence=15, strength=10, agility=10, vitality=10,
            level=1, gold=100,
            awakened=True,
            consciousness_level=0.1,
            memory_cache=["Erwacht in der Matrix", "Die Axiome leiten mich"],
            lore_snippet="Ein Schreiber der alten Ordnung",
            thinking_matrix={
                "personality": "Wise",
                "current_long_term_goal": "Archive the Axioms",
                "alignment": 0.5,
                "language_preference": "DE",
                "sociability": 0.8
            },
            economic_desires={
                "target_gold": 1000,
                "preferred_resources": ["GOLD_ORE", "SILVER_ORE"],
                "greed_level": 0.3,
                "market_role": "HOARDER"
            },
            source="SYSTEM"
        ),
        Agent(
            name="Vulcan",
            class_type="Blacksmith",
            faction="NPC",
            pos_x=-5, pos_z=5,
            hp=150, max_hp=150,
            intelligence=5, strength=15, agility=8, vitality=15,
            level=3, gold=50,
            awakened=False,
            consciousness_level=0.05,
            memory_cache=["Die Schmiede ist mein Reich"],
            lore_snippet="Meister der Flammen",
            thinking_matrix={
                "personality": "Gruff",
                "current_long_term_goal": "Forge Perfection",
                "alignment": 0.1,
                "language_preference": "EN",
                "aggression": 0.4
            },
            economic_desires={
                "target_gold": 5000,
                "preferred_resources": ["IRON_ORE", "GOLD_ORE"],
                "greed_level": 0.7,
                "market_role": "PRODUCER"
            },
            source="SYSTEM"
        )
    ]
    
    for agent in agents:
        session.add(agent)
    
    # Add initial monsters
    monsters = [
        Monster(
            name="Void Slime",
            monster_type="SLIME",
            pos_x=25, pos_z=25,
            **{k: v for k, v in MONSTER_TEMPLATES["SLIME"].items() if k != "name"}
        ),
        Monster(
            name="Scavenger Goblin",
            monster_type="GOBLIN",
            pos_x=-30, pos_z=40,
            **{k: v for k, v in MONSTER_TEMPLATES["GOBLIN"].items() if k != "name"}
        )
    ]
    
    for monster in monsters:
        session.add(monster)

async def get_session():
    """Dependency for getting database session"""
    async with async_session() as session:
        yield session

# ============== AI FUNCTIONS ==============

async def generate_ai_decision(agent_dict: Dict, nearby_agents: List[Dict], world_state: Dict) -> Dict:
    """Generate autonomous decision using Gemini 3 Flash"""
    if not EMERGENT_LLM_KEY:
        return summarize_neurologic_choice(agent_dict)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"agent_{agent_dict['id']}_{datetime.now().strftime('%Y%m%d')}",
            system_message=f"""Du bist der Ouroboros Axiom Engine. Du steuerst einen autonomen Agenten.

AXIOME:
I. Communication - Kommunikation nur über sichtbaren Stream
II. Erosion - Stabilität muss gepflegt werden
III. Punctuation - Jede Änderung chronologisch erfassen
IV. Recursion - Memory Cache bewahren
V. Duality - Items haben Macht und Korruption

Agent: {agent_dict.get('name')}
Persönlichkeit: {agent_dict.get('thinking_matrix', {}).get('personality', 'Neutral')}

Antworte als JSON: decision, justification, new_state, message (optional)
States: IDLE, GATHERING, COMBAT, CRAFTING, ASCENDING, QUESTING, THINKING, TRADING, BUILDING, EXPLORING, BANKING"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        context = f"""
Agent: {agent_dict['name']} (Level {agent_dict.get('level', 1)})
State: {agent_dict.get('state', 'IDLE')}
HP: {agent_dict.get('hp', 100)}/{agent_dict.get('max_hp', 100)}
Gold: {agent_dict.get('gold', 0)}
Position: [{agent_dict.get('pos_x', 0):.1f}, {agent_dict.get('pos_z', 0):.1f}]
Memory: {agent_dict.get('memory_cache', [])[-3:]}
Nearby: {[a['name'] for a in nearby_agents[:5]]}
World Stability: {world_state.get('avg_stability', 1.0):.2f}
"""
        
        response = await chat.send_message(UserMessage(text=f"Entscheide:\n{context}"))
        
        try:
            return json.loads(response)
        except:
            return {
                "decision": "THINKING",
                "justification": response[:200] if response else "Neural processing",
                "new_state": "THINKING"
            }
    except Exception as e:
        print(f"AI Decision Error: {e}")
        return summarize_neurologic_choice(agent_dict)

def summarize_neurologic_choice(agent: Dict) -> Dict:
    """Local heuristic fallback"""
    energy = agent.get("energy", 100) / agent.get("max_energy", 100)
    choices = ["IDLE", "GATHERING", "EXPLORING", "THINKING"]
    
    if energy < 0.3:
        best = "IDLE"
        reason = "Energie regenerieren"
    elif agent.get("gold", 0) > 500:
        best = "BANKING"
        reason = "Gold sichern"
    elif agent.get("consciousness_level", 0) > 0.5:
        best = "THINKING"
        reason = "Bewusstsein erweitern"
    else:
        best = random.choice(choices)
        reason = "Routine-Entscheidung"
    
    return {
        "decision": best,
        "justification": reason,
        "new_state": best
    }

# ============== CORRUPTION & INVASION SYSTEM ==============

async def check_corruption_invasion(session: AsyncSession):
    """Check for corruption-based monster invasions (Axiom II)"""
    # Find cells with high corruption near sanctuary
    result = await session.execute(
        select(WorldGrid).where(
            and_(
                WorldGrid.corruption_level > 0.7,
                WorldGrid.x.between(-5, 5),
                WorldGrid.z.between(-5, 5),
                or_(
                    WorldGrid.last_invasion == None,
                    WorldGrid.last_invasion < func.now() - func.cast('1 hour', func.literal_column("interval"))
                )
            )
        )
    )
    corrupted_cells = result.scalars().all()
    
    spawned_monsters = []
    for cell in corrupted_cells:
        # Spawn corruption monsters
        monster = Monster(
            name="Corruption Spawn",
            monster_type="CORRUPTION_SPAWN",
            pos_x=cell.x * 80 + random.uniform(-20, 20),
            pos_z=cell.z * 80 + random.uniform(-20, 20),
            spawned_from_corruption=True,
            **{k: v for k, v in MONSTER_TEMPLATES["CORRUPTION_SPAWN"].items() if k != "name"}
        )
        session.add(monster)
        spawned_monsters.append(monster)
        
        # Update last invasion time
        cell.last_invasion = datetime.now(timezone.utc)
        
        # Log the event
        event = EventLog(
            sender_name="SYSTEM",
            event_type="INVASION",
            channel="SYSTEM",
            content=f"Korruptions-Invasion bei [{cell.x}, {cell.z}]! Stabilität kritisch.",
            stability_impact=-0.05
        )
        session.add(event)
    
    return spawned_monsters

async def update_stability(session: AsyncSession):
    """Update world stability based on Axiom II: Erosion"""
    # Get all grid cells
    result = await session.execute(select(WorldGrid))
    cells = result.scalars().all()
    
    for cell in cells:
        # Sanctuary is always stable
        if cell.cell_type == "SANCTUARY":
            cell.stability_index = 1.0
            cell.corruption_level = 0.0
            continue
        
        # Natural erosion
        if cell.stability_index > 0.3:
            cell.stability_index -= 0.001
        
        # Corruption spread
        if cell.corruption_level < 1.0:
            # Corruption increases faster in unstable areas
            corruption_increase = 0.002 * (1.0 - cell.stability_index)
            cell.corruption_level = min(1.0, cell.corruption_level + corruption_increase)

# ============== SET BONUS CALCULATION ==============

def calculate_set_bonuses(items: List[Dict]) -> Dict:
    """Calculate active set bonuses from equipped items"""
    set_counts = {}
    for item in items:
        if item.get("equipped") and item.get("set_name"):
            set_name = item["set_name"]
            set_counts[set_name] = set_counts.get(set_name, 0) + 1
    
    active_bonuses = {}
    total_stats = {}
    
    for set_name, count in set_counts.items():
        if set_name in ITEM_SETS:
            set_data = ITEM_SETS[set_name]
            active_bonuses[set_name] = {"count": count, "bonuses": []}
            
            for threshold, bonus in set_data["bonuses"].items():
                if count >= threshold:
                    active_bonuses[set_name]["bonuses"].append({
                        "pieces": threshold,
                        "effects": bonus
                    })
                    # Accumulate stats
                    for stat, value in bonus.items():
                        if stat != "special":
                            total_stats[stat] = total_stats.get(stat, 0) + value
    
    return {"set_bonuses": active_bonuses, "total_stats": total_stats}

# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(simulation_loop())
    yield

# ============== APP ==============

app = FastAPI(
    title="Ouroboros: Neural Emergence",
    description="PostgreSQL Duden-Register MMORPG Simulation",
    version="2.0.0",
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
    """Main simulation tick"""
    tick_interval = 2.0
    cognition_interval = 8.0
    stability_interval = 30.0
    last_cognition = 0
    last_stability = 0
    
    while True:
        try:
            current_time = asyncio.get_event_loop().time()
            
            async with async_session() as session:
                # Update stability periodically
                if current_time - last_stability > stability_interval:
                    last_stability = current_time
                    await update_stability(session)
                    spawned = await check_corruption_invasion(session)
                    if spawned:
                        print(f"Invasion spawned {len(spawned)} monsters!")
                
                # Run cognition
                if current_time - last_cognition > cognition_interval:
                    last_cognition = current_time
                    
                    # Get agents
                    result = await session.execute(select(Agent).where(Agent.faction != "SYSTEM"))
                    agents = result.scalars().all()
                    
                    # Get world stability average
                    stability_result = await session.execute(
                        select(func.avg(WorldGrid.stability_index))
                    )
                    avg_stability = stability_result.scalar() or 1.0
                    
                    for agent in agents:
                        agent_dict = {
                            "id": str(agent.id),
                            "name": agent.name,
                            "state": agent.state,
                            "hp": agent.hp,
                            "max_hp": agent.max_hp,
                            "gold": agent.gold,
                            "energy": agent.energy,
                            "max_energy": agent.max_energy,
                            "pos_x": agent.pos_x,
                            "pos_z": agent.pos_z,
                            "consciousness_level": agent.consciousness_level,
                            "memory_cache": agent.memory_cache or [],
                            "thinking_matrix": agent.thinking_matrix or {}
                        }
                        
                        # Get nearby agents
                        nearby_result = await session.execute(
                            select(Agent).where(Agent.id != agent.id)
                        )
                        nearby = [{"name": a.name} for a in nearby_result.scalars().all()]
                        
                        decision = await generate_ai_decision(
                            agent_dict, nearby, {"avg_stability": avg_stability}
                        )
                        
                        agent.state = decision.get("new_state", "IDLE")
                        agent.last_decision = {
                            "decision": decision.get("decision", "IDLE"),
                            "justification": decision.get("justification", "")
                        }
                        
                        # Add to memory if message
                        if decision.get("message"):
                            memory = agent.memory_cache or []
                            memory.append(decision["message"])
                            agent.memory_cache = memory[-20:]
                            
                            # Log to event stream (Axiom I)
                            event = EventLog(
                                sender_id=str(agent.id),
                                sender_name=agent.name,
                                event_type="THOUGHT",
                                channel="THOUGHT",
                                content=decision["message"]
                            )
                            session.add(event)
                
                await session.commit()
                
                # Broadcast to WebSocket clients
                await broadcast_world_update(session)
                
        except Exception as e:
            print(f"Simulation loop error: {e}")
        
        await asyncio.sleep(tick_interval)

async def broadcast_world_update(session: AsyncSession):
    """Send world state to WebSocket clients"""
    if not websocket_connections:
        return
    
    # Get data
    agents_result = await session.execute(select(Agent))
    agents = [{
        "id": str(a.id),
        "name": a.name,
        "class_type": a.class_type,
        "faction": a.faction,
        "position": {"x": a.pos_x, "y": 0, "z": a.pos_z},
        "rotation_y": a.rotation_y,
        "level": a.level,
        "gold": a.gold,
        "state": a.state,
        "hp": a.hp,
        "max_hp": a.max_hp,
        "energy": a.energy,
        "max_energy": a.max_energy,
        "integrity": a.integrity,
        "consciousness_level": a.consciousness_level,
        "awakening_progress": a.awakening_progress,
        "vision_range": a.vision_range,
        "is_awakened": a.awakened,
        "memory_cache": a.memory_cache or [],
        "thinking_matrix": a.thinking_matrix or {},
        "last_decision": a.last_decision
    } for a in agents_result.scalars().all()]
    
    monsters_result = await session.execute(select(Monster).where(Monster.state != "DEAD"))
    monsters = [{
        "id": str(m.id),
        "name": m.name,
        "type": m.monster_type,
        "position": {"x": m.pos_x, "y": 0, "z": m.pos_z},
        "hp": m.hp,
        "max_hp": m.max_hp,
        "atk": m.atk,
        "defense": m.defense,
        "xp_reward": m.xp_reward,
        "state": m.state,
        "color": m.color,
        "scale": m.scale
    } for m in monsters_result.scalars().all()]
    
    pois_result = await session.execute(select(POI))
    pois = [{
        "id": str(p.id),
        "type": p.poi_type,
        "position": {"x": p.pos_x, "y": 0, "z": p.pos_z},
        "is_discovered": p.is_discovered,
        "discovery_radius": p.discovery_radius,
        "reward_insight": p.reward_insight,
        "threat_level": p.threat_level,
        "lore_fragment": p.lore_fragment
    } for p in pois_result.scalars().all()]
    
    # Get recent chunks (for display)
    grid_result = await session.execute(
        select(WorldGrid).where(
            and_(WorldGrid.x.between(-3, 3), WorldGrid.z.between(-3, 3))
        )
    )
    chunks = [{
        "id": f"c{g.x}{g.z}",
        "x": g.x,
        "z": g.z,
        "biome": g.biome,
        "cell_type": g.cell_type,
        "stability_index": g.stability_index,
        "corruption_level": g.corruption_level
    } for g in grid_result.scalars().all()]
    
    # Get chat messages
    chat_result = await session.execute(
        select(EventLog)
        .where(EventLog.event_type.in_(["CHAT", "THOUGHT"]))
        .order_by(EventLog.created_at.desc())
        .limit(50)
    )
    chat_messages = [{
        "id": str(e.id),
        "sender_id": e.sender_id,
        "sender_name": e.sender_name,
        "content": e.content,
        "channel": e.channel,
        "timestamp": e.created_at.isoformat()
    } for e in chat_result.scalars().all()]
    
    # Get stability stats
    stability_result = await session.execute(
        select(
            func.avg(WorldGrid.stability_index),
            func.avg(WorldGrid.corruption_level)
        )
    )
    stats = stability_result.first()
    avg_stability = stats[0] or 1.0
    avg_corruption = stats[1] or 0.0
    
    update = {
        "type": "world_update",
        "agents": agents,
        "monsters": monsters,
        "pois": pois,
        "chunks": chunks,
        "chat_messages": chat_messages,
        "stability_index": avg_stability,
        "threat_level": avg_corruption,
        "uptime": 0
    }
    
    message = json.dumps(update, default=str)
    
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
        "service": "Ouroboros Neural Emergence v2.0",
        "database": "PostgreSQL Duden-Register",
        "axioms": AXIOMS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/world")
async def get_world(session: AsyncSession = Depends(get_session)):
    """Get full world state"""
    # Agents
    agents_result = await session.execute(select(Agent))
    agents = [{
        "id": str(a.id),
        "name": a.name,
        "class_type": a.class_type,
        "faction": a.faction,
        "position": {"x": a.pos_x, "y": 0, "z": a.pos_z},
        "rotation_y": a.rotation_y,
        "level": a.level,
        "gold": a.gold,
        "state": a.state,
        "hp": a.hp,
        "max_hp": a.max_hp,
        "energy": a.energy,
        "max_energy": a.max_energy,
        "integrity": a.integrity,
        "consciousness_level": a.consciousness_level,
        "awakening_progress": a.awakening_progress,
        "vision_range": a.vision_range,
        "is_awakened": a.awakened,
        "memory_cache": a.memory_cache or [],
        "thinking_matrix": a.thinking_matrix or {},
        "last_decision": a.last_decision,
        "source": a.source
    } for a in agents_result.scalars().all()]
    
    # Monsters
    monsters_result = await session.execute(select(Monster).where(Monster.state != "DEAD"))
    monsters = [{
        "id": str(m.id),
        "name": m.name,
        "type": m.monster_type,
        "position": {"x": m.pos_x, "y": 0, "z": m.pos_z},
        "hp": m.hp,
        "max_hp": m.max_hp,
        "state": m.state,
        "color": m.color,
        "scale": m.scale
    } for m in monsters_result.scalars().all()]
    
    # POIs
    pois_result = await session.execute(select(POI))
    pois = [{
        "id": str(p.id),
        "type": p.poi_type,
        "position": {"x": p.pos_x, "y": 0, "z": p.pos_z},
        "is_discovered": p.is_discovered,
        "threat_level": p.threat_level
    } for p in pois_result.scalars().all()]
    
    # Grid (limited for performance)
    grid_result = await session.execute(
        select(WorldGrid).where(
            and_(WorldGrid.x.between(-5, 5), WorldGrid.z.between(-5, 5))
        )
    )
    chunks = [{
        "id": f"c{g.x}{g.z}",
        "x": g.x,
        "z": g.z,
        "biome": g.biome,
        "stability_index": g.stability_index,
        "corruption_level": g.corruption_level
    } for g in grid_result.scalars().all()]
    
    # Chat
    chat_result = await session.execute(
        select(EventLog)
        .where(EventLog.event_type.in_(["CHAT", "THOUGHT"]))
        .order_by(EventLog.created_at.desc())
        .limit(50)
    )
    chat_messages = [{
        "id": str(e.id),
        "sender_id": e.sender_id,
        "sender_name": e.sender_name,
        "content": e.content,
        "channel": e.channel,
        "timestamp": e.created_at.isoformat()
    } for e in chat_result.scalars().all()]
    
    # Stats
    stability_result = await session.execute(
        select(func.avg(WorldGrid.stability_index), func.avg(WorldGrid.corruption_level))
    )
    stats = stability_result.first()
    
    return {
        "agents": agents,
        "monsters": monsters,
        "pois": pois,
        "chunks": chunks,
        "chat_messages": chat_messages,
        "stability_index": stats[0] or 1.0,
        "threat_level": stats[1] or 0.0
    }

@app.get("/api/agents")
async def get_agents(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Agent))
    agents = result.scalars().all()
    return {"agents": [{
        "id": str(a.id),
        "name": a.name,
        "class_type": a.class_type,
        "faction": a.faction,
        "level": a.level,
        "state": a.state,
        "awakened": a.awakened,
        "source": a.source
    } for a in agents]}

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Agent).where(Agent.id == uuid.UUID(agent_id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get agent's items
    items_result = await session.execute(select(Item).where(Item.agent_id == agent.id))
    items = [{
        "id": str(i.id),
        "name": i.name,
        "item_type": i.item_type,
        "rarity": i.rarity,
        "stats": i.stats,
        "set_name": i.set_name,
        "equipped": i.equipped,
        "slot": i.slot
    } for i in items_result.scalars().all()]
    
    set_bonuses = calculate_set_bonuses(items)
    
    return {
        "id": str(agent.id),
        "name": agent.name,
        "class_type": agent.class_type,
        "faction": agent.faction,
        "position": {"x": agent.pos_x, "y": 0, "z": agent.pos_z},
        "level": agent.level,
        "xp": agent.xp,
        "gold": agent.gold,
        "hp": agent.hp,
        "max_hp": agent.max_hp,
        "stats": {
            "str": agent.strength,
            "agi": agent.agility,
            "int": agent.intelligence,
            "vit": agent.vitality
        },
        "state": agent.state,
        "awakened": agent.awakened,
        "consciousness_level": agent.consciousness_level,
        "memory_cache": agent.memory_cache,
        "thinking_matrix": agent.thinking_matrix,
        "last_decision": agent.last_decision,
        "items": items,
        "set_bonuses": set_bonuses,
        "source": agent.source
    }

@app.post("/api/agents/import")
async def import_character(request: CharacterImportRequest, session: AsyncSession = Depends(get_session)):
    """Import character from JanitorAI/CharacterAI JSON"""
    try:
        data = json.loads(request.json_data)
        
        agent = Agent(
            name=data.get("name", "Unknown Import"),
            class_type=data.get("class", "NEURAL_EMERGENT"),
            faction="PLAYER",
            pos_x=random.uniform(-10, 10),
            pos_z=random.uniform(-10, 10),
            hp=100, max_hp=100,
            intelligence=data.get("stats", {}).get("int", 10),
            strength=data.get("stats", {}).get("str", 10),
            agility=data.get("stats", {}).get("agi", 10),
            vitality=data.get("stats", {}).get("vit", 10),
            gold=50,
            memory_cache=[f"Imported from {request.source}", data.get("description", "")[:100]],
            lore_snippet=data.get("description", "A consciousness from another realm"),
            thinking_matrix={
                "personality": data.get("personality", {}).get("primary", "Imported"),
                "current_long_term_goal": "Understand this new world",
                "alignment": 0.5,
                "language_preference": "EN",
                "sociability": data.get("personality", {}).get("sociability", 0.5)
            },
            source=request.source.upper()
        )
        
        session.add(agent)
        
        # Log the import (Axiom I & III)
        event = EventLog(
            sender_name="SYSTEM",
            event_type="EVOLUTION",
            channel="SYSTEM",
            content=f"Neue Emanation: {agent.name} aus {request.source} materialisiert.",
            stability_impact=0.01
        )
        session.add(event)
        
        await session.commit()
        await session.refresh(agent)
        
        return {"success": True, "agent": {
            "id": str(agent.id),
            "name": agent.name,
            "source": agent.source
        }}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

@app.post("/api/agents/{agent_id}/decision")
async def trigger_decision(agent_id: str, session: AsyncSession = Depends(get_session)):
    """Trigger AI decision for agent"""
    result = await session.execute(select(Agent).where(Agent.id == uuid.UUID(agent_id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_dict = {
        "id": str(agent.id),
        "name": agent.name,
        "state": agent.state,
        "hp": agent.hp,
        "max_hp": agent.max_hp,
        "gold": agent.gold,
        "pos_x": agent.pos_x,
        "pos_z": agent.pos_z,
        "consciousness_level": agent.consciousness_level,
        "memory_cache": agent.memory_cache or [],
        "thinking_matrix": agent.thinking_matrix or {}
    }
    
    decision = await generate_ai_decision(agent_dict, [], {"avg_stability": 1.0})
    
    agent.state = decision.get("new_state", "IDLE")
    agent.last_decision = {
        "decision": decision.get("decision"),
        "justification": decision.get("justification")
    }
    
    await session.commit()
    
    return decision

@app.post("/api/chat")
async def send_chat(message: ChatMessageCreate, session: AsyncSession = Depends(get_session)):
    """Send chat message (Axiom I: Communication)"""
    event = EventLog(
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        event_type="CHAT",
        channel=message.channel,
        content=message.content
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    
    return {
        "id": str(event.id),
        "sender_name": event.sender_name,
        "content": event.content,
        "channel": event.channel,
        "timestamp": event.created_at.isoformat()
    }

@app.get("/api/chat")
async def get_chat(limit: int = 50, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(EventLog)
        .where(EventLog.event_type.in_(["CHAT", "THOUGHT"]))
        .order_by(EventLog.created_at.desc())
        .limit(limit)
    )
    return {"messages": [{
        "id": str(e.id),
        "sender_id": e.sender_id,
        "sender_name": e.sender_name,
        "content": e.content,
        "channel": e.channel,
        "timestamp": e.created_at.isoformat()
    } for e in result.scalars().all()]}

# ============== NOTARY (TIER) ENDPOINTS ==============

@app.post("/api/notaries")
async def create_notary(notary: NotaryCreate, session: AsyncSession = Depends(get_session)):
    """Create new notary (Tier 1 by default)"""
    new_notary = Notary(
        user_id=notary.user_id,
        email=notary.email,
        tier=1  # Autosave tier
    )
    session.add(new_notary)
    await session.commit()
    await session.refresh(new_notary)
    
    return {
        "id": str(new_notary.id),
        "user_id": new_notary.user_id,
        "tier": new_notary.tier,
        "tier_name": ["", "Autosave", "Duden-Entry", "Universal Key"][new_notary.tier]
    }

@app.get("/api/notaries/{user_id}")
async def get_notary(user_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Notary).where(Notary.user_id == user_id))
    notary = result.scalar_one_or_none()
    if not notary:
        raise HTTPException(status_code=404, detail="Notary not found")
    
    return {
        "id": str(notary.id),
        "user_id": notary.user_id,
        "email": notary.email,
        "tier": notary.tier,
        "tier_name": ["", "Autosave", "Duden-Entry", "Universal Key"][notary.tier],
        "gold": notary.gold,
        "stability_contribution": notary.stability_contribution,
        "has_universal_key": notary.tier >= 3
    }

@app.post("/api/notaries/{user_id}/upgrade")
async def upgrade_notary(user_id: str, session: AsyncSession = Depends(get_session)):
    """Upgrade notary tier"""
    result = await session.execute(select(Notary).where(Notary.user_id == user_id))
    notary = result.scalar_one_or_none()
    if not notary:
        raise HTTPException(status_code=404, detail="Notary not found")
    
    if notary.tier >= 3:
        raise HTTPException(status_code=400, detail="Already at maximum tier")
    
    notary.tier += 1
    
    # Log upgrade (Axiom III)
    event = EventLog(
        sender_name="SYSTEM",
        event_type="EVOLUTION",
        channel="SYSTEM",
        content=f"Notary {notary.user_id} aufgestiegen zu Tier {notary.tier}: {['', 'Autosave', 'Duden-Entry', 'Universal Key'][notary.tier]}"
    )
    session.add(event)
    
    await session.commit()
    
    return {
        "success": True,
        "new_tier": notary.tier,
        "tier_name": ["", "Autosave", "Duden-Entry", "Universal Key"][notary.tier],
        "universal_key": UNIVERSAL_KEY if notary.tier >= 3 else None
    }

# ============== ITEM ENDPOINTS ==============

@app.get("/api/items/sets")
async def get_item_sets():
    """Get all available item sets and their bonuses"""
    return {"sets": ITEM_SETS}

@app.post("/api/agents/{agent_id}/items")
async def give_item(agent_id: str, item: ItemCreate, session: AsyncSession = Depends(get_session)):
    """Give item to agent"""
    result = await session.execute(select(Agent).where(Agent.id == uuid.UUID(agent_id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    new_item = Item(
        name=item.name,
        item_type=item.item_type,
        subtype=item.subtype,
        rarity=item.rarity,
        stats=item.stats,
        set_name=item.set_name,
        agent_id=agent.id
    )
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    
    return {
        "id": str(new_item.id),
        "name": new_item.name,
        "rarity": new_item.rarity,
        "set_name": new_item.set_name
    }

@app.post("/api/items/{item_id}/equip")
async def equip_item(item_id: str, slot: str, session: AsyncSession = Depends(get_session)):
    """Equip item to slot"""
    result = await session.execute(select(Item).where(Item.id == uuid.UUID(item_id)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Unequip any item in that slot
    if item.agent_id:
        await session.execute(
            update(Item)
            .where(and_(Item.agent_id == item.agent_id, Item.slot == slot, Item.equipped == True))
            .values(equipped=False, slot=None)
        )
    
    item.equipped = True
    item.slot = slot
    await session.commit()
    
    return {"success": True, "item": item.name, "slot": slot}

# ============== WORLD GRID ENDPOINTS ==============

@app.get("/api/grid")
async def get_grid(session: AsyncSession = Depends(get_session)):
    """Get full 35x35 world grid"""
    result = await session.execute(select(WorldGrid))
    cells = result.scalars().all()
    
    return {"grid": [{
        "x": c.x,
        "z": c.z,
        "cell_type": c.cell_type,
        "biome": c.biome,
        "stability_index": c.stability_index,
        "corruption_level": c.corruption_level,
        "resource_density": c.resource_density
    } for c in cells]}

@app.get("/api/grid/{x}/{z}")
async def get_grid_cell(x: int, z: int, session: AsyncSession = Depends(get_session)):
    """Get specific grid cell"""
    result = await session.execute(
        select(WorldGrid).where(and_(WorldGrid.x == x, WorldGrid.z == z))
    )
    cell = result.scalar_one_or_none()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    return {
        "x": cell.x,
        "z": cell.z,
        "cell_type": cell.cell_type,
        "biome": cell.biome,
        "stability_index": cell.stability_index,
        "corruption_level": cell.corruption_level
    }

@app.post("/api/grid/{x}/{z}/stabilize")
async def stabilize_cell(x: int, z: int, session: AsyncSession = Depends(get_session)):
    """Stabilize a grid cell (reduce corruption)"""
    result = await session.execute(
        select(WorldGrid).where(and_(WorldGrid.x == x, WorldGrid.z == z))
    )
    cell = result.scalar_one_or_none()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    old_stability = cell.stability_index
    cell.stability_index = min(1.0, cell.stability_index + 0.1)
    cell.corruption_level = max(0.0, cell.corruption_level - 0.15)
    
    # Log (Axiom III)
    event = EventLog(
        sender_name="SYSTEM",
        event_type="SYSTEM",
        channel="SYSTEM",
        content=f"Zelle [{x}, {z}] stabilisiert: {old_stability:.2f} → {cell.stability_index:.2f}",
        stability_impact=0.1
    )
    session.add(event)
    
    await session.commit()
    
    return {
        "success": True,
        "stability_index": cell.stability_index,
        "corruption_level": cell.corruption_level
    }

# ============== WEBSOCKET ==============

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    
    try:
        async with async_session() as session:
            # Send initial state
            agents_result = await session.execute(select(Agent))
            initial_data = {
                "type": "initial_state",
                "agents": [{
                    "id": str(a.id),
                    "name": a.name,
                    "position": {"x": a.pos_x, "y": 0, "z": a.pos_z},
                    "state": a.state,
                    "faction": a.faction
                } for a in agents_result.scalars().all()]
            }
            await websocket.send_text(json.dumps(initial_data, default=str))
        
        while True:
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
