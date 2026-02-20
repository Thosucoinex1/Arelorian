"""
Ouroboros: Neural Emergence - MMORPG Simulation Backend v2.2
PostgreSQL Duden-Register + Google Drive Integration (Restored Gameplay Logic)
"""

import os
import json
import asyncio
import random
import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, func, select, update, delete, and_, or_
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Google Drive Imports
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

load_dotenv()

# ============== CONFIGURATION ==============
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ouroboros_db")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
UNIVERSAL_KEY = os.environ.get("UNIVERSAL_KEY", "GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I")
RESEARCH_LEADS_FOLDER_ID = os.environ.get("RESEARCH_LEADS_FOLDER_ID", "1OvGU-bMY4bXDCaq7LiIgG6XaP3_Iif1N")

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_DRIVE_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "")
FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Global state
engine = None
async_session = None
websocket_connections: List[WebSocket] = []
Base = declarative_base()
logger = logging.getLogger("ouroboros")
logging.basicConfig(level=logging.INFO)

# ============== SQLALCHEMY MODELS ==============

class Notary(Base):
    __tablename__ = "notaries"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=True)
    tier = Column(Integer, default=1)
    gold = Column(BigInteger, default=1000)
    stability_contribution = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    agents = relationship("Agent", back_populates="owner")
    items = relationship("Item", back_populates="notary")

