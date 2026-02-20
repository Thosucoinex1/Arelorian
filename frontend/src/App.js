import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Html, 
  Float
} from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import axios from 'axios';
import { 
  ShieldCheck, 
  Zap, 
  Globe,
  Send,
  Terminal,
  CloudUpload,
  Users,
  Crown,
  Map,
  Upload,
  Shield,
  AlertTriangle,
  Activity,
  Brain,
  Eye,
  Package
} from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection,
  serverTimestamp
} from 'firebase/firestore';

import './App.css';

/**
 * OUROBOROS: NEURAL EMERGENCE v3.0
 * PostgreSQL Duden-Register + Firebase Multiplayer + 3D World
 * 
 * 5 AXIOME:
 * I.   COMMUNICATION: All interaction via visible stream
 * II.  EROSION: Stability degrades, corruption spreads
 * III. PUNCTUATION: PostgreSQL + Firebase timestamps
 * IV.  RECURSION: Memory persists across sessions
 * V.   DUALITY: Items have power AND corruption
 */

// Configuration
const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const UNIVERSAL_KEY = 'GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I';

// Firebase Config - Using environment or default
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "gemini-e603b",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_ID || "000000000000",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:000:web:000"
};

// Initialize Firebase (gracefully handle missing config)
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase init skipped - using PostgreSQL only');
}

