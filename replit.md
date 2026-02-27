# Ouroboros: Neural Emergence

A real-time, AI-driven MMO world simulation built with React, Three.js, Express, and WebSockets.

## Architecture

- **Frontend**: React 18, Three.js (@react-three/fiber), Tailwind CSS v4, Zustand
- **Backend**: Express 5 + HTTP server with WebSocket (ws) support
- **Dev Server**: Both frontend and backend run together via `tsx server.ts` on port 5000
- **Build System**: Vite 6 with TypeScript

## Project Structure

- `server.ts` — Express + WebSocket server; serves Vite middleware in dev, static `dist/` in production
- `App.tsx` — Root React component
- `index.tsx` — App entry point
- `vite.config.ts` — Vite configuration (port 5000, allowedHosts: true for Replit proxy)
- `store.ts` — Zustand global state store
- `types.ts` — Shared TypeScript types
- `utils.ts` — Utility functions
- `geminiService.ts` — Gemini AI service
- `components/` — React components (World scene, etc.)
- `certs/UI/` — Game UI components (HUD, overlays, panels, etc.)
- `services/` — Backend/shared services (Firebase, WebSocket, Sound, etc.)
- `src/services/` — Client-side services (Firebase, Genkit)

## Environment Variables

See `.env.example` for all available variables:
- `GEMINI_API_KEY` — Required for AI features
- `VITE_FIREBASE_*` — Firebase client configuration
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase Admin (server-side)
- `DATABASE_URL` / `DB_*` — Optional database (disabled/memory mode by default)
- `GOOGLE_CLOUD_PROJECT` / `GOOGLE_APPLICATION_CREDENTIALS` — For Genkit/Vertex AI

## Development

The `npm run dev` script runs `tsx server.ts` which:
1. Starts an Express server with WebSocket support on port 5000
2. In dev mode, injects Vite middleware for hot module replacement
3. In production, serves the built `dist/` directory

## Deployment

- Target: VM (always-running, needed for WebSocket persistence)
- Build: `npm run build` (Vite builds frontend to `dist/`)
- Run: `npx tsx server.ts` (serves built frontend + API)
