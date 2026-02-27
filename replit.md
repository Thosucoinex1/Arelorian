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
- `certs/UI/AgentManagerOverlay.tsx` — User agent manager: 5-slot import system, JanitorAI/CharacterAI/JSON import
- `certs/UI/EnergyShopOverlay.tsx` — Matrix Energy purchase shop with PayPal checkout
- `certs/UI/PayPalModal.tsx` — PayPal checkout modal (sandbox, supports onSuccess callback)
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

## OSCC (Omniscient System Control Console)

Admin dashboard accessible at `/oscc` with military-grade security.

### Security Architecture
- **Authentication**: bcrypt (saltRounds=12) + JWT access tokens (15min) + refresh tokens (7 days)
- **Zero-trust**: Every request re-validates JWT + session in DB; no session memory trust
- **Brute-force protection**: 5 failed attempts → 15min lockout
- **Rate limiting**: 100 req/15min on admin endpoints
- **Audit logging**: Every admin action logged to `admin_audit_logs` with IP, timestamp, details
- **Anomaly detection**: Suspicious patterns logged to `anomaly_logs`
- **Secure headers**: Helmet.js (CSP, X-Frame-Options, CORS)

### Admin API Endpoints
- `POST /api/admin/login` — Email+password → JWT tokens
- `POST /api/admin/refresh` — Refresh token → new access token
- `POST /api/admin/logout` — Revoke all sessions
- `GET /api/admin/session` — Validate current session
- `POST /api/admin/change-password` — Password rotation
- `POST /api/admin/events/create` — Spawn live world events
- `GET /api/admin/events` — List events
- `POST /api/admin/events/:id/resolve` — Resolve event
- `POST /api/admin/tick/pause` — Pause tick engine
- `POST /api/admin/tick/resume` — Resume tick engine
- `POST /api/admin/tick/modify-kappa` — Temporary κ override
- `GET /api/admin/tick/status` — Tick engine status
- `POST /api/admin/world/economic-shock` — Price manipulation
- `POST /api/admin/world/biome-shift` — Biome probability modification
- `POST /api/admin/world/spawn-invasion` — Combat event injection
- `POST /api/admin/world/inject-lore` — Global lore broadcast
- `POST /api/admin/world/rollback` — Emergency state rollback
- `GET /api/admin/audit-logs` — Paginated audit trail
- `GET /api/admin/anomaly-logs` — Security alerts
- `GET /api/admin/dashboard-stats` — Live system stats

### Event Impact Formulas
- EventImpact = BaseImpact × ln(κ) × Severity
- Economic Shock: Price = Price × (1 + ShockMagnitude/κ)
- Biome Shift: P_new = P_old × e^(EventWeight/κ)

### Admin Database Tables (9 new, 22 total)
- `admins` — Admin accounts (bcrypt hashed, sovereign/operator/observer roles)
- `admin_roles` — Role-permission mapping
- `admin_sessions` — JWT session tracking with revocation
- `admin_audit_logs` — Full admin action audit trail
- `admin_event_logs` — Event creation logs
- `anomaly_logs` — Security anomaly detection
- `security_lockouts` — Brute-force lockout tracking
- `live_events` — Active/resolved world events
- `event_effects` — Event impact records (before/after state)

### Backend Modules
- `server/admin-security.ts` — JWT, bcrypt, rate limiting, audit logging, brute-force protection
- `server/admin-routes.ts` — All admin API endpoints with transaction-safe operations
- `server/math-engine.ts` — Added getEffectiveKappa(), setTemporaryKappa(), tickKappaOverride()
- `server/tick-engine.ts` — Added pauseTickEngine(), resumeTickEngine()

### Frontend
- `certs/UI/OsccDashboard.tsx` — Full admin console (login + 3-panel dashboard)
- Route: `/oscc` detected in App.tsx via AppRouter component

## Environment Variables

- `DATABASE_URL` — Replit-managed PostgreSQL (auto-set)
- `GEMINI_API_KEY` — Required for AI features (set as env var or via window.aistudio)
- `ADMIN_JWT_SECRET` — JWT signing secret for admin auth
- `ADMIN_DEFAULT_PASSWORD` — Initial admin password (optional, defaults to seeded value)
- `VITE_FIREBASE_*` — Firebase client configuration (optional)
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase Admin server-side (optional)

## Classless Skill System (RuneScape-style)

- **No class system** — classType is optional flavor text only, not gameplay-relevant
- **15 skills** across 4 categories:
  - Combat: Melee, Ranged, Magic, Defense
  - Gathering: Mining, Woodcutting, Fishing, Herbalism
  - Crafting: Smithing, Alchemy, Cooking, Runecrafting
  - Utility: Agility, Thieving, Dungeoneering
- **Skill XP**: Each action grants XP to the specific skill used (mining ore→Mining XP, killing with melee→Melee XP)
- **Skill Actions**: Every 25 levels unlocks a new ability (Lv1, 25, 50, 75, 100) — defined in `SKILL_ACTIONS` (types.ts)
- **Stat Points**: Every skill level-up grants 1 stat point to allocate to: Strength, Dexterity, Agility, Stamina, Health, Mana, Intelligence
- **Stats affect gameplay**: STR→melee dmg, DEX→ranged dmg/crit, AGI→dodge/speed, STA→HP regen, HP→maxHP, MANA→spell capacity, INT→magic dmg
- **Legacy compatibility**: Old saves with `combat`/`crafting` skills auto-migrate to `melee`/`smithing`

## Player Agent Control

- **Take Control**: User can control 1 agent at a time via Take Control button in AgentHUD
- **Third-person camera**: When controlling, camera smoothly follows agent from behind/above (WorldScene.tsx ThirdPersonCamera component)
- **Skill Action Bar**: Bottom HUD bar (SkillActionBar.tsx) showing categories → skills → unlocked actions
- **Optimized for Android/tablets**: Large touch targets (48-56px), horizontal scrolling, HP/Mana bars
- **controlledAgentId**: Store state tracks which agent the user is playing

## Key Design Decisions

- Default user is `null` (guest) — admin handshake modal only for projectouroboroscollective@gmail.com
- Equipment mapping: WEAPON→mainHand, OFFHAND→offHand, HELM→head, CHEST→chest, LEGS→legs
- Agent sync maps frontend `id` → DB `uid`, merges DB data into existing agents preserving full state
- Tick engine resumes from last committed tick_number on restart (no duplicate key errors)
- WebSocket auto-reconnects on unexpected disconnection (3s delay), suppressed on intentional disconnect
- Max 5 imported agents per user (ImportedAgentMeta tracked in store.importedAgents)
- Agent import: JanitorAI/CharacterAI URLs + raw JSON supported, Gemini AI extracts personality→game agent
- Procedural skin generation: FNV-1a hash of source URL → deterministic HSL→hex colors (primary/secondary/accent + pattern)
- Building costs: HOUSE=50ME, BANK=150ME, FORGE=100ME, MARKET_STALL=75ME, DATA_HUB=200ME (Matrix Energy)
- PayPal modal supports `onSuccess` callback for caller-controlled purchase flow
- WindowTypes: MARKET, QUESTS, ADMIN, MAP, CHARACTER, AUCTION, INSPECTOR, CHAT, GUILD_PARTY, AGENT_MANAGER, ENERGY_SHOP

## Deployment

- Target: VM (always-running for tick engine + WebSocket)
- Build: `npm run build`
- Run: `npx tsx server.ts`
