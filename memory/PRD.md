# Ouroboros: Neural Emergence - PRD v2.0

## Original Problem Statement
Autonomous agent MMORPG simulation where agents imported from JanitorAI and CharacterAI can live, interact, and evolve in a procedurally generated world. Integration with PostgreSQL Duden-Register for causal tracking (Axiom III).

## User Choices
- **Priority**: World simulation & agent interactions
- **AI Provider**: Gemini 3 Flash (via Emergent LLM key)
- **Character Import**: JSON/file upload from JanitorAI/CharacterAI exports
- **Database**: Full PostgreSQL migration (Duden-Register)
- **Deployment**: Emergent platform first, AWS later

## Architecture v2.0

### Backend (FastAPI + PostgreSQL + SQLAlchemy Async)
- **PostgreSQL Duden-Register** with asyncpg for async operations
- **35x35 World Grid** with stability/corruption tracking
- **Tier System**: Notary tiers (Autosave → Duden-Entry → Universal Key)
- **Item System**: Rarity + Set Bonuses (Dragonscale, Voidweaver, Axiom Guardian)
- **Corruption Invasion**: Auto-spawn monsters when corruption > 70%
- **Gemini 3 Flash** for autonomous agent decisions

### Frontend (React + Canvas 2D + Zustand)
- Real-time 2D world visualization
- Agent HUD with stats and AI decision display
- Chat console with multi-channel support
- Neural terminal for system commands
- Character importer for JanitorAI/CharacterAI
- Tier System panel

## The 5 Axioms

| Axiom | Name | Implementation |
|-------|------|----------------|
| I | Communication | All agent thoughts via visible chat stream |
| II | Erosion | Stability degrades, corruption spreads |
| III | Punctuation | PostgreSQL timestamps every change |
| IV | Recursion | Memory cache persists across sessions |
| V | Duality | Items have power AND corruption factor |

## Database Schema (PostgreSQL)

```sql
-- notaries: Human players with Firebase UID and tier system
-- agents: AI entities with memory_cache JSONB
-- world_grid: 35x35 cells with stability/corruption
-- items: Equipment with rarity and set bonuses
-- event_logs: Global lore stream
-- research_leads: Google Drive archive links
-- monsters: Spawnable enemies
-- pois: Points of Interest
```

## What's Been Implemented (Feb 20, 2026)

### Phase 1 (MongoDB - Completed)
- ✅ Basic world simulation
- ✅ Agent AI with Gemini 3 Flash
- ✅ WebSocket real-time updates
- ✅ Character import

### Phase 2 (PostgreSQL Migration - Completed)
- ✅ Full SQLAlchemy async migration
- ✅ 35x35 World Grid (1225 cells)
- ✅ Tier System (1: Autosave, 2: Duden-Entry, 3: Universal Key)
- ✅ Item System with Set Bonuses
- ✅ Corruption tracking with auto-invasion
- ✅ Stability erosion mechanics
- ✅ POI discovery system
- ✅ Monster spawning

## API Endpoints v2.0

### Core
- `GET /api/health` - System health + Axioms + DB type
- `GET /api/world` - Full world state
- `WS /api/ws` - WebSocket for real-time updates

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Agent with items and set bonuses
- `POST /api/agents/import` - Import from JSON
- `POST /api/agents/{id}/decision` - Trigger AI decision
- `POST /api/agents/{id}/items` - Give item to agent

### Notaries (Tier System)
- `POST /api/notaries` - Create notary (Tier 1)
- `GET /api/notaries/{user_id}` - Get notary info
- `POST /api/notaries/{user_id}/upgrade` - Upgrade tier

### Items
- `GET /api/items/sets` - All set definitions
- `POST /api/items/{id}/equip` - Equip item to slot

### World Grid
- `GET /api/grid` - Full 35x35 grid
- `GET /api/grid/{x}/{z}` - Specific cell
- `POST /api/grid/{x}/{z}/stabilize` - Reduce corruption

### Chat
- `POST /api/chat` - Send message
- `GET /api/chat` - Get history

## Item Sets

| Set Name | Pieces | 2-Piece Bonus | Full Set Bonus |
|----------|--------|---------------|----------------|
| Dragonscale | 3 | +15 Defense, +20 Fire Resist | Dragon's Fury - 10% fire breath |
| Voidweaver | 4 | +10 INT, +50 Mana | Void Pulse - AoE on crit |
| Axiom Guardian | 4 | +0.1 Stability, +5 Integrity | Immune to corruption |

## Backlog / Future Features

### P0 (Critical)
- [ ] Firebase Auth integration for notary user_id
- [ ] Google Drive API for research_leads archival

### P1 (High)
- [ ] Combat system with damage calculations
- [ ] Crafting system at Forge POI
- [ ] Banking system at Bank Vault
- [ ] Resource gathering mechanics

### P2 (Medium)
- [ ] AWS WebSocket mesh for multi-server
- [ ] 3D rendering (Three.js) - React version issue
- [ ] Mobile-optimized UI
- [ ] Alliance/guild formation

### P3 (Low)
- [ ] PayPal integration for tier purchases
- [ ] Leaderboards
- [ ] Achievement system

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy Async, asyncpg, PostgreSQL
- **Frontend**: React 18, Zustand, Canvas 2D, Lucide Icons
- **AI**: Gemini 3 Flash via Emergent LLM Key
- **Infrastructure**: Emergent Platform (preview)

## Environment Variables
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ouroboros_db
EMERGENT_LLM_KEY=sk-emergent-...
UNIVERSAL_KEY=GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I
RESEARCH_LEADS_FOLDER_ID=1OvGU-bMY4bXDCaq7LiIgG6XaP3_Iif1N
```

## Next Tasks
1. Implement combat damage formula
2. Add resource nodes to POIs
3. Create crafting recipes for Vulcan's Forge
4. Firebase Auth for production notary system
5. Google Drive integration for research archive
