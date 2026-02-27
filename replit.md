# Ouroboros: Neural Emergence

A real-time, AI-driven MMO world simulation built with React, Three.js, Express, and WebSockets. Features a deterministic tick engine, procedural world generation, and axiomatic feedback loops.

## Architecture

- **Frontend**: React 18, Three.js (@react-three/fiber), Tailwind CSS v4, Zustand
- **Backend**: Express 5 + WebSocket (ws) + modular engine in `server/`
- **Database**: Replit PostgreSQL (Neon-backed), schema v32.0 — 22 tables (auto-created on startup)
- **Tick Engine**: 600ms deterministic cycle, κ=1000, resumes from last committed tick
- **Dev Server**: `tsx server.ts` on port 5000 (Vite middleware in dev)

## Game Flow

- **Landing Page** (`certs/UI/LandingPage.tsx`): Cinematic entry with WebGL terrain preview, world status, account creation / sign-in form (tabbed)
- **User Auth**: Email + password registration/login via `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (JWT, 30-day expiry, separate user secret, rate-limited)
- **Character Creation** (`certs/UI/CharacterCreation.tsx`): Skin tone, hair style, body type, body scale, name input with 3D humanoid preview
- **Game World** (`GameApp` in `App.tsx`): Full 3D MMO with HUD, skill bars, agent control
- **OSCC** (`/oscc`): Admin console (separate route, admin-specific auth)
- Phase tracking via `localStorage('ouroboros_game_phase')`: landing → character_creation → game
- User token stored in `localStorage('ouroboros_user_token')`, auto-verified on return visits
- Logout button in MainMenu clears token and returns to landing page

## Graphics System (WebGL Overhaul)

### Procedural Humanoid Characters
- `components/World/HumanoidModel.ts` — Multi-part skeletal character builder
  - Body parts: head, neck, torso (spine+chest), upper/lower arms, hands, upper/lower legs, feet
  - THREE.Bone hierarchy with parent-child transforms
  - THREE.SkinnedMesh with vertex skinning
  - Appearance config: skinTone, hairStyle (bald/short/long/mohawk/ponytail), bodyScale
  - Equipment attachment via `group.userData` bone refs (headBone, chestBone, handR/LBone, legBones)

### Animation System
- `components/World/AnimationSystem.ts` — Procedural animation clips
  - 5 animations: idle (breathing/sway), walk (leg/arm alternation), run (faster+lean), attack (arm swing), death (fall)
  - AnimationController class wraps THREE.AnimationMixer with 0.3s crossfade transitions
  - AgentState → animation mapping (IDLE→idle, GATHERING→walk, COMBAT→attack, etc.)

### Equipment Renderer
- `components/World/EquipmentRenderer.ts` — Visual equipment on skeleton bones
  - Equipment types: helmet (head), chest armor (chest), leg armor (legs), weapon (right hand), shield (left hand)
  - Rarity-based PBR materials (COMMON→gray, UNCOMMON→green, RARE→blue, EPIC→purple, LEGENDARY→orange, AXIOMATIC→pink)

### Terrain Shader
- `components/World/AxiomShader.ts` — Rich procedural biome texturing
  - CITY: Cobblestone brick patterns with road networks and grass edges
  - FOREST: Multi-layer ground cover (soil, moss, grass, leaf litter, dappled light)
  - MOUNTAIN: Stratified rock with cliff faces, moss, snow at elevation
  - PLAINS: Grass with wildflowers (pink/yellow/white), dry patches, dirt paths
  - DESERT: Sand dunes with ripples and sparkle
  - SWAMP: Mud/moss with water pools and shimmer
  - Neural fog-of-war with sanctuary override (CITY always fully visible)
  - Minimum visibility floor (0.15) so terrain is never pitch black

### Monster Visuals
- 4 distinct procedural monster body types:
  - Slime: Translucent squashed sphere with eyes, bouncing animation
  - Goblin: Stacked spheres with cone hat, humanoid silhouette
  - Orc: Beefy body with muscular arms, glowing red eyes
  - Dragon: Multi-part with snout, wings, tail, amber eyes
- Ground shadow circles beneath all monsters
- Floating/bobbing animation per type

### Enhanced WorldScene
- `components/World/WorldScene.tsx` — PBR rendering pipeline
  - HumanoidAgentMesh replaces old box/sphere AgentMesh
  - Hemisphere light (sky=#87CEEB, ground=#4a6741)
  - Directional light with 2048px shadow maps, intensity 2.2
  - Linear fog (near=150, far=600, color=#8ba4c4)
  - ACES Filmic tone mapping, sRGB color space
  - Dungeon entrances: Stone arch pillars with glowing purple portal ring
  - WebGL error boundaries for graceful degradation

## Frontend Components

- `App.tsx` — AppRouter (Landing→CharacterCreation→Game→OSCC), game loops, error boundaries
- `store.ts` — Zustand global state: agents (with appearance_json), chunks, monsters, quests, market, guilds, combat
- `types.ts` — AppearanceConfig interface, DEFAULT_APPEARANCE constant
- `components/World/WorldScene.tsx` — Three.js 3D world with humanoid agents, terrain, monsters, POIs, sky
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
- `certs/UI/AgentManagerOverlay.tsx` — User agent manager: 5-slot import system + "Create New Character" manual path
- `certs/UI/TutorialOverlay.tsx` — 5-step new player tutorial (movement, skills, world, combat, safe zone)
- `certs/UI/EnergyShopOverlay.tsx` — Matrix Energy purchase shop
- `certs/UI/PayPalModal.tsx` — PayPal checkout modal
- `certs/UI/WindowHUD.tsx` — Minimized window restore bar

## Database Schema (22 tables)

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
- `admins` — Admin accounts (bcrypt hashed, sovereign/operator/observer roles)
- `admin_roles` — Role-permission mapping
- `admin_sessions` — JWT session tracking with revocation
- `admin_audit_logs` — Full admin action audit trail
- `admin_event_logs` — Event creation logs
- `anomaly_logs` — Security anomaly detection
- `security_lockouts` — Brute-force lockout tracking
- `live_events` — Active/resolved world events
- `event_effects` — Event impact records (before/after state)

## Backend Modules (`server/`)

- `db.ts` — Pool init, queryDb helper, ensureSchema (auto-creates all 22 tables)
- `transaction-wrapper.ts` — ACID transaction wrapper (BEGIN/COMMIT/ROLLBACK)
- `math-engine.ts` — 7 core equations + getEffectiveKappa(), setTemporaryKappa()
- `chunk-engine.ts` — Procedural chunk generation, resource extraction, biome shift
- `tick-engine.ts` — 600ms deterministic tick loop + pause/resume
- `combat-system.ts` — Server-authoritative combat resolution
- `loot-generator.ts` — Seed-based deterministic loot generation (6 rarity tiers)
- `economic-aggregator.ts` — Dynamic pricing, supply/demand tracking
- `hierarchy-validator.ts` — Guild/faction leveling, infrastructure unlocks
- `matrix-accounting.ts` — Energy balance, transfers, rewards
- `routes.ts` — All API endpoints
- `admin-security.ts` — JWT, bcrypt, rate limiting, audit logging, brute-force protection
- `admin-routes.ts` — All admin API endpoints with transaction-safe operations

## Services

- `services/geminiService.ts` — Gemini AI integration for autonomous agent decisions
- `services/webSocketService.ts` — Real-time WebSocket client with auto-reconnection
- `services/WorldBuildingService.ts` — Procedural content generation (sanctuary city POIs, biome-specific dungeons, monster variety)
- `services/SoundManager.ts` — WebAudio procedural sound effects
- `services/CharacterImporter.ts` — External character data import

## PayPal Integration (Live)

- `server/paypal.ts` — PayPal REST API v2 integration (order creation + capture)
- `certs/UI/PayPalModal.tsx` — Real PayPal JS SDK buttons (dynamically loaded)
- `certs/UI/EnergyShopOverlay.tsx` — Energy shop UI triggering PayPal checkout
- **Mode**: Live (production PayPal API)
- **Currency**: EUR
- **Products**: ENERGY_100 (€0.99), ENERGY_500 (€3.99), ENERGY_2000 (€9.99)
- **Flow**: Shop → PayPal modal → SDK buttons → create-order → PayPal approval → capture-order → credit ME
- **API Endpoints**:
  - `GET /api/paypal/client-id` — Returns client ID for SDK init
  - `POST /api/paypal/create-order` — Creates PayPal order for a product
  - `POST /api/paypal/capture-order` — Captures approved payment, returns energy amount
- **Env vars**: PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY, PAYPAL_MODE

## OSCC (Omniscient System Control Console)

Admin dashboard accessible at `/oscc` with military-grade security.

### Security Architecture
- **Authentication**: bcrypt (saltRounds=12) + JWT access tokens (15min) + refresh tokens (7 days)
- **Zero-trust**: Every request re-validates JWT + session in DB
- **Brute-force protection**: 5 failed attempts → 15min lockout
- **Rate limiting**: 100 req/15min on admin endpoints
- **Audit logging**: Every admin action logged with IP, timestamp, details

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

## Classless Skill System (RuneScape-style)

- **No class system** — classType is optional flavor text only
- **15 skills** across 4 categories:
  - Combat: Melee, Ranged, Magic, Defense
  - Gathering: Mining, Woodcutting, Fishing, Herbalism
  - Crafting: Smithing, Alchemy, Cooking, Runecrafting
  - Utility: Agility, Thieving, Dungeoneering
- **Skill XP**: Each action grants XP to the specific skill used
- **Skill Actions**: Every 25 levels unlocks a new ability (Lv1, 25, 50, 75, 100)
- **Stat Points**: Every skill level-up grants 1 stat point (STR, DEX, AGI, STA, HP, MANA, INT)

## Player Agent Control

- **Take Control**: User controls 1 agent via Take Control button in AgentHUD
- **Third-person camera**: Smooth follow from behind/above
- **WASD / Arrow Keys**: Keyboard movement for desktop (normalized diagonal, skip when in text inputs)
- **Virtual Joysticks**: Touch joystick for mobile/tablet via `certs/UI/VirtualJoysticks.tsx`
  - Left joystick: movement (wired to `store.inputAxis` → `updatePhysics`)
  - Right joystick: camera (reserved)
  - Auto-detects mobile/tablet via userAgent
- **Skill Action Bar**: Bottom HUD bar with categories → skills → unlocked actions
- **Optimized for Android/tablets**: Large touch targets (48-56px)

## Environment Variables

- `DATABASE_URL` — Replit-managed PostgreSQL (auto-set)
- `GEMINI_API_KEY` — Required for AI features
- `ADMIN_JWT_SECRET` — JWT signing secret for admin auth
- `ADMIN_DEFAULT_PASSWORD` — Initial admin password (optional)

## Deployment

- Target: VM (always-running for tick engine + WebSocket)
- Build: `npm run build`
- Run: `npx tsx server.ts`