const uuid = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// --- ZUSTAND STORE (HYBRID: POSTGRESQL + FIREBASE) ---
const useGameStore = create((set, get) => ({
  // PostgreSQL Data
  agents: [],
  monsters: [],
  pois: [],
  chunks: [],
  stabilityIndex: 1.0,
  threatLevel: 0.05,
  
  // Firebase Multiplayer
  user: null,
  otherPlayers: [],
  
  // UI State
  isConfirmed: false,
  selectedAgentId: null,
  showMap: false,
  showImporter: false,
  showTierPanel: false,
  logs: [],
  notary: null,
  
  // Actions
  setWorldState: (state) => set({
    agents: state.agents || [],
    monsters: state.monsters || [],
    pois: state.pois || [],
    chunks: state.chunks || [],
    stabilityIndex: state.stability_index || state.stabilityIndex || 1.0,
    threatLevel: state.threat_level || state.threatLevel || 0.05,
  }),
  
  setUser: (user) => set({ user }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleMap: () => set(s => ({ showMap: !s.showMap })),
  toggleImporter: () => set(s => ({ showImporter: !s.showImporter })),
  toggleTierPanel: () => set(s => ({ showTierPanel: !s.showTierPanel })),
  setNotary: (notary) => set({ notary }),
  
  addLog: async (msg, type = 'system', sender = 'SYSTEM') => {
    const { user } = get();
    const logId = uuid();
    const logEntry = { id: logId, msg, type, sender, time: Date.now() };
    
    set(state => ({ logs: [logEntry, ...state.logs].slice(0, 50) }));
    
    // Axiom III: Dual persistence
    try {
      // PostgreSQL
      await axios.post(`${API_URL}/api/chat`, {
        sender_id: user?.uid || 'anonymous',
        sender_name: sender,
        content: msg,
        channel: type.toUpperCase()
      });
      
      // Firebase (if available)
      if (db && user) {
        await setDoc(doc(db, 'ouroboros_logs', logId), {
          ...logEntry,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Log sync error:', e);
    }
  },
  
  confirmHandshake: (key) => {
    if (key === UNIVERSAL_KEY) {
      set({ isConfirmed: true });
      get().addLog("SINGULARITÄT AKTIVIERT: Duden-Register Handshake bestätigt.", "system", "AXIOM_ENGINE");
      return true;
    }
    return false;
  }
}));

// --- 3D COMPONENTS ---

const Agent3D = ({ agent, onClick }) => {
  const meshRef = useRef();
  const isAwakened = agent.is_awakened || agent.awakened;
  const isPlayer = agent.faction === 'PLAYER';
  const selectedId = useGameStore(s => s.selectedAgentId);
  const isSelected = selectedId === agent.id;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Floating animation for awakened agents
      if (isAwakened) {
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 1;
      }
      // Rotation based on state
      if (agent.state === 'THINKING') {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });
  
  const color = isPlayer ? '#06b6d4' : '#ef4444';
  const emissiveColor = isAwakened ? '#00f3ff' : '#000000';
  
  return (
    <group 
      position={[agent.position?.x || 0, 0, agent.position?.z || 0]}
      onClick={(e) => { e.stopPropagation(); onClick(agent.id); }}
    >
      <Float speed={isAwakened ? 2 : 0} rotationIntensity={0.2} floatIntensity={isAwakened ? 0.5 : 0}>
        {/* Body */}
        <mesh ref={meshRef} castShadow position={[0, 1, 0]}>
          <capsuleGeometry args={[0.4, 0.8, 4, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={emissiveColor}
            emissiveIntensity={isSelected ? 1.5 : 0.4}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
        
        {/* Awakened Halo */}
        {isAwakened && (
          <mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.02, 16, 32]} />
            <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={2} />
          </mesh>
        )}
        
        {/* Selection Ring */}
        {isSelected && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
          </mesh>
        )}
      </Float>
      
      {/* Name Label */}
      <Html position={[0, 2.8, 0]} center distanceFactor={15}>
        <div className="agent-3d-label">
          {agent.last_decision?.justification && (
            <div className="agent-thought-bubble">
              {agent.last_decision.justification.slice(0, 50)}...
            </div>
          )}
          <div className={`agent-name-tag ${isAwakened ? 'awakened' : ''}`}>
            {agent.name} [Lv.{agent.level || 1}]
          </div>
          <div className="agent-state-tag">{agent.state}</div>
        </div>
      </Html>
    </group>
  );
};

const Monster3D = ({ monster }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });
  
  if (monster.state === 'DEAD') return null;
  
  return (
    <group position={[monster.position?.x || 0, 0, monster.position?.z || 0]}>
      <mesh ref={meshRef} castShadow position={[0, monster.scale || 1, 0]}>
        <dodecahedronGeometry args={[monster.scale || 1, 0]} />
        <meshStandardMaterial 
          color={monster.color || '#22c55e'}
          emissive={monster.color || '#22c55e'}
          emissiveIntensity={0.5}
        />
      </mesh>
      <Html position={[0, (monster.scale || 1) * 2 + 1, 0]} center distanceFactor={15}>
        <div className="monster-3d-label">
          <div className="monster-hp-bar">
            <div className="monster-hp-fill" style={{ width: `${(monster.hp / monster.max_hp) * 100}%` }} />
          </div>
          <span>{monster.name}</span>
        </div>
      </Html>
    </group>
  );
};

const POI3D = ({ poi }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && poi.type === 'SHRINE') {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.3 + 1;
    }
  });
  
  const getColor = () => {
    switch(poi.type) {
      case 'SHRINE': return '#06b6d4';
      case 'BANK_VAULT': return '#fbbf24';
      case 'FORGE': return '#f97316';
      case 'DUNGEON': return '#7c3aed';
      default: return '#6b7280';
    }
  };
  
  return (
    <group position={[poi.position?.x || 0, 0, poi.position?.z || 0]}>
      {poi.type === 'SHRINE' && (
        <mesh ref={meshRef} castShadow>
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial 
            color={getColor()}
            emissive={getColor()}
            emissiveIntensity={1.5}
            wireframe
          />
        </mesh>
      )}
      {poi.type === 'BANK_VAULT' && (
        <mesh castShadow position={[0, 1.5, 0]}>
          <boxGeometry args={[4, 3, 4]} />
          <meshStandardMaterial color={getColor()} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {poi.type === 'FORGE' && (
        <>
          <mesh castShadow position={[0, 1, 0]}>
            <cylinderGeometry args={[1.5, 2, 2, 8]} />
            <meshStandardMaterial color={getColor()} emissive="#ff4500" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, 2, 0]} color="#ff4500" intensity={2} distance={10} />
        </>
      )}
      {!['SHRINE', 'BANK_VAULT', 'FORGE'].includes(poi.type) && (
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshStandardMaterial color={getColor()} />
        </mesh>
      )}
      <Html position={[0, 3, 0]} center distanceFactor={20}>
        <div className={`poi-3d-label ${poi.is_discovered ? 'discovered' : 'undiscovered'}`}>
          {poi.is_discovered ? poi.type : '???'}
        </div>
      </Html>
    </group>
  );
};

