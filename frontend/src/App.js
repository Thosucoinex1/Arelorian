import React, { useEffect, useRef, useState, useCallback } from 'react';
import { create } from 'zustand';
import axios from 'axios';
import { 
  Terminal, Brain, Activity, Shield, Eye, Package, Zap,
  ChevronUp, ChevronDown, Map, Users, MessageSquare, Upload, 
  Send, AlertTriangle, Crown, ShieldCheck, Globe
} from 'lucide-react';
import './App.css';

/**
 * OUROBOROS: NEURAL EMERGENCE v3.0
 * PostgreSQL Duden-Register + 2D Canvas World
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
  cameraOffset: { x: 0, z: 0 },
  zoom: 1,
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
  
  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleMap: () => set(s => ({ showMap: !s.showMap })),
  toggleImporter: () => set(s => ({ showImporter: !s.showImporter })),
  toggleTierPanel: () => set(s => ({ showTierPanel: !s.showTierPanel })),
  setConnected: (connected) => set({ isConnected: connected }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
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

// ============== 2D CANVAS WORLD ==============
const WorldCanvas = () => {
  const canvasRef = useRef(null);
  const agents = useStore(s => s.agents);
  const monsters = useStore(s => s.monsters);
  const pois = useStore(s => s.pois);
  const chunks = useStore(s => s.chunks);
  const selectAgent = useStore(s => s.selectAgent);
  const cameraOffset = useStore(s => s.cameraOffset);
  const setCameraOffset = useStore(s => s.setCameraOffset);
  const zoom = useStore(s => s.zoom);
  const setZoom = useStore(s => s.setZoom);
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  
  const worldToScreen = useCallback((wx, wz, canvas) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 4 * zoom;
    return {
      x: centerX + (wx - cameraOffset.x) * scale,
      y: centerY + (wz - cameraOffset.z) * scale
    };
  }, [cameraOffset, zoom]);
  
  const screenToWorld = useCallback((sx, sy, canvas) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 4 * zoom;
    return {
      x: (sx - centerX) / scale + cameraOffset.x,
      z: (sy - centerY) / scale + cameraOffset.z
    };
  }, [cameraOffset, zoom]);
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    const scale = 4 * zoom;
    setCameraOffset({
      x: cameraOffset.x - dx / scale,
      z: cameraOffset.z - dy / scale
    });
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(zoom + (e.deltaY > 0 ? -0.1 : 0.1));
  };
  
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, canvas);
    
    for (const agent of agents) {
      const dist = Math.hypot(agent.position?.x - worldPos.x, agent.position?.z - worldPos.z);
      if (dist < 3) {
        selectAgent(agent.id);
        return;
      }
    }
    selectAgent(null);
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const render = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Background
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const scale = 4 * zoom;
      
      // Draw chunks
      chunks.forEach(chunk => {
        const { x, y } = worldToScreen(chunk.x * 80, chunk.z * 80, canvas);
        const size = 80 * scale;
        
        let color = '#1a2a1a';
        if (chunk.biome === 'CITY') color = '#1a1a2e';
        else if (chunk.biome === 'FOREST') color = '#1e3a1e';
        else if (chunk.biome === 'MOUNTAIN') color = '#2d2d2d';
        
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // Corruption overlay
        if (chunk.corruption_level > 0.3) {
          ctx.fillStyle = `rgba(124, 58, 237, ${chunk.corruption_level * 0.3})`;
          ctx.fillRect(x - size/2, y - size/2, size, size);
        }
        
        if (chunk.biome === 'CITY' || chunk.cell_type === 'SANCTUARY') {
          ctx.fillStyle = 'rgba(6,182,212,0.2)';
          ctx.fillRect(x - size/2, y - size/2, size, size);
          ctx.fillStyle = '#06b6d4';
          ctx.font = 'bold 10px Orbitron, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SANCTUARY', x, y);
        }
      });
      
      // Draw POIs
      pois.forEach(poi => {
        const { x, y } = worldToScreen(poi.position?.x || 0, poi.position?.z || 0, canvas);
        let color = '#f59e0b';
        if (poi.type === 'SHRINE') color = '#06b6d4';
        else if (poi.type === 'BANK_VAULT') color = '#fbbf24';
        else if (poi.type === 'FORGE') color = '#f97316';
        else if (poi.type === 'DUNGEON') color = '#7c3aed';
        
        const size = poi.type === 'BANK_VAULT' || poi.type === 'FORGE' ? 16 : 10;
        
        if (poi.type === 'SHRINE') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size * 0.7, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size * 0.7, y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x - size/2, y - size/2, size, size);
        }
        
        ctx.fillStyle = poi.is_discovered ? 'rgba(255,255,255,0.6)' : color;
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(poi.is_discovered ? poi.type : '???', x, y - size - 4);
      });
      
      // Draw monsters
      monsters.forEach(monster => {
        if (monster.state === 'DEAD') return;
        const { x, y } = worldToScreen(monster.position?.x || 0, monster.position?.z || 0, canvas);
        const size = 8 * (monster.scale || 1);
        
        ctx.fillStyle = monster.color || '#22c55e';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = monster.color || '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // HP bar
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 10, y - size - 8, 20, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 10, y - size - 8, 20 * (monster.hp / monster.max_hp), 3);
        
        ctx.fillStyle = '#fff';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(monster.name, x, y + size + 12);
      });
      
      // Draw agents
      agents.forEach(agent => {
        const { x, y } = worldToScreen(agent.position?.x || 0, agent.position?.z || 0, canvas);
        const isPlayer = agent.faction === 'PLAYER';
        const isSelected = useStore.getState().selectedAgentId === agent.id;
        const isAwakened = agent.is_awakened || agent.awakened;
        
        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Body
        ctx.fillStyle = isPlayer ? '#06b6d4' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = isPlayer ? '#0891b2' : '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Awakened halo
        if (isAwakened) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        const nameWidth = ctx.measureText(agent.name).width + 8;
        ctx.fillRect(x - nameWidth/2, y - 30, nameWidth, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, x, y - 20);
        
        // State
        if (agent.state !== 'IDLE') {
          ctx.fillStyle = agent.state === 'COMBAT' ? '#ef4444' : '#06b6d4';
          ctx.font = '7px sans-serif';
          ctx.fillText(agent.state, x, y + 22);
        }
      });
      
      // Coordinates
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${cameraOffset.x.toFixed(0)}, ${cameraOffset.z.toFixed(0)}] zoom: ${zoom.toFixed(1)}x`, 10, canvas.height - 10);
      
      animationId = requestAnimationFrame(render);
    };
    
    render();
    return () => cancelAnimationFrame(animationId);
  }, [agents, monsters, pois, chunks, cameraOffset, zoom, worldToScreen]);
  
  return (
    <canvas
      ref={canvasRef}
      className="world-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      data-testid="world-canvas"
    />
  );
};

// ============== UI COMPONENTS ==============
const AgentHUD = () => {
  const selectedAgentId = useStore(s => s.selectedAgentId);
  const agents = useStore(s => s.agents);
  const selectAgent = useStore(s => s.selectAgent);
  
  const agent = agents.find(a => a.id === selectedAgentId);
  if (!agent) return null;
  
  return (
    <div className="agent-hud" data-testid="agent-hud">
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
      
      <div className="progress-section">
        <div className="progress-item">
          <div className="progress-header"><span>Consciousness</span><span>{((agent.consciousness_level || 0) * 100).toFixed(1)}%</span></div>
          <div className="progress-bar"><div className="progress-fill consciousness" style={{ width: `${(agent.consciousness_level || 0) * 100}%` }} /></div>
        </div>
      </div>
      
      <div className="hud-footer">[{agent.position?.x?.toFixed(0)}, {agent.position?.z?.toFixed(0)}]</div>
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
    <div className="neural-terminal" data-testid="collective-terminal">
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
    <div className="status-bar" data-testid="status-bar">
      <div className="status-left">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <Globe size={14} />
          <span>{isConnected ? 'DUDEN-REGISTER ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </div>
      
      <div className="status-center">
        <span className="title-text">OUROBOROS: NEURAL EMERGENCE</span>
        <span className="db-badge">PostgreSQL v3.0</span>
      </div>
      
      <div className="status-right">
        <div className="status-item"><Shield size={14} /><span>Stability: {(stabilityIndex * 100).toFixed(1)}%</span></div>
        <div className={`status-item ${threatLevel > 0.5 ? 'danger' : 'threat'}`}>
          <AlertTriangle size={14} /><span>Corruption: {(threatLevel * 100).toFixed(1)}%</span>
        </div>
        <div className="status-item"><Users size={14} /><span>Agents: {agents.length}</span></div>
        
        <button className="toolbar-btn" onClick={toggleMap} title="World Map"><Map size={16} /></button>
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
    <div className="importer-overlay" onClick={toggleImporter} data-testid="character-importer">
      <div className="importer-container" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={toggleImporter}>×</button>
        <h2><Upload size={20} /> Character Import</h2>
        <p className="importer-subtitle">Import agents from JanitorAI or CharacterAI</p>
        
        <div className="source-selector">
          {['janitorai', 'characterai', 'custom'].map(s => (
            <button key={s} className={source === s ? 'active' : ''} onClick={() => setSource(s)}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        
        <textarea placeholder="Paste JSON export..." value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
        
        {result && (
          <div className={`import-result ${result.success ? 'success' : 'error'}`}>
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
    <div className="tier-overlay" onClick={toggleTierPanel} data-testid="tier-panel">
      <div className="tier-container" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={toggleTierPanel}>×</button>
        <h2><Crown size={20} /> Notary Tier System</h2>
        <p className="tier-subtitle">Axiom III: Punctuation</p>
        
        {!notary ? (
          <div className="tier-login">
            <input type="text" placeholder="Enter User ID" value={userId} onChange={e => setUserId(e.target.value)} />
            <button onClick={handleLogin} disabled={loading}>{loading ? 'Loading...' : 'Access Duden-Register'}</button>
          </div>
        ) : (
          <div className="tier-info">
            <div className="current-tier"><span>Current:</span><span className="tier-value" style={{ color: tiers[notary.tier - 1]?.color }}>Tier {notary.tier}: {notary.tier_name || tiers[notary.tier - 1]?.name}</span></div>
            <div className="tier-levels">
              {tiers.map(tier => (
                <div key={tier.level} className={`tier-level ${notary.tier >= tier.level ? 'unlocked' : 'locked'}`} style={{ borderColor: notary.tier >= tier.level ? tier.color : '#333' }}>
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

const WorldMap = () => {
  const showMap = useStore(s => s.showMap);
  const toggleMap = useStore(s => s.toggleMap);
  const chunks = useStore(s => s.chunks);
  const agents = useStore(s => s.agents);
  
  if (!showMap) return null;
  
  return (
    <div className="world-map-overlay" onClick={toggleMap} data-testid="world-map">
      <div className="world-map-container" onClick={e => e.stopPropagation()}>
        <h2>WORLD PROJECTION (35x35)</h2>
        <div className="map-canvas" style={{ width: 400, height: 400 }}>
          {chunks.map(chunk => (
            <div key={chunk.id} className={`map-chunk ${chunk.biome?.toLowerCase()}`} style={{
              width: 160, height: 160,
              left: 200 + chunk.x * 160 - 80, top: 200 + chunk.z * 160 - 80
            }}>{chunk.biome === 'CITY' && <span>SANCTUARY</span>}</div>
          ))}
          {agents.map(agent => (
            <div key={agent.id} className={`map-agent ${agent.faction?.toLowerCase()}`} style={{
              left: 200 + (agent.position?.x || 0) * 2, top: 200 + (agent.position?.z || 0) * 2
            }} title={agent.name} />
          ))}
        </div>
        <div className="map-footer">Click outside to close</div>
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
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws';
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
  
  useEffect(() => {
    if (!isConfirmed) return;
    const fetchWorld = async () => {
      try { const res = await axios.get(`${API_URL}/api/world`); setWorldState(res.data); } catch (e) { console.error('Fetch error:', e); }
    };
    fetchWorld();
    const interval = setInterval(fetchWorld, 5000);
    return () => clearInterval(interval);
  }, [isConfirmed, setWorldState]);
  
  if (!isConfirmed) return <LiabilityShield />;
  
  return (
    <div className="app-container" data-testid="app-container">
      <WorldCanvas />
      <StatusBar />
      <div className="ui-overlay">
        <div className="ui-top-left"><AgentHUD /></div>
        <div className="ui-bottom-left"><CollectiveTerminal /></div>
      </div>
      <WorldMap />
      <CharacterImporter />
      <TierPanel />
      <div className="vignette" />
    </div>
  );
}
