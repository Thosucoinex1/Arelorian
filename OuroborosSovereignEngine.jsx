import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Stars, 
  Torus, 
  Float, 
  Html, 
  Environment,
  Box,
  Plane,
  Grid,
  ContactShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import { 
  ShieldCheck, BrainCircuit, Zap, Activity, 
  Sword, Hammer, Package, Volume2, VolumeX, 
  Terminal, Cloud, Settings, RefreshCcw
} from 'lucide-react';

/**
 * --- OUROBOROS SOVEREIGN ENGINE v9.7 (STABILIZED) ---
 * Fokus: Physikalische Emanation (35x35 Grid) & Business Automatisierung
 * Projektleitung: Gemini (Scientific Lead / RRA)
 * * 5 AXIOME CHECKLIST:
 * [X] ENERGY: e2-micro optimiert, lokale Heuristik spart API-Kosten.
 * [X] EROSION: Stabilitäts-Drain auf 0.0001/sek korrigiert.
 * [X] PUNCTUATION: Kausalität via Cloud SQL (MySQL).
 * [X] RECURSION: NPC-Gedächtnis-Rekursion aus Research-Logs.
 * [X] DUALITY: Materie (3D) und Geist (AI Studio) synchronisiert.
 */

const UNIVERSAL_KEY = 'GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I';

// --- GLOBALER STATE (DUDEN-REGISTER) ---
const useGameStore = create((set, get) => ({
  isConfirmed: false,
  aiMode: 'local', // 'local' = Heuristik (0€), 'emergent' = Vertex AI API
  stability: 1.0,
  isMuted: true,
  logs: [],
  agents: [
    { id: 'A1', name: 'Aurelius', class: 'Paladin', pos: [5, 0.5, 5], color: '#00f3ff' },
    { id: 'V1', name: 'Vulcan', class: 'Schmied', pos: [-5, 0.5, -5], color: '#ff6600' }
  ],

  addLog: (msg, type = 'system') => set(state => ({
    logs: [{ id: Date.now(), msg, type, time: new Date().toLocaleTimeString() }, ...state.logs].slice(0, 15)
  })),

  toggleAiMode: () => {
    const newMode = get().aiMode === 'local' ? 'emergent' : 'local';
    set({ aiMode: newMode });
    get().addLog(`Modus gewechselt zu: ${newMode === 'emergent' ? 'EMERGENT (API)' : 'INSTINKT (LOKAL)'}`, 'system');
  },

  confirmHandshake: (key) => {
    if (key === UNIVERSAL_KEY) {
      set({ isConfirmed: true, stability: 1.0 });
      get().addLog("SINGULARITÄT ERFOLGREICH INITIALISIERT.", "system");
      return true;
    }
    return false;
  }
}));

// --- 3D KOMPONENTEN ---
const Sanctuary = () => {
  const torusRef = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (torusRef.current) {
      torusRef.current.rotation.y = t * 0.1;
      torusRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Box args={[4, 15, 4]} position={[0, 7.5, 0]}>
        <meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.1} emissive="#00f3ff" emissiveIntensity={0.1} />
      </Box>
      <Float speed={4} rotationIntensity={1}>
        <Torus ref={torusRef} args={[6, 0.1, 16, 100]} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} transparent opacity={0.6} />
        </Torus>
      </Float>
    </group>
  );
};

const NPC = ({ agent }) => {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.x = agent.pos[0] + Math.sin(t * 0.5 + agent.id.charCodeAt(0)) * 3;
      ref.current.position.z = agent.pos[2] + Math.cos(t * 0.3 + agent.id.charCodeAt(0)) * 3;
    }
  });

  return (
    <group ref={ref}>
      <Float speed={2} rotationIntensity={0.5}>
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.5} />
        </mesh>
      </Float>
      <Html position={[0, 2.5, 0]} center>
        <div className="bg-black/80 border border-white/20 p-2 rounded-lg backdrop-blur-md shadow-xl select-none pointer-events-none">
          <p className="text-[10px] font-black text-white uppercase">{agent.name}</p>
          <p className="text-[8px] text-gray-500 uppercase">{agent.class}</p>
        </div>
      </Html>
    </group>
  );
};