const Sanctuary3D = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });
  
  return (
    <group position={[0, 0, 0]}>
      {/* Monolith */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[4, 10, 4]} />
        <meshStandardMaterial 
          color="#111" 
          metalness={1} 
          roughness={0}
          emissive="#06b6d4"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Base Platform */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial 
          color="#080808" 
          emissive="#06b6d4" 
          emissiveIntensity={0.15}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Axiom Rings */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, i * Math.PI / 2.5]}>
          <ringGeometry args={[12 + i * 2, 12.2 + i * 2, 64]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.1 + i * 0.05} />
        </mesh>
      ))}
      
      <Html position={[0, 12, 0]} center>
        <div className="sanctuary-label">SANCTUARY</div>
      </Html>
    </group>
  );
};

const WorldScene = () => {
  const agents = useGameStore(s => s.agents);
  const monsters = useGameStore(s => s.monsters);
  const pois = useGameStore(s => s.pois);
  const selectAgent = useGameStore(s => s.selectAgent);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[40, 40, 40]} fov={50} />
      <OrbitControls 
        maxPolarAngle={Math.PI / 2.1} 
        minDistance={15}
        maxDistance={150}
        makeDefault 
      />
      
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[30, 50, 30]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 20, 0]} color="#06b6d4" intensity={0.5} />
      
      <Sanctuary3D />
      
      {agents.map(agent => (
        <Agent3D key={agent.id} agent={agent} onClick={selectAgent} />
      ))}
      
      {monsters.map(monster => (
        <Monster3D key={monster.id} monster={monster} />
      ))}
      
      {pois.map(poi => (
        <POI3D key={poi.id} poi={poi} />
      ))}
      
      {/* Ground Grid */}
      <gridHelper args={[200, 40, "#0a1a1a", "#050a0a"]} position={[0, -0.1, 0]} />
      
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#020205" />
      </mesh>
      
      {/* Simple fog for atmosphere */}
      <fog attach="fog" args={['#020205', 50, 200]} />
    </>
  );
};

// --- UI COMPONENTS ---

