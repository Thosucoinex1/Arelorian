import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { create } from 'zustand';
import axios from 'axios';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Terminal, Brain, Activity, Shield, Eye, Package, Zap,
  ChevronUp, ChevronDown, Map, Users, MessageSquare, Upload, 
  Send, AlertTriangle, Crown, ShieldCheck, Globe
} from 'lucide-react';
import './App.css';

/**
 * OUROBOROS: NEURAL EMERGENCE v3.0 (3D RECONSTRUCTION)
 * PostgreSQL Duden-Register + React-Three-Fiber
 * 
 * 5 AXIOME:
 * I.   COMMUNICATION: All interaction via visible stream
 * II.  EROSION: Stability degrades, corruption spreads
 * III. PUNCTUATION: PostgreSQL timestamps every change
 * IV.  RECURSION: Memory persists across sessions
 * V.   DUALITY: Items have power AND corruption
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const UNIVERSAL_KEY = 'GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I';

// ============== ZUSTAND STORE ==============
const useStore = create((set, get) => ({
  agents: [],
  monsters: [],
  pois: [],
  chunks: [],
  chatMessages: [],
  stabilityIndex: 1.0,
  threatLevel: 0.05,
  uptime: 0,
  selectedAgentId: null,
  showMap: false,
  showImporter: false,
  showTierPanel: false,
  isConnected: false,
  isConfirmed: false,
  cameraTarget: [0, 0, 0],
  notary: null,
  logs: [],
  
  setWorldState: (state) => set({
    agents: state.agents || [],
    monsters: state.monsters || [],
    pois: state.pois || [],
    chunks: state.chunks || [],
    chatMessages: state.chat_messages || state.chatMessages || [],
    stabilityIndex: state.stability_index || state.stabilityIndex || 1.0,
    threatLevel: state.threat_level || state.threatLevel || 0.05,
    uptime: state.uptime || 0,
  }),
  
  selectAgent: (id) => {
    const agent = get().agents.find(a => a.id === id);
    set({ selectedAgentId: id });
    if (agent) {
      set({ cameraTarget: [agent.pos_x || 0, 0, agent.pos_z || 0] });
    }
  },
  
  toggleMap: () => set(s => ({ showMap: !s.showMap })),
  toggleImporter: () => set(s => ({ showImporter: !s.showImporter })),
  toggleTierPanel: () => set(s => ({ showTierPanel: !s.showTierPanel })),
  setConnected: (connected) => set({ isConnected: connected }),
  setNotary: (notary) => set({ notary }),
  
  addLog: (msg, type = 'system', sender = 'SYSTEM') => {
    const logEntry = { id: Date.now().toString(), msg, type, sender, time: Date.now() };
    set(state => ({ logs: [logEntry, ...state.logs].slice(0, 50) }));
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

// ============== 3D COMPONENTS ==============

const CameraController = () => {
  const { camera, controls } = useThree();
  const selectedAgentId = useStore(s => s.selectedAgentId);
  const agents = useStore(s => s.agents);
  const cameraTarget = useStore(s => s.cameraTarget);
  
  useFrame(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent && controls) {
        // Smooth follow
        controls.target.lerp(new THREE.Vector3(agent.pos_x, 0, agent.pos_z), 0.1);
        controls.update();
      }
    }
  });

  return (
    <OrbitControls 
      makeDefault 
      minPolarAngle={0} 
      maxPolarAngle={Math.PI / 2.1} 
      maxDistance={100}
      minDistance={5}
    />
  );
};

const GridFloor = () => {
  const chunks = useStore(s => s.chunks);
  
  // Create geometries and materials once
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
  }), []);
  
  const materials = useMemo(() => ({
    wild: new THREE.MeshStandardMaterial({ color: '#1a2a1a', roughness: 0.8 }),
    city: new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5, metalness: 0.5 }),
    forest: new THREE.MeshStandardMaterial({ color: '#1e3a1e', roughness: 0.9 }),
    mountain: new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 1.0 }),
    sanctuary: new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 0.2, transparent: true, opacity: 0.8 }),
    corruption: new THREE.MeshStandardMaterial({ color: '#7c3aed', emissive: '#7c3aed', emissiveIntensity: 0.5, transparent: true, opacity: 0.4 })
  }), []);

  return (
    <group>
      {chunks.map((chunk, i) => {
        let material = materials.wild;
        if (chunk.biome === 'CITY') material = materials.city;
        if (chunk.biome === 'FOREST') material = materials.forest;
        if (chunk.biome === 'MOUNTAIN') material = materials.mountain;
        if (chunk.cell_type === 'SANCTUARY') material = materials.sanctuary;
        
        // Scale factor for visualization
        const scale = 1; 
        
        return (
          <group key={`${chunk.x}-${chunk.z}`} position={[chunk.x * scale, 0, chunk.z * scale]}>
            {/* Base Tile */}
            <mesh 
              geometry={geometries.box} 
              material={material} 
              position={[0, -0.5, 0]} 
              scale={[0.95, 1, 0.95]} 
              receiveShadow
            />
            
            {/* Corruption Overlay */}
            {chunk.corruption_level > 0.1 && (
               <mesh 
               geometry={geometries.box} 
               material={materials.corruption} 
               position={[0, -0.4, 0]} 
               scale={[0.96, 1.1 * chunk.corruption_level, 0.96]} 
             />
            )}
            
            {/* Sanctuary Marker */}
            {(chunk.cell_type === 'SANCTUARY' || chunk.biome === 'CITY') && (
               <Html position={[0, 1, 0]} center distanceFactor={15}>
                 <div className="sanctuary-label">SANCTUARY</div>
               </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

const Agents3D = () => {
  const agents = useStore(s => s.agents);
  const selectAgent = useStore(s => s.selectAgent);
  const selectedAgentId = useStore(s => s.selectedAgentId);
  
  return (
    <group>
      {agents.map(agent => (
        <AgentMesh 
          key={agent.id} 
          agent={agent} 
          isSelected={selectedAgentId === agent.id}
          onClick={(e) => { e.stopPropagation(); selectAgent(agent.id); }}
        />
      ))}
    </group>
  );
};

const AgentMesh = ({ agent, isSelected, onClick }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      // Smooth movement interpolation could go here if we had prev position
      // For now, direct update
      meshRef.current.position.x = agent.pos_x || 0;
      meshRef.current.position.z = agent.pos_z || 0;
      
      // Floating animation
      meshRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 2 + agent.id.charCodeAt(0)) * 0.1;
      
      // Rotation
      meshRef.current.rotation.y += 0.01;
    }
  });

  const isPlayer = agent.faction === 'PLAYER';
  const color = isPlayer ? '#06b6d4' : '#ef4444';

  return (
    <group ref={meshRef} onClick={onClick}>
      {/* Selection Ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Body */}
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Head/Eye */}
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[0.4, 0.1, 0.1]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      
      {/* Label */}
      <Html position={[0, 1.2, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
        <div className="agent-3d-label">
           {(agent.is_awakened || agent.awakened) && (
             <div className="agent-thought-bubble">
               <Zap size={8} fill="currentColor" /> AWAKENED
             </div>
           )}
           <div className={`agent-name-tag ${(agent.is_awakened || agent.awakened) ? 'awakened' : ''}`}>
             {agent.name}
           </div>
           <div className="agent-state-tag">{agent.state}</div>
        </div>
      </Html>
    </group>
  );
};

