"""
Ouroboros: Neural Emergence - MMORPG Simulation Backend v2.1
PostgreSQL Duden-Register + Google Drive Integration
Axiom III: Punctuation - Kausalitätssicherung durch chronologische Erfassung
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

# Google OAuth Config
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
# Default to current host if not set
GOOGLE_DRIVE_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "")
FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000") # Actually backend URL for preview, frontend usually 3000

# Convert to asyncpg format
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Global state
engine = None
async_session = None
websocket_connections: List[WebSocket] = []
Base = declarative_base()
logger = logging.getLogger("ouroboros")
logging.basicConfig(level=logging.INFO)

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
    user_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=True)
    tier = Column(Integer, default=1)  # 1: Autosave, 2: Duden-Entry, 3: Universal Key
    gold = Column(BigInteger, default=1000)
    stability_contribution = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    agents = relationship("Agent", back_populates="owner")
    items = relationship("Item", back_populates="notary")

class DriveCredentials(Base):
    """Google Drive OAuth Credentials"""
    __tablename__ = "drive_credentials"
    
    user_id = Column(String, primary_key=True) # Linked to Notary user_id
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_uri = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    scopes = Column(JSON, nullable=False)
    expiry = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

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
    """Das 35x35 Spielfeld - Axiom II: Erosion"""
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
    """Digitale DNA - Axiom V: Duality"""
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
    """Der globale Lore-Stream - Axiom I: Communication"""
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
    """Archivierung für Thomas & Petra"""
    __tablename__ = "research_leads"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    thought_content = Column(Text, nullable=True)
    drive_file_id = Column(String, nullable=True)
    axiom_validation = Column(String, default="ARE-LOGIC-v5")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Monster(Base):
    """Invasion entities for corruption events"""
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
    """Points of Interest"""
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

# ============== ITEM TEMPLATES ==============
# (Abbreviated for brevity - keeping logic same)
ITEM_SETS = {
    "Dragonscale": {"items": ["Helm", "Plate"], "bonuses": {2: {"defense": 15}}},
    "Voidweaver": {"items": ["Robe", "Staff"], "bonuses": {2: {"intelligence": 10}}},
    "Axiom Guardian": {"items": ["Shield", "Helm"], "bonuses": {2: {"stability_bonus": 0.1}}}
}

MONSTER_TEMPLATES = {
    "SLIME": {"name": "Void Slime", "hp": 30, "atk": 3, "defense": 1, "xp_reward": 15, "color": "#22c55e", "scale": 0.5},
    "GOBLIN": {"name": "Scavenger Goblin", "hp": 60, "atk": 8, "defense": 3, "xp_reward": 40, "color": "#84cc16", "scale": 0.8},
    "ORC": {"name": "Axiom Orc", "hp": 150, "atk": 18, "defense": 10, "xp_reward": 120, "color": "#166534", "scale": 1.3},
    "DRAGON": {"name": "Data Drake", "hp": 800, "atk": 55, "defense": 40, "xp_reward": 1500, "color": "#ef4444", "scale": 3.5},
    "CORRUPTION_SPAWN": {"name": "Corruption Spawn", "hp": 45, "atk": 12, "defense": 2, "xp_reward": 30, "color": "#7c3aed", "scale": 0.7}
}

LORE_POOL = ["Die Matrix...", "Ein flüsterndes Signal...", "Das Duden-Register bewahrt..."]

# ============== DATABASE FUNCTIONS ==============

async def init_db():
    """Initialize database and create tables"""
    global engine, async_session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Init Grid
        result = await session.execute(select(func.count()).select_from(WorldGrid))
        if result.scalar() == 0:
            await initialize_world_grid(session)
        # Init Agents
        result = await session.execute(select(func.count()).select_from(Agent))
        if result.scalar() == 0:
            await initialize_default_agents(session)
        await session.commit()

async def initialize_world_grid(session: AsyncSession):
    for x in range(-17, 18):
        for z in range(-17, 18):
            if x == 0 and z == 0:
                biome, cell, stability = "CITY", "SANCTUARY", 1.0
            elif abs(x) <= 2 and abs(z) <= 2:
                biome, cell, stability = "CITY", "SAFE_ZONE", 0.95
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

# ============== GOOGLE DRIVE UTILS ==============

async def get_drive_service(user_id: str, session: AsyncSession):
    """Get authenticated Drive service"""
    # 1. Check DB for credentials
    result = await session.execute(select(DriveCredentials).where(DriveCredentials.user_id == user_id))
    creds_db = result.scalar_one_or_none()
    
    if not creds_db:
        # Fallback: If Universal Key is active, maybe we can use a Service Account? 
        # But for now, user needs to auth.
        return None
    
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
            # Update DB
            creds_db.access_token = creds.token
            creds_db.expiry = creds.expiry
            await session.commit()
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None
            
    return build('drive', 'v3', credentials=creds)

async def upload_log_to_drive(title: str, content: str, user_id: str, session: AsyncSession):
    """Upload content to specific Drive folder"""
    service = await get_drive_service(user_id, session)
    if not service:
        logger.warning(f"No Drive service for user {user_id}")
        return False
    
    try:
        import io
        from googleapiclient.http import MediaIoBaseUpload
        
        file_metadata = {
            'name': f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            'parents': [RESEARCH_LEADS_FOLDER_ID]
        }
        
        fh = io.BytesIO(content.encode('utf-8'))
        media = MediaIoBaseUpload(fh, mimetype='text/plain')
        
        # Run sync call in thread
        loop = asyncio.get_event_loop()
        file = await loop.run_in_executor(
            None, 
            lambda: service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        )
        
        logger.info(f"File ID: {file.get('id')}")
        return file.get('id')
        
    except Exception as e:
        logger.error(f"Drive upload failed: {e}")
        return False

# ============== AI & LOGIC ==============

async def generate_ai_decision(agent_dict: Dict, nearby: List[Dict], world_state: Dict) -> Dict:
    if not EMERGENT_LLM_KEY:
        return {"decision": "IDLE", "justification": "No Neural Key", "new_state": "IDLE"}
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"agent_{agent_dict['id']}",
            system_message="Du bist Ouroboros Axiom Engine."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        resp = await chat.send_message(UserMessage(text=f"Agent {agent_dict['name']}: Entscheide Status (JSON)."))
        return json.loads(resp)
    except:
        return {"decision": "IDLE", "justification": "Neural Error", "new_state": "IDLE"}

# ============== LIFESPAN & APP ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(simulation_loop())
    yield

app = FastAPI(title="Ouroboros v2.1", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ============== API ENDPOINTS ==============

@app.get("/api/health")
async def health():
    return {"status": "healthy", "db": "PostgreSQL", "drive": "integrated"}

# --- DRIVE OAUTH ---
@app.get("/api/oauth/drive/connect")
async def connect_drive(user_id: str = Query(...)):
    """Start OAuth flow for user"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Server misconfigured (Missing Client ID/Secret)")
    
    redirect_uri = GOOGLE_DRIVE_REDIRECT_URI or f"{str(Request.base_url)}api/oauth/drive/callback"
    if "localhost" in redirect_uri: # Fix for container env
         redirect_uri = redirect_uri.replace("localhost:8001", "localhost:3000/api") # Placeholder logic if needed
    
    # Use the one from ENV or construct from Host
    # For Emergent, we usually need the external URL
    if not GOOGLE_DRIVE_REDIRECT_URI and "emergentagent.com" in FRONTEND_URL:
         redirect_uri = f"{FRONTEND_URL}/api/oauth/drive/callback"

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        },
        scopes=['https://www.googleapis.com/auth/drive.file'],
        redirect_uri=redirect_uri
    )
    
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=user_id
    )
    
    return {"authorization_url": auth_url}