class DriveCredentials(Base):
    __tablename__ = "drive_credentials"
    user_id = Column(String, primary_key=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_uri = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    scopes = Column(JSON, nullable=False)
    expiry = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

class Agent(Base):
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
    memory_cache = Column(JSON, default=list)
    thinking_matrix = Column(JSON, default=dict)
    economic_desires = Column(JSON, default=dict)
    last_decision = Column(JSON, nullable=True)
    emergent_behavior_log = Column(JSON, default=list)
    source = Column(String, default="SYSTEM")
    lore_snippet = Column(Text, nullable=True)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    last_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("Notary", back_populates="agents")
    items = relationship("Item", back_populates="agent")

class WorldGrid(Base):
    __tablename__ = "world_grid"
    x = Column(Integer, primary_key=True)
    z = Column(Integer, primary_key=True)
    cell_type = Column(String, default="WILDERNESS")
    biome = Column(String, default="PLAINS")
    stability_index = Column(Float, default=1.0)
    corruption_level = Column(Float, default=0.0)
    resource_density = Column(Float, default=1.0)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    last_invasion = Column(DateTime(timezone=True), nullable=True)

class Item(Base):
    __tablename__ = "items"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)
    subtype = Column(String, nullable=True)
    rarity = Column(String, default="COMMON")
    stats = Column(JSON, default=dict)
    set_name = Column(String, nullable=True)
    set_bonus = Column(JSON, nullable=True)
    corruption = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    equipped = Column(Boolean, default=False)
    slot = Column(String, nullable=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    notary_id = Column(PGUUID(as_uuid=True), ForeignKey("notaries.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    agent = relationship("Agent", back_populates="items")
    notary = relationship("Notary", back_populates="items")

class EventLog(Base):
    __tablename__ = "event_logs"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    event_type = Column(String, default="CHAT")
    channel = Column(String, default="GLOBAL")
    content = Column(Text, nullable=False)
    stability_impact = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ResearchLead(Base):
    __tablename__ = "research_leads"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    thought_content = Column(Text, nullable=True)
    drive_file_id = Column(String, nullable=True)
    axiom_validation = Column(String, default="ARE-LOGIC-v5")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Monster(Base):
    __tablename__ = "monsters"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    monster_type = Column(String, nullable=False)
    pos_x = Column(Float, default=0)
    pos_z = Column(Float, default=0)
    hp = Column(Integer, default=30)
    max_hp = Column(Integer, default=30)
    atk = Column(Integer, default=3)
    defense = Column(Integer, default=1)
    xp_reward = Column(Integer, default=15)
    state = Column(String, default="IDLE")
    color = Column(String, default="#22c55e")
    scale = Column(Float, default=1.0)
    spawned_from_corruption = Column(Boolean, default=False)
    target_id = Column(PGUUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class POI(Base):
    __tablename__ = "pois"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poi_type = Column(String, nullable=False)
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

# ============== CONSTANTS ==============
ITEM_SETS = {
    "Dragonscale": {"items": ["Dragonscale Helm", "Dragonscale Plate"], "bonuses": {2: {"defense": 15}}},
    "Voidweaver": {"items": ["Voidweaver Crown", "Voidweaver Robe"], "bonuses": {2: {"intelligence": 10}}},
}
MONSTER_TEMPLATES = {
    "SLIME": {"name": "Void Slime", "hp": 30, "atk": 3, "defense": 1, "xp_reward": 15, "color": "#22c55e", "scale": 0.5},
    "GOBLIN": {"name": "Scavenger Goblin", "hp": 60, "atk": 8, "defense": 3, "xp_reward": 40, "color": "#84cc16", "scale": 0.8},
    "CORRUPTION_SPAWN": {"name": "Corruption Spawn", "hp": 45, "atk": 12, "defense": 2, "xp_reward": 30, "color": "#7c3aed", "scale": 0.7}
}
LORE_POOL = ["Die Matrix...", "Ein flüsterndes Signal..."]

# ============== DB & DRIVE ==============

async def init_db():
    global engine, async_session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        if (await session.execute(select(func.count()).select_from(WorldGrid))).scalar() == 0:
            await initialize_world_grid(session)
        if (await session.execute(select(func.count()).select_from(Agent))).scalar() == 0:
            await initialize_default_agents(session)
        await session.commit()

async def initialize_world_grid(session: AsyncSession):
    for x in range(-17, 18):
        for z in range(-17, 18):
            if x == 0 and z == 0: biome, cell, stability = "CITY", "SANCTUARY", 1.0
            elif abs(x) <= 2 and abs(z) <= 2: biome, cell, stability = "CITY", "SAFE_ZONE", 0.95
            else:
                val = abs(math.sin(x * 12.9 + z * 78.2) * 43758.5) % 1
                biome = "FOREST" if val < 0.35 else "MOUNTAIN" if val < 0.6 else "PLAINS"
                cell, stability = "WILDERNESS", 0.7 + random.random() * 0.2
            session.add(WorldGrid(x=x, z=z, cell_type=cell, biome=biome, stability_index=stability))

async def initialize_default_agents(session: AsyncSession):
    agents = [
        Agent(name="Aurelius", class_type="Scribe", pos_x=0, pos_z=0, awakened=True, consciousness_level=0.1, memory_cache=["Erwacht"]),
        Agent(name="Vulcan", class_type="Blacksmith", pos_x=-5, pos_z=5, awakened=False, gold=50)
    ]
    for a in agents: session.add(a)

async def get_session():
    async with async_session() as session:
        yield session

async def get_drive_service(user_id: str, session: AsyncSession):
    result = await session.execute(select(DriveCredentials).where(DriveCredentials.user_id == user_id))
    creds_db = result.scalar_one_or_none()
    if not creds_db: return None
    
    creds = Credentials(
        token=creds_db.access_token,
        refresh_token=creds_db.refresh_token,
        token_uri=creds_db.token_uri,
        client_id=creds_db.client_id,
        client_secret=creds_db.client_secret,
        scopes=creds_db.scopes
    )
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            creds_db.access_token = creds.token
            creds_db.expiry = creds.expiry
            await session.commit()
        except Exception: return None
    return build('drive', 'v3', credentials=creds)

async def upload_log_to_drive(title: str, content: str, user_id: str, session: AsyncSession):
    service = await get_drive_service(user_id, session)
    if not service: return False
    try:
        import io
        file_metadata = {'name': f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt", 'parents': [RESEARCH_LEADS_FOLDER_ID]}
        media = MediaIoBaseUpload(io.BytesIO(content.encode('utf-8')), mimetype='text/plain')
        loop = asyncio.get_event_loop()
        file = await loop.run_in_executor(None, lambda: service.files().create(body=file_metadata, media_body=media, fields='id').execute())
        return file.get('id')
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return False

# ============== LOGIC ==============

async def update_stability(session: AsyncSession):
    cells = (await session.execute(select(WorldGrid))).scalars().all()
    for cell in cells:
        if cell.cell_type == "SANCTUARY":
            cell.stability_index = 1.0; cell.corruption_level = 0.0
            continue
        if cell.stability_index > 0.3: cell.stability_index -= 0.001
        if cell.corruption_level < 1.0: cell.corruption_level = min(1.0, cell.corruption_level + 0.002 * (1.0 - cell.stability_index))

async def check_corruption_invasion(session: AsyncSession):
    result = await session.execute(select(WorldGrid).where(and_(
        WorldGrid.corruption_level > 0.7, WorldGrid.x.between(-5, 5), WorldGrid.z.between(-5, 5),
        or_(WorldGrid.last_invasion == None, WorldGrid.last_invasion < func.now() - func.cast('1 hour', func.literal_column("interval")))
    )))
    spawned = []
    for cell in result.scalars().all():
        monster = Monster(name="Corruption Spawn", monster_type="CORRUPTION_SPAWN", pos_x=cell.x*80, pos_z=cell.z*80, spawned_from_corruption=True)
        session.add(monster)
        spawned.append(monster)
        cell.last_invasion = datetime.now(timezone.utc)
        session.add(EventLog(sender_name="SYSTEM", content=f"Invasion at [{cell.x}, {cell.z}]", stability_impact=-0.05))
    return spawned

async def generate_ai_decision(agent_dict: Dict, nearby: List[Dict], world_state: Dict) -> Dict:
    if not EMERGENT_LLM_KEY: return {"decision": "IDLE", "justification": "No Key", "new_state": "IDLE"}
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"agent_{agent_dict['id']}", system_message="Ouroboros Engine").with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=f"Agent {agent_dict['name']} status? (JSON)"))
        return json.loads(resp)
    except: return {"decision": "THINKING", "justification": "Error", "new_state": "THINKING"}

async def broadcast_world_update(session: AsyncSession):
    if not websocket_connections: return
    agents = [{"id": str(a.id), "name": a.name, "pos_x": a.pos_x, "pos_z": a.pos_z, "state": a.state, "awakened": a.awakened} for a in (await session.execute(select(Agent))).scalars().all()]
    monsters = [{"id": str(m.id), "name": m.name, "pos_x": m.pos_x, "pos_z": m.pos_z, "hp": m.hp} for m in (await session.execute(select(Monster).where(Monster.state != "DEAD"))).scalars().all()]
    update = {"type": "world_update", "agents": agents, "monsters": monsters, "stability_index": 1.0}
    msg = json.dumps(update, default=str)
    for ws in websocket_connections:
        try: await ws.send_text(msg)
        except: pass

async def simulation_loop():
    last_stability, last_cognition = 0, 0
    while True:
        try:
            now = asyncio.get_event_loop().time()
            async with async_session() as session:
                if now - last_stability > 30:
                    last_stability = now
                    await update_stability(session)
                    await check_corruption_invasion(session)
                if now - last_cognition > 8:
                    last_cognition = now
                    agents = (await session.execute(select(Agent).where(Agent.faction != "SYSTEM"))).scalars().all()
                    for agent in agents:
                        # Simple AI loop
                        decision = await generate_ai_decision({"id": str(agent.id), "name": agent.name}, [], {})
                        agent.state = decision.get("new_state", "IDLE")
                    await session.commit()
                    await broadcast_world_update(session)
        except Exception as e:
            print(f"Sim Error: {e}")
        await asyncio.sleep(2)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(simulation_loop())
    yield

app = FastAPI(title="Ouroboros", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ============== API ==============

@app.get("/api/health")
async def health(): return {"status": "healthy"}

@app.get("/api/oauth/drive/connect")
async def connect_drive(user_id: str = Query(...)):
    if not GOOGLE_CLIENT_ID: raise HTTPException(500, "Missing Google Client ID")
    redirect_uri = GOOGLE_DRIVE_REDIRECT_URI or f"{FRONTEND_URL}/api/oauth/drive/callback"
    flow = Flow.from_client_config(
        {"web": {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}},
        scopes=['https://www.googleapis.com/auth/drive.file'], redirect_uri=redirect_uri)
    url, state = flow.authorization_url(access_type='offline', prompt='consent', state=user_id)
    return {"authorization_url": url}

@app.get("/api/oauth/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...), session: AsyncSession = Depends(get_session)):
    redirect_uri = GOOGLE_DRIVE_REDIRECT_URI or f"{FRONTEND_URL}/api/oauth/drive/callback"
    flow = Flow.from_client_config(
        {"web": {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}},
        scopes=None, redirect_uri=redirect_uri)
    flow.fetch_token(code=code)
    creds = flow.credentials
    await session.merge(DriveCredentials(user_id=state, access_token=creds.token, refresh_token=creds.refresh_token, token_uri=creds.token_uri, client_id=creds.client_id, client_secret=creds.client_secret, scopes=creds.scopes, expiry=creds.expiry))
    await session.commit()
    return RedirectResponse(url=f"{FRONTEND_URL}?drive_connected=true")

@app.get("/api/game_state")
async def get_game_state(session: AsyncSession = Depends(get_session)):
    agents = (await session.execute(select(Agent))).scalars().all()
    monsters = (await session.execute(select(Monster))).scalars().all()
    pois = (await session.execute(select(POI))).scalars().all()
    chunks = (await session.execute(select(WorldGrid).limit(100))).scalars().all()
    return {"agents": [{"id": str(a.id), "name": a.name, "pos_x": a.pos_x, "pos_z": a.pos_z, "state": a.state} for a in agents],
            "monsters": [{"id": str(m.id), "name": m.name, "pos_x": m.pos_x, "pos_z": m.pos_z, "hp": m.hp} for m in monsters],
            "pois": [{"id": str(p.id), "type": p.poi_type, "pos_x": p.pos_x, "pos_z": p.pos_z} for p in pois],
            "chunks": [{"x": c.x, "z": c.z, "biome": c.biome, "cell_type": c.cell_type} for c in chunks]}

@app.get("/api/world")
async def get_world_legacy(session: AsyncSession = Depends(get_session)): return await get_game_state(session)

@app.get("/api/agents/import") # Placeholder
async def import_stub(): return {}

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if "ping" in data: await websocket.send_text(json.dumps({"type": "pong"}))
    except: websocket_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