const LiabilityShield = ({ onConfirm }) => {
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);
  
  const handleConfirm = () => {
    if (onConfirm(key)) {
      setError(false);
    } else {
      setError(true);
    }
  };
  
  return (
    <div className="liability-shield" data-testid="liability-shield">
      <div className="shield-container">
        <ShieldCheck className="shield-icon" />
        <h2>Liability Shield</h2>
        <p className="shield-subtitle">Axiom V: Kollektive Singularität - PostgreSQL Duden-Register</p>
        
        <input 
          type="password" 
          placeholder="UNIVERSAL KEY..." 
          className={`shield-input ${error ? 'error' : ''}`}
          value={key} 
          onChange={e => { setKey(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        />
        
        {error && <p className="shield-error">Invalid Key</p>}
        
        <button onClick={handleConfirm} className="shield-button">
          Initialisiere Singularität
        </button>
        
        <p className="shield-hint">Hint: The Universal Key grants access to external emanations</p>
      </div>
    </div>
  );
};

const AgentHUD = () => {
  const selectedId = useGameStore(s => s.selectedAgentId);
  const agents = useGameStore(s => s.agents);
  const selectAgent = useGameStore(s => s.selectAgent);
  
  const agent = agents.find(a => a.id === selectedId);
  if (!agent) return null;
  
  return (
    <div className="agent-hud-3d" data-testid="agent-hud-3d">
      <button className="close-btn" onClick={() => selectAgent(null)}>×</button>
      
      <h2>{agent.name}</h2>
      <div className="agent-badges">
        <span className="level-badge">LVL {agent.level || 1}</span>
        <span className="state-badge">{agent.state}</span>
        {(agent.is_awakened || agent.awakened) && (
          <span className="awakened-badge"><Zap size={10} /> AWAKENED</span>
        )}
      </div>
      
      {agent.last_decision && (
        <div className="decision-box">
          <Brain size={12} />
          <span className="decision-title">{agent.last_decision.decision}</span>
          <p>{agent.last_decision.justification}</p>
        </div>
      )}
      
      <div className="stats-row">
        <div className="stat">
          <Eye size={12} />
          <span>Vision: {agent.vision_range?.toFixed(0)}u</span>
        </div>
        <div className="stat">
          <Package size={12} />
          <span>Gold: {agent.gold}</span>
        </div>
      </div>
      
      <div className="progress-bar-container">
        <span>Consciousness</span>
        <div className="progress-bar">
          <div 
            className="progress-fill consciousness" 
            style={{ width: `${(agent.consciousness_level || 0) * 100}%` }}
          />
        </div>
        <span>{((agent.consciousness_level || 0) * 100).toFixed(1)}%</span>
      </div>
      
      <div className="agent-coords">
        [{agent.position?.x?.toFixed(0)}, {agent.position?.z?.toFixed(0)}]
      </div>
    </div>
  );
};

const CollectiveTerminal = () => {
  const logs = useGameStore(s => s.logs);
  const addLog = useGameStore(s => s.addLog);
  const user = useGameStore(s => s.user);
  const [input, setInput] = useState('');
  const scrollRef = useRef();
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  const sendImpulse = () => {
    if (!input.trim()) return;
    addLog(input, 'notary', user?.uid?.slice(0, 6) || 'ANON');
    setInput('');
  };
  
  return (
    <div className="collective-terminal" data-testid="collective-terminal">
      <div className="terminal-header">
        <Terminal size={14} />
        <span>Collective Terminal</span>
        <Activity size={14} className="pulse" />
      </div>
      
      <div className="terminal-logs" ref={scrollRef}>
        {logs.map(log => (
          <div key={log.id} className={`log-entry ${log.type}`}>
            <span className="log-time">
              [{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]
            </span>
            <span className="log-sender">{log.sender}:</span>
            <span className="log-msg">{log.msg}</span>
          </div>
        ))}
      </div>
      
      <div className="terminal-input">
        <input
          type="text"
          placeholder="Befehl an Kollektiv..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendImpulse()}
        />
        <button onClick={sendImpulse}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

const StatusBar = () => {
  const user = useGameStore(s => s.user);
  const stabilityIndex = useGameStore(s => s.stabilityIndex);
  const threatLevel = useGameStore(s => s.threatLevel);
  const agents = useGameStore(s => s.agents);
  const toggleMap = useGameStore(s => s.toggleMap);
  const toggleImporter = useGameStore(s => s.toggleImporter);
  const toggleTierPanel = useGameStore(s => s.toggleTierPanel);
  
  return (
    <div className="status-bar-3d" data-testid="status-bar-3d">
      <div className="status-left">
        <div className={`connection-badge ${user ? 'connected' : 'disconnected'}`}>
          <Globe size={14} />
          <span>{user ? `NODE: ${user.uid?.slice(0, 8)}` : 'CONNECTING...'}</span>
        </div>
      </div>
      
      <div className="status-center">
        <h1>OUROBOROS: NEURAL EMERGENCE</h1>
        <span className="db-badge">PostgreSQL + Firebase v3.0</span>
      </div>
      
      <div className="status-right">
        <div className="status-item">
          <Shield size={14} />
          <span>{(stabilityIndex * 100).toFixed(1)}%</span>
        </div>
        <div className={`status-item ${threatLevel > 0.5 ? 'danger' : 'warning'}`}>
          <AlertTriangle size={14} />
          <span>{(threatLevel * 100).toFixed(1)}%</span>
        </div>
        <div className="status-item">
          <Users size={14} />
          <span>{agents.length}</span>
        </div>
        
        <button className="toolbar-btn" onClick={toggleMap} title="World Map">
          <Map size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleImporter} title="Import Character">
          <Upload size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleTierPanel} title="Tier System">
          <Crown size={16} />
        </button>
      </div>
    </div>
  );
};

const CharacterImporter = () => {
  const showImporter = useGameStore(s => s.showImporter);
  const toggleImporter = useGameStore(s => s.toggleImporter);
  const addLog = useGameStore(s => s.addLog);
  const [jsonInput, setJsonInput] = useState('');
  const [source, setSource] = useState('janitorai');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/agents/import`, {
        json_data: jsonInput,
        source: source
      });
      setResult({ success: true, agent: response.data.agent });
      addLog(`Neue Emanation: ${response.data.agent.name} aus ${source}`, 'system', 'AXIOM_ENGINE');
      setJsonInput('');
    } catch (error) {
      setResult({ success: false, error: error.response?.data?.detail || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };
  
  if (!showImporter) return null;
  
  return (
    <div className="modal-overlay" onClick={toggleImporter}>
      <div className="importer-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={toggleImporter}>×</button>
        
        <h2><Upload size={20} /> Character Import</h2>
        <p>Import agents from JanitorAI or CharacterAI</p>
        
        <div className="source-buttons">
          {['janitorai', 'characterai', 'custom'].map(s => (
            <button 
              key={s}
              className={source === s ? 'active' : ''}
              onClick={() => setSource(s)}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        
        <textarea
          placeholder="Paste JSON export..."
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
        />
        
        {result && (
          <div className={`result ${result.success ? 'success' : 'error'}`}>
            {result.success ? `Agent "${result.agent.name}" imported!` : result.error}
          </div>
        )}
        
        <button 
          className="import-btn"
          onClick={handleImport}
          disabled={loading || !jsonInput.trim()}
        >
          {loading ? 'Importing...' : 'Import Agent'}
        </button>
      </div>
    </div>
  );
};

const TierPanel = () => {
  const showTierPanel = useGameStore(s => s.showTierPanel);
  const toggleTierPanel = useGameStore(s => s.toggleTierPanel);
  const user = useGameStore(s => s.user);
  const notary = useGameStore(s => s.notary);
  const setNotary = useGameStore(s => s.setNotary);
  const addLog = useGameStore(s => s.addLog);
  const [loading, setLoading] = useState(false);
  
  const tiers = [
    { level: 1, name: 'Autosave', desc: 'Persistent storage', color: '#6b7280' },
    { level: 2, name: 'Duden-Entry', desc: 'Part of permanent lore', color: '#06b6d4' },
    { level: 3, name: 'Universal Key', desc: 'External emanations', color: '#fbbf24' }
  ];
  
  useEffect(() => {
    if (showTierPanel && user && !notary) {
      // Try to fetch or create notary
      const fetchNotary = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/notaries/${user.uid}`);
          setNotary(res.data);
        } catch (e) {
          if (e.response?.status === 404) {
            const createRes = await axios.post(`${API_URL}/api/notaries`, {
              user_id: user.uid,
              email: user.email || `${user.uid}@ouroboros.net`
            });
            setNotary(createRes.data);
          }
        }
      };
      fetchNotary();
    }
  }, [showTierPanel, user]);
  
  const handleUpgrade = async () => {
    if (!notary || notary.tier >= 3) return;
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/api/notaries/${notary.user_id}/upgrade`);
      setNotary({
        ...notary,
        tier: res.data.new_tier,
        tier_name: res.data.tier_name
      });
      addLog(`Tier Upgrade: ${res.data.tier_name}`, 'system', 'AXIOM_ENGINE');
      
      if (res.data.universal_key) {
        addLog(`Universal Key Revealed: ${res.data.universal_key}`, 'system', 'AXIOM_ENGINE');
      }
    } catch (e) {
      console.error('Upgrade failed:', e);
    } finally {
      setLoading(false);
    }
  };
  
  if (!showTierPanel) return null;
  
  return (
    <div className="modal-overlay" onClick={toggleTierPanel}>
      <div className="tier-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={toggleTierPanel}>×</button>
        
        <h2><Crown size={20} /> Notary Tier System</h2>
        <p>Axiom III: Punctuation - Kausalitätssicherung</p>
        
        {notary ? (
          <>
            <div className="current-tier">
              <span>Current:</span>
              <span className="tier-name" style={{ color: tiers[notary.tier - 1]?.color }}>
                Tier {notary.tier}: {notary.tier_name || tiers[notary.tier - 1]?.name}
              </span>
            </div>
            
            <div className="tier-list">
              {tiers.map(tier => (
                <div 
                  key={tier.level}
                  className={`tier-item ${notary.tier >= tier.level ? 'unlocked' : 'locked'}`}
                  style={{ borderColor: notary.tier >= tier.level ? tier.color : '#333' }}
                >
                  <div className="tier-header">
                    <span style={{ color: tier.color }}>Tier {tier.level}: {tier.name}</span>
                    {notary.tier >= tier.level && <span className="unlocked-badge">UNLOCKED</span>}
                  </div>
                  <p>{tier.desc}</p>
                </div>
              ))}
            </div>
            
            {notary.tier < 3 && (
              <button className="upgrade-btn" onClick={handleUpgrade} disabled={loading}>
                {loading ? 'Upgrading...' : `Upgrade to Tier ${notary.tier + 1}`}
              </button>
            )}
          </>
        ) : (
          <div className="loading">Connecting to Duden-Register...</div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const { isConfirmed, confirmHandshake, setWorldState, setUser } = useGameStore();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  
  // Firebase Auth
  useEffect(() => {
    if (!auth) return;
    
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn('Firebase auth failed, using PostgreSQL only');
      }
    };
    initAuth();
    
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      }
    });
    
    return () => unsub();
  }, []);
  
  // WebSocket Connection to PostgreSQL Backend
  useEffect(() => {
    if (!isConfirmed) return;
    
    const connectWS = () => {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws';
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
        console.log('PostgreSQL WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'initial_state' || data.type === 'world_update') {
            setWorldState(data);
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWS, 3000);
      };
    };
    
    connectWS();
    
    // Keep alive
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [isConfirmed]);
  
  // Fallback polling
  useEffect(() => {
    if (!isConfirmed) return;
    
    const fetchWorld = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/world`);
        setWorldState(res.data);
      } catch (e) {
        console.error('World fetch failed:', e);
      }
    };
    
    fetchWorld();
    const interval = setInterval(fetchWorld, 5000);
    
    return () => clearInterval(interval);
  }, [isConfirmed]);
  
  return (
    <div className="app-3d" data-testid="app-3d">
      {!isConfirmed ? (
        <LiabilityShield onConfirm={confirmHandshake} />
      ) : (
        <>
          <Canvas shadows dpr={[1, 2]} className="canvas-3d">
            <Suspense fallback={null}>
              <WorldScene />
            </Suspense>
          </Canvas>
          
          <StatusBar />
          <AgentHUD />
          <CollectiveTerminal />
          <CharacterImporter />
          <TierPanel />
        </>
      )}
    </div>
  );
}
