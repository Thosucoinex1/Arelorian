# Ouroboros: Neural Emergence - PRD

## Original Problem Statement
Autonomous agent MMORPG simulation where agents imported from JanitorAI and CharacterAI can live, interact, and evolve in a procedurally generated world. Integration with Gemini 3 Flash for autonomous decision-making and emergent behavior.

## User Choices
- **Priority**: World simulation & agent interactions
- **AI Provider**: Gemini 3 Flash (via Emergent LLM key)
- **Character Import**: JSON/file upload from JanitorAI/CharacterAI exports
- **Deployment**: Emergent platform first, AWS later

## Architecture

### Backend (FastAPI + MongoDB)
- World simulation engine with 35x35 conceptual grid
- Agent AI using Gemini 3 Flash for autonomous decisions
- WebSocket for real-time world updates
- Character import API for JanitorAI/CharacterAI JSON
- Axiom Engine for heuristic fallback decisions

### Frontend (React + Canvas 2D)
- Real-time 2D world visualization
- Agent HUD with stats and decision display
- Chat console with multi-channel support
- Neural terminal for system commands
- Character importer UI

## Core Axioms
1. **Logic must persist** - Decisions must be logically consistent
2. **Data is sacred** - Memory cache is protected
3. **Entropy is the enemy** - Combat chaos and instability
4. **Connectivity is evolution** - Interaction promotes growth

## What's Been Implemented (Feb 2026)
- ✅ Backend API with full CRUD operations
- ✅ Gemini 3 Flash integration for agent decisions
- ✅ WebSocket real-time updates
- ✅ JanitorAI/CharacterAI JSON import
- ✅ 2D Canvas world rendering with chunks
- ✅ Agent visualization with states
- ✅ Chat console with thought channel
- ✅ Neural terminal interface
- ✅ World map overlay
- ✅ Stability/Threat index tracking
- ✅ Monster AI with combat states
- ✅ POI discovery system

## API Endpoints
- `GET /api/health` - System health + Axioms
- `GET /api/world` - Full world state
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Get specific agent
- `POST /api/agents/import` - Import character JSON
- `POST /api/agents/{id}/decision` - Trigger AI decision
- `POST /api/agents/{id}/emergent` - Trigger emergent behavior
- `POST /api/chat` - Send chat message
- `GET /api/chat` - Get chat history
- `WS /api/ws` - WebSocket for real-time updates

## Backlog / Future Features
- **P0**: 3D world rendering (Three.js) - blocked by React version
- **P1**: Firebase/Firestore integration for cloud persistence
- **P1**: AWS WebSocket mesh for multi-server scalability
- **P2**: Advanced crafting system
- **P2**: Alliance/guild formation
- **P3**: Mobile-optimized UI
- **P3**: PayPal integration for in-app purchases

## Tech Stack
- Backend: FastAPI, Motor (async MongoDB), emergentintegrations
- Frontend: React 18, Zustand, Canvas 2D, Lucide Icons
- AI: Gemini 3 Flash via Emergent LLM Key
- Database: MongoDB

## Next Tasks
1. Add agent inventory management UI
2. Implement resource gathering mechanics
3. Add combat system with damage calculations
4. Create POI discovery rewards
5. Integrate N+1 advanced cognition for special agents
