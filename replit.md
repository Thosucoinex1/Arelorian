# Ouroboros: Neural Emergence

A real-time, AI-driven MMO world simulation built with React, Three.js, Express, and WebSockets. Features a deterministic tick engine, procedural world generation, and axiomatic feedback loops.

## Architecture

- **Frontend**: React 18, Three.js (@react-three/fiber), Tailwind CSS v4, Zustand
- **Backend**: Express 5 + WebSocket (ws) + modular engine in `server/`
- **Database**: Replit PostgreSQL (Neon-backed), schema v32.0 — 13 tables (auto-created on startup)
- **Tick Engine**: 600ms deterministic cycle, κ=1000, resumes from last committed tick
- **Dev Server**: `tsx server.ts` on port 5000 (Vite middleware in dev)

## Frontend Components

- `App.tsx` — Main controller: API key gate, game loops, error boundaries
- `store.ts` — Zustand global state: agents, chunks, monsters, quests, market, guilds, combat
- `components/World/WorldScene.tsx` — Three.js 3D world: terrain, agents, monsters, POIs, sky
- `components/ErrorBoundary.tsx` — Graceful WebGL/render error recovery
- `certs/UI/GameUI.tsx` — HUD window manager (9 window types)
- `certs/UI/MainMenu.tsx` — Bottom-right action bar (save, character, map, market)
- `certs/UI/AgentHUD.tsx` — Selected agent stats, skills, XP, integrity
- `certs/UI/CharacterSheet.tsx` — Full character view: equipment, inventory, stats
- `certs/UI/InspectorPanel.tsx` — Entity/chunk/monster inspector
- `certs/UI/ChatLog.tsx` — Matrix Chat (Global, Local, Thought, System channels)
- `certs/UI/WorldMap.tsx` — Top-down chunk map with biome visualization
- `certs/UI/MarketOverlay.tsx` — Resource prices, trade offers, crafting orders
- `certs/UI/AuctionHouseOverlay.tsx` — Auction listings and bidding
- `certs/UI/QuestBoardOverlay.tsx` — Quest tracking and acceptance
- `certs/UI/GuildPartyOverlay.tsx` — Guild/party management
- `certs/UI/AdminDashboard.tsx` — Admin-only: emergence settings, import agents, diagnostics
- `certs/UI/WindowHUD.tsx` — Minimized window restore bar

## Database Schema (13 tables)

- `agents` — UUID PK, stats, position, JSONB inventory/dna/memory
- `users` — Player accounts with subscription tier
- `chunks` — 16x16m procedural world chunks with biome, resources, logic field
- `combat_logs` — Server-authoritative combat records
- `loot_table` — Item templates with rarity/stats
- `marketplace` — Active market listings with dynamic pricing
- `hierarchy_entities` — Guilds/factions with infrastructure unlocks
- `matrix_transactions` — Energy/currency ledger
- `economic_summary` — Per-tick economic snapshots (GDP, inflation, trade volume)
- `tick_state` — Tick engine execution logs
- `world_state` — Global stability/player monitoring
- `duden_register` — Notary event log
- `chronicles` — Narrative archive

## Backend Modules (`server/`)

- `db.ts` — Pool init, queryDb helper, ensureSchema (auto-creates all 13 tables)
- `transaction-wrapper.ts` — ACID transaction wrapper (BEGIN/COMMIT/ROLLBACK)
- `math-engine.ts` — 7 core equations (terrain, biome, resource decay, dungeon probability, market price, trust, decision function), κ=1000
- `chunk-engine.ts` — Procedural chunk generation, resource extraction, biome shift
- `tick-engine.ts` — 600ms deterministic tick loop, resumes from last committed tick
- `combat-system.ts` — Server-authoritative combat resolution
- `loot-generator.ts` — Seed-based deterministic loot generation (6 rarity tiers)
- `economic-aggregator.ts` — Dynamic pricing, supply/demand tracking, war impact
- `hierarchy-validator.ts` — Guild/faction leveling, infrastructure unlocks
- `matrix-accounting.ts` — Energy balance, transfers, rewards
- `routes.ts` — All API endpoints

## Services

- `services/geminiService.ts` — Gemini AI integration for autonomous agent decisions, emergent behavior, project diagnostics
- `services/webSocketService.ts` — Real-time WebSocket client with auto-reconnection
- `services/WorldBuildingService.ts` — Procedural content generation (POIs, monsters, resources)
- `services/SoundManager.ts` — WebAudio procedural sound effects
- `services/CharacterImporter.ts` — External character data import

## API Endpoints

- `GET /api/health` — Status, DB, tick engine, world state
- `GET /api/agents` — All agents
- `GET/POST /api/sync/agents` — Agent CRUD (transactional upsert, frontend↔DB mapping)
- `GET /api/chunks?x=&z=&radius=` — Chunk grid
- `GET /api/chunks/:x/:z` — Single chunk
- `POST /api/chunks/extract` — Resource extraction
- `GET /api/combat-logs` — Combat history
- `POST /api/combat` — Trigger combat
- `GET /api/marketplace` — Listings + dynamic prices
- `POST /api/marketplace` — Create listing
- `GET /api/economic-summary` — Economic snapshots
- `GET /api/hierarchy` — Guilds/factions
- `POST /api/hierarchy` — Create entity
- `POST /api/hierarchy/:id/join` — Join + validation
- `GET /api/matrix/transactions` — Transaction ledger
- `GET /api/matrix/balance/:uid` — Energy balance
- `POST /api/matrix/transfer` — Energy transfer
- `GET /api/tick-state` — Tick engine logs
- `GET /api/world-state` — World monitoring
- `GET /api/chronicles` — Archive
- `GET /api/duden` — Notary log
- `GET /api/loot/generate` — Loot preview
- `GET /api/axiom-compliance` — Self-evaluation matrix

## Environment Variables

- `DATABASE_URL` — Replit-managed PostgreSQL (auto-set)
- `GEMINI_API_KEY` — Required for AI features (set as env var or via window.aistudio)
- `VITE_FIREBASE_*` — Firebase client configuration (optional)
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase Admin server-side (optional)

## Key Design Decisions

- Default user is `null` (guest) — admin handshake modal only for projectouroboroscollective@gmail.com
- Equipment mapping: WEAPON→mainHand, OFFHAND→offHand, HELM→head, CHEST→chest, LEGS→legs
- Agent sync maps frontend `id` → DB `uid`, merges DB data into existing agents preserving full state
- Tick engine resumes from last committed tick_number on restart (no duplicate key errors)
- WebSocket auto-reconnects on unexpected disconnection (3s delay), suppressed on intentional disconnect

## Deployment

- Target: VM (always-running for tick engine + WebSocket)
- Build: `npm run build`
- Run: `npx tsx server.ts`