const Monsters3D = () => {
  const monsters = useStore(s => s.monsters);
  
  return (
    <group>
      {monsters.map(monster => {
        if (monster.state === 'DEAD') return null;
        return (
          <MonsterMesh key={monster.id} monster={monster} />
        );
      })}
    </group>
  );
};

const MonsterMesh = ({ monster }) => {
  const meshRef = useRef();
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = monster.pos_x || 0;
      meshRef.current.position.z = monster.pos_z || 0;
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <group ref={meshRef} position={[monster.pos_x, 0.5, monster.pos_z]}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={monster.color || '#22c55e'} wireframe />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={monster.color || '#22c55e'} emissive={monster.color} emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      
      <Html position={[0, 0.8, 0]} center distanceFactor={12}>
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

const POIs3D = () => {
  const pois = useStore(s => s.pois);
  
  return (
    <group>
      {pois.map(poi => (
        <POIMesh key={poi.id} poi={poi} />
      ))}
    </group>
  );
};

const POIMesh = ({ poi }) => {
  const color = poi.type === 'SHRINE' ? '#06b6d4' : 
                poi.type === 'DUNGEON' ? '#7c3aed' : 
                poi.type === 'FORGE' ? '#f97316' : '#fbbf24';
                
  return (
    <group position={[poi.position?.x || 0, 0, poi.position?.z || 0]}>
      {poi.type === 'SHRINE' ? (
        <mesh position={[0, 1, 0]} castShadow>
          <octahedronGeometry args={[0.8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ) : (
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 1, 0.8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
      
      {/* Light Beacon */}
      <pointLight color={color} intensity={1} distance={5} position={[0, 2, 0]} />
      
      <Html position={[0, 2, 0]} center distanceFactor={15}>
        <div className={`poi-3d-label ${poi.is_discovered ? 'discovered' : 'undiscovered'}`}>
          {poi.is_discovered ? poi.type : '???'}
        </div>
      </Html>
    </group>
  );
};

const Scene = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 20, 20]} fov={50} />
      <CameraController />
      
      <ambientLight intensity={0.2} color="#ffffff" />
      <pointLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[-10, 20, -10]} intensity={0.5} color="#06b6d4" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <GridFloor />
      <Agents3D />
      <Monsters3D />
      <POIs3D />
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#020205', 10, 60]} />
    </>
  );
};