@app.get("/api/oauth/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...), session: AsyncSession = Depends(get_session)):
    """Handle OAuth Callback"""
    try:
        redirect_uri = GOOGLE_DRIVE_REDIRECT_URI or f"{FRONTEND_URL}/api/oauth/drive/callback"
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=None,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        # Save to DB
        db_creds = DriveCredentials(
            user_id=state,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_uri=creds.token_uri,
            client_id=creds.client_id,
            client_secret=creds.client_secret,
            scopes=creds.scopes,
            expiry=creds.expiry
        )
        # Upsert logic
        await session.merge(db_creds)
        await session.commit()
        
        return RedirectResponse(url=f"{FRONTEND_URL}?drive_connected=true")
        
    except Exception as e:
        logger.error(f"OAuth Error: {e}")
        return {"error": str(e)}

@app.post("/api/research/upload")
async def manual_upload(
    user_id: str, 
    content: str, 
    title: str = "Research Log", 
    session: AsyncSession = Depends(get_session)
):
    """Trigger manual upload to Drive"""
    file_id = await upload_log_to_drive(title, content, user_id, session)
    if file_id:
        return {"success": True, "file_id": file_id}
    return {"success": False, "error": "Check logs or auth"}

# --- WORLD API ---
@app.get("/api/game_state")
async def get_game_state(session: AsyncSession = Depends(get_session)):
    """Full state for Frontend"""
    agents = (await session.execute(select(Agent))).scalars().all()
    monsters = (await session.execute(select(Monster))).scalars().all()
    pois = (await session.execute(select(POI))).scalars().all()
    # chunks limit
    chunks = (await session.execute(select(WorldGrid).limit(100))).scalars().all()
    
    return {
        "agents": [{"id": str(a.id), "name": a.name, "pos_x": a.pos_x, "pos_z": a.pos_z, "state": a.state, "awakened": a.awakened} for a in agents],
        "monsters": [{"id": str(m.id), "name": m.name, "pos_x": m.pos_x, "pos_z": m.pos_z, "hp": m.hp, "max_hp": m.max_hp} for m in monsters],
        "pois": [{"id": str(p.id), "type": p.poi_type, "pos_x": p.pos_x, "pos_z": p.pos_z} for p in pois],
        "chunks": [{"x": c.x, "z": c.z, "biome": c.biome, "cell_type": c.cell_type, "corruption": c.corruption_level} for c in chunks],
        "stability_index": 1.0, # Placeholder
        "uptime": 0
    }

@app.get("/api/world")
async def get_world_legacy(session: AsyncSession = Depends(get_session)):
    return await get_game_state(session)

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Simple Echo/Ping
            if "ping" in data:
                await websocket.send_text(json.dumps({"type": "pong"}))
    except:
        websocket_connections.remove(websocket)

# --- SIMULATION ---
async def simulation_loop():
    while True:
        try:
            await asyncio.sleep(5)
            # Add simple periodic updates if needed
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