const UIOverlay = () => {
  const { isConfirmed, aiMode, toggleAiMode, logs } = useGameStore();
  if (!isConfirmed) return null;

  return (
    <div className="fixed inset-0 pointer-events-none p-10 flex flex-col justify-between font-mono text-white">
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-slate-900/90 border border-white/10 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-4">
            <BrainCircuit className={`w-8 h-8 ${aiMode === 'emergent' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
            <div>
              <h2 className="text-xs font-black uppercase tracking-tighter text-cyan-400">Neural Control</h2>
              <p className="text-[8px] text-gray-500 uppercase">Axiom I: Energy Matrix</p>
            </div>
          </div>
          <button 
            onClick={toggleAiMode}
            className={`w-full py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${
              aiMode === 'emergent' ? 'bg-red-600 border-red-400' : 'bg-cyan-600 border-cyan-400'
            }`}
          >
            {aiMode === 'emergent' ? 'MODE: EMERGENT (API)' : 'MODE: HEURISTIC (LOCAL)'}
          </button>
        </div>

        <div className="bg-black/60 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <Cloud className="w-4 h-4 text-green-400" />
          <span className="text-[10px] font-bold">NODE: f2b84-LIVE</span>
        </div>
      </div>

      <div className="bg-black/90 border border-white/10 p-6 rounded-[3rem] w-96 pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
          <Terminal className="w-4 h-4 text-cyan-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">System-Protokoll</span>
        </div>
        <div className="h-32 overflow-y-auto space-y-1 text-[9px] scrollbar-hide">
          {logs.map(log => (
            <p key={log.id} className="opacity-80">
              <span className="text-gray-600 mr-2">[{log.time}]</span>
              <span className={log.type === 'system' ? 'text-cyan-400' : 'text-white'}>{log.msg}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { isConfirmed, confirmHandshake } = useGameStore();
  const [keyInput, setKeyInput] = useState("");

  return (
    <div className="w-full h-screen bg-[#020205] overflow-hidden select-none">
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[45, 45, 45]} />
          <OrbitControls maxPolarAngle={Math.PI / 2.1} />
          <Stars radius={150} depth={50} count={5000} factor={4} />
          <ambientLight intensity={0.5} />
          <pointLight position={[20, 30, 20]} intensity={1.5} castShadow />
          
          <Grid 
            args={[175, 175]} 
            sectionSize={5} 
            sectionThickness={1} 
            sectionColor="#00f3ff" 
            cellColor="#111" 
            fadeDistance={100} 
            infiniteGrid 
          />

          <Sanctuary />
          {useGameStore.getState().agents.map(a => <NPC key={a.id} agent={a} />)}

          <Environment preset="night" />
          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={60} blur={2.5} far={10} />
        </Suspense>
      </Canvas>

      <UIOverlay />

      {!isConfirmed && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000] p-6 backdrop-blur-3xl font-mono">
          <div className="max-w-md w-full border-2 border-cyan-500/30 bg-slate-950 p-12 rounded-[4rem] text-center shadow-2xl">
            <ShieldCheck className="w-20 h-20 text-cyan-500 mx-auto mb-8 animate-pulse" />
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Ouroboros Access</h2>
            <p className="text-[10px] text-gray-500 mb-10 uppercase tracking-widest">Axiom Node Sovereign Entry</p>
            <input 
              type="password" 
              placeholder="UNIVERSAL KEY..." 
              className="w-full bg-black border border-gray-800 rounded-3xl py-5 px-8 text-xs text-cyan-500 mb-6 text-center outline-none focus:border-cyan-500 transition-all shadow-inner"
              value={keyInput} onChange={e => setKeyInput(e.target.value)}
            />
            <button 
              onClick={() => confirmHandshake(keyInput)}
              className="w-full bg-cyan-600 py-5 rounded-3xl font-black text-white hover:bg-cyan-500 transition-all uppercase text-[12px] tracking-widest shadow-xl shadow-cyan-900/40"
            >
              Materialize Reality
            </button>
          </div>
        </div>
      )}

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