// ============== LIABILITY SHIELD ==============
const LiabilityShield = () => {
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);
  const confirmHandshake = useStore(s => s.confirmHandshake);
  
  const handleConfirm = () => {
    if (!confirmHandshake(key)) {
      setError(true);
    }
  };
  
  return (
    <div className="liability-shield">
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

// ============== UI COMPONENTS (Reused from 2D) ==============

const AgentHUD = () => {
  const selectedAgentId = useStore(s => s.selectedAgentId);
  const agents = useStore(s => s.agents);
  const selectAgent = useStore(s => s.selectAgent);
  
  const agent = agents.find(a => a.id === selectedAgentId);
  if (!agent) return null;
  
  return (
    <div className="agent-hud-3d">
      <button className="close-btn" onClick={() => selectAgent(null)}>×</button>
      <h2>{agent.name}</h2>
      <div className="agent-meta">
        <span className="level-badge">LVL {agent.level || 1}</span>
        <span className="state-badge">{agent.state}</span>
        {(agent.is_awakened || agent.awakened) && (
          <span className="awakened-badge"><Zap size={10} /> Awakened</span>
        )}
      </div>
      
      {agent.last_decision && (
        <div className="decision-box">
          <div className="decision-header"><Brain size={12} /> {agent.last_decision.decision}</div>
          <div className="decision-text">{agent.last_decision.justification}</div>
        </div>
      )}
      
      <div className="stats-grid">
        <div className="stat-item"><Eye size={12} /><span>Vision: {agent.vision_range?.toFixed(0)}u</span></div>
        <div className="stat-item"><Package size={12} /><span>Gold: {agent.gold}</span></div>
      </div>
      
      <div className="hud-footer">[{agent.pos_x?.toFixed(0)}, {agent.pos_z?.toFixed(0)}]</div>
    </div>
  );
};

const CollectiveTerminal = () => {
  const logs = useStore(s => s.logs);
  const chatMessages = useStore(s => s.chatMessages);
  const addLog = useStore(s => s.addLog);
  const [input, setInput] = useState('');
  const scrollRef = useRef();
  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, chatMessages]);
  
  const allLogs = [...logs, ...chatMessages.map(m => ({
    id: m.id,
    msg: m.content,
    type: m.channel?.toLowerCase() || 'chat',
    sender: m.sender_name,
    time: new Date(m.timestamp).getTime()
  }))].sort((a, b) => b.time - a.time).slice(0, 50);
  
  const sendImpulse = async () => {
    if (!input.trim()) return;
    addLog(input, 'notary', 'USER');
    try {
      await axios.post(`${API_URL}/api/chat`, {
        sender_id: 'user',
        sender_name: 'USER',
        content: input,
        channel: 'GLOBAL'
      });
    } catch (e) {
      console.error('Chat error:', e);
    }
    setInput('');
  };
  
  return (
    <div className="collective-terminal">
      <div className="terminal-header">
        <div className="terminal-title"><Terminal size={16} /><span>Collective Terminal</span></div>
        <Activity size={16} className="pulse-icon" />
      </div>
      
      <div ref={scrollRef} className="terminal-logs">
        {allLogs.map(log => (
          <div key={log.id} className={`log-entry ${log.type}`}>
            <span className="log-time">[{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
            <span className={`log-sender ${log.type}`}>{log.sender}:</span>
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
        <button onClick={sendImpulse}><Send size={16} /></button>
      </div>
    </div>
  );
};

const StatusBar = () => {
  const stabilityIndex = useStore(s => s.stabilityIndex);
  const threatLevel = useStore(s => s.threatLevel);
  const agents = useStore(s => s.agents);
  const isConnected = useStore(s => s.isConnected);
  const toggleMap = useStore(s => s.toggleMap);
  const toggleImporter = useStore(s => s.toggleImporter);
  const toggleTierPanel = useStore(s => s.toggleTierPanel);
  
  return (
    <div className="status-bar-3d">
      <div className="status-left">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <Globe size={14} />
          <span>{isConnected ? 'DUDEN-REGISTER ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </div>
      
      <div className="status-center">
        <h1>OUROBOROS: NEURAL EMERGENCE</h1>
        <span className="db-badge">PostgreSQL + React Three Fiber</span>
      </div>
      
      <div className="status-right">
        <div className="status-item"><Shield size={14} /><span>Stability: {(stabilityIndex * 100).toFixed(1)}%</span></div>
        <div className={`status-item ${threatLevel > 0.5 ? 'danger' : 'threat'}`}>
          <AlertTriangle size={14} /><span>Corruption: {(threatLevel * 100).toFixed(1)}%</span>
        </div>
        <div className="status-item"><Users size={14} /><span>Agents: {agents.length}</span></div>
        
        <button className="toolbar-btn" onClick={toggleImporter} title="Import Character"><Upload size={16} /></button>
        <button className="toolbar-btn" onClick={toggleTierPanel} title="Tier System"><Crown size={16} /></button>
      </div>
    </div>
  );
};

const CharacterImporter = () => {
  const showImporter = useStore(s => s.showImporter);
  const toggleImporter = useStore(s => s.toggleImporter);
  const addLog = useStore(s => s.addLog);
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
            <button key={s} className={source === s ? 'active' : ''} onClick={() => setSource(s)}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        
        <textarea placeholder="Paste JSON export..." value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
        
        {result && (
          <div className={`result ${result.success ? 'success' : 'error'}`}>
            {result.success ? `Agent "${result.agent.name}" imported!` : result.error}
          </div>
        )}
        
        <button className="import-btn" onClick={handleImport} disabled={loading || !jsonInput.trim()}>
          {loading ? 'Importing...' : 'Import Agent'}
        </button>
      </div>
    </div>
  );
};

const TierPanel = () => {
  const showTierPanel = useStore(s => s.showTierPanel);
  const toggleTierPanel = useStore(s => s.toggleTierPanel);
  const notary = useStore(s => s.notary);
  const setNotary = useStore(s => s.setNotary);
  const addLog = useStore(s => s.addLog);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const tiers = [
    { level: 1, name: 'Autosave', desc: 'Persistent storage', color: '#6b7280' },
    { level: 2, name: 'Duden-Entry', desc: 'Part of permanent lore', color: '#06b6d4' },
    { level: 3, name: 'Universal Key', desc: 'External emanations', color: '#fbbf24' }
  ];
  
  const handleLogin = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notaries/${userId}`);
      setNotary(res.data);
    } catch (e) {
      if (e.response?.status === 404) {
        const createRes = await axios.post(`${API_URL}/api/notaries`, { user_id: userId });
        setNotary(createRes.data);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpgrade = async () => {
    if (!notary || notary.tier >= 3) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/notaries/${notary.user_id}/upgrade`);
      setNotary({ ...notary, tier: res.data.new_tier, tier_name: res.data.tier_name });
      addLog(`Tier Upgrade: ${res.data.tier_name}`, 'system', 'AXIOM_ENGINE');
      if (res.data.universal_key) {
        addLog(`Universal Key: ${res.data.universal_key}`, 'system', 'AXIOM_ENGINE');
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
        <p>Axiom III: Punctuation</p>
        
        {!notary ? (
          <div className="tier-login">
            <input 
              type="text" 
              placeholder="Enter User ID" 
              value={userId} 
              onChange={e => setUserId(e.target.value)} 
              className="shield-input"
              style={{ marginBottom: 16 }}
            />
            <button className="upgrade-btn" onClick={handleLogin} disabled={loading}>{loading ? 'Loading...' : 'Access Duden-Register'}</button>
          </div>
        ) : (
          <div className="tier-info">
            <div className="current-tier"><span>Current:</span><span className="tier-name" style={{ color: tiers[notary.tier - 1]?.color }}>Tier {notary.tier}: {notary.tier_name || tiers[notary.tier - 1]?.name}</span></div>
            <div className="tier-list">
              {tiers.map(tier => (
                <div key={tier.level} className={`tier-item ${notary.tier >= tier.level ? 'unlocked' : 'locked'}`} style={{ borderColor: notary.tier >= tier.level ? tier.color : '#333' }}>
                  <div className="tier-header"><span style={{ color: tier.color }}>Tier {tier.level}: {tier.name}</span>{notary.tier >= tier.level && <span className="unlocked-badge">UNLOCKED</span>}</div>
                  <p>{tier.desc}</p>
                </div>
              ))}
            </div>
            {notary.tier < 3 && <button className="upgrade-btn" onClick={handleUpgrade} disabled={loading}>{loading ? 'Upgrading...' : `Upgrade to Tier ${notary.tier + 1}`}</button>}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== MAIN APP ==============
export default function App() {
  const { isConfirmed, setWorldState, setConnected } = useStore();
  const wsRef = useRef(null);
  
  useEffect(() => {
    if (!isConfirmed) return;
    
    const connectWS = () => {
      // Use wss for https, ws for http
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Backend URL processing to get host
      let backendHost = API_URL.replace('https://', '').replace('http://', '');
      if (backendHost.endsWith('/')) backendHost = backendHost.slice(0, -1);
      
      const wsUrl = `${protocol}//${backendHost}/api/ws`;
      
      console.log('Connecting to WS:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => { setConnected(true); console.log('WS connected'); };
      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'initial_state' || data.type === 'world_update') setWorldState(data);
        } catch (err) { console.error('WS error:', err); }
      };
      wsRef.current.onclose = () => { setConnected(false); setTimeout(connectWS, 3000); };
    };
    
    connectWS();
    const ping = setInterval(() => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: 'ping' })), 30000);
    
    return () => { clearInterval(ping); wsRef.current?.close(); };
  }, [isConfirmed, setWorldState, setConnected]);
  
  // Initial Fetch & Polling Fallback
  useEffect(() => {
    if (!isConfirmed) return;
    const fetchWorld = async () => {
      try { 
        const res = await axios.get(`${API_URL}/api/game_state`); 
        setWorldState(res.data); 
      } catch (e) { 
        console.error('Fetch error:', e); 
      }
    };
    fetchWorld();
    const interval = setInterval(fetchWorld, 5000);
    return () => clearInterval(interval);
  }, [isConfirmed, setWorldState]);
  
  if (!isConfirmed) return <LiabilityShield />;
  
  return (
    <div className="app-3d">
      <Canvas 
        className="canvas-3d" 
        shadows 
        dpr={[1, 2]} 
        gl={{ alpha: false, antialias: true }}
      >
        <color attach="background" args={['#050505']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      <StatusBar />
      <AgentHUD />
      <CollectiveTerminal />
      <CharacterImporter />
      <TierPanel />
    </div>
  );
}
