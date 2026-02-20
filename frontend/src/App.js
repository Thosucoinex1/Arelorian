import React, { useEffect, useRef, useState, useCallback } from 'react';
import { create } from 'zustand';
import axios from 'axios';
import { 
  Terminal, Brain, Activity, Shield, Eye, Package, Zap,
  ChevronUp, ChevronDown, Map, Users, MessageSquare, Upload, 
  Send, AlertTriangle, Sword, Crown, Star, Layers
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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
  showInventory: false,
  showTierInfo: false,
  isConnected: false,
  isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  cameraOffset: { x: 0, z: 0 },
  zoom: 1,
  currentNotary: null,
  itemSets: {},
  
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
  toggleInventory: () => set(s => ({ showInventory: !s.showInventory })),
  toggleTierInfo: () => set(s => ({ showTierInfo: !s.showTierInfo })),
  setConnected: (connected) => set({ isConnected: connected }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
  setNotary: (notary) => set({ currentNotary: notary }),
  setItemSets: (sets) => set({ itemSets: sets }),
}));

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
  
  // World to screen coordinates
  const worldToScreen = useCallback((wx, wz, canvas) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 4 * zoom;
    
    return {
      x: centerX + (wx - cameraOffset.x) * scale,
      y: centerY + (wz - cameraOffset.z) * scale
    };
  }, [cameraOffset, zoom]);
  
  // Screen to world coordinates
  const screenToWorld = useCallback((sx, sy, canvas) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 4 * zoom;
    
    return {
      x: (sx - centerX) / scale + cameraOffset.x,
      z: (sy - centerY) / scale + cameraOffset.z
    };
  }, [cameraOffset, zoom]);
  
  // Handle mouse events
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
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  };
  
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy, canvas);
    
    // Check if clicked on an agent
    for (const agent of agents) {
      const pos = agent.position;
      const dist = Math.hypot(pos.x - worldPos.x, pos.z - worldPos.z);
      if (dist < 3) {
        selectAgent(agent.id);
        return;
      }
    }
    
    selectAgent(null);
  };
  
  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const render = () => {
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const scale = 4 * zoom;
      
      // Draw chunks (terrain)
      chunks.forEach(chunk => {
        const { x, y } = worldToScreen(chunk.x * 80, chunk.z * 80, canvas);
        const size = 80 * scale;
        
        let color;
        switch(chunk.biome) {
          case 'CITY': color = '#1a1a2e'; break;
          case 'FOREST': color = '#1e3a1e'; break;
          case 'MOUNTAIN': color = '#2d2d2d'; break;
          default: color = '#1a2a1a';
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        if (chunk.biome === 'CITY') {
          ctx.fillStyle = 'rgba(139,92,246,0.3)';
          ctx.fillRect(x - size/2, y - size/2, size, size);
          ctx.fillStyle = '#fff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SANCTUARY', x, y);
        }
      });
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      for (let gx = -500; gx <= 500; gx += 20) {
        const { x: sx1 } = worldToScreen(gx, -500, canvas);
        const { x: sx2 } = worldToScreen(gx, 500, canvas);
        const { y: sy1 } = worldToScreen(0, -500, canvas);
        const { y: sy2 } = worldToScreen(0, 500, canvas);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
      
      // Draw POIs
      pois.forEach(poi => {
        const { x, y } = worldToScreen(poi.position.x, poi.position.z, canvas);
        
        let color;
        switch(poi.type) {
          case 'SHRINE': color = '#06b6d4'; break;
          case 'BANK_VAULT': color = '#fbbf24'; break;
          case 'FORGE': color = '#f97316'; break;
          case 'MINE': color = '#78716c'; break;
          case 'DUNGEON': color = '#4b5563'; break;
          case 'NEST': color = '#ef4444'; break;
          case 'RUIN': color = '#6b7280'; break;
          default: color = '#f59e0b';
        }
        
        // Draw POI marker
        const size = poi.type === 'BANK_VAULT' || poi.type === 'FORGE' ? 16 : 10;
        
        if (poi.type === 'SHRINE') {
          // Diamond shape
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size * 0.7, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size * 0.7, y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.stroke();
        } else {
          // Square
          ctx.fillStyle = color;
          ctx.fillRect(x - size/2, y - size/2, size, size);
        }
        
        // Label
        ctx.fillStyle = poi.is_discovered ? 'rgba(255,255,255,0.6)' : color;
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(poi.is_discovered ? poi.type : '???', x, y - size - 4);
      });
      
      // Draw monsters
      monsters.forEach(monster => {
        if (monster.state === 'DEAD') return;
        
        const { x, y } = worldToScreen(monster.position.x, monster.position.z, canvas);
        const size = 8 * monster.scale;
        
        // Body
        ctx.fillStyle = monster.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowColor = monster.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // HP bar
        const hpWidth = 20;
        const hpHeight = 3;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - hpWidth/2, y - size - 8, hpWidth, hpHeight);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - hpWidth/2, y - size - 8, hpWidth * (monster.hp / monster.max_hp), hpHeight);
        
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(monster.name, x, y + size + 12);
      });
      
      // Draw agents
      agents.forEach(agent => {
        const { x, y } = worldToScreen(agent.position.x, agent.position.z, canvas);
        const isPlayer = agent.faction === 'PLAYER';
        const isSelected = useStore.getState().selectedAgentId === agent.id;
        
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
        
        // Direction indicator
        const rot = agent.rotation_y || 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(rot) * 15, y - Math.cos(rot) * 15);
        ctx.stroke();
        
        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const nameWidth = ctx.measureText(agent.name).width + 8;
        ctx.fillRect(x - nameWidth/2, y - 28, nameWidth, 14);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, x, y - 18);
        
        // State indicator
        if (agent.state !== 'IDLE') {
          ctx.fillStyle = agent.state === 'COMBAT' ? '#ef4444' : '#06b6d4';
          ctx.font = '7px sans-serif';
          ctx.fillText(agent.state, x, y + 22);
        }
        
        // Awakened indicator
        if (agent.is_awakened) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + 12, y - 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Draw compass
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', canvas.width / 2, 20);
      
      // Coordinates
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${cameraOffset.x.toFixed(0)}, ${cameraOffset.z.toFixed(0)}] zoom: ${zoom.toFixed(1)}x`, 10, canvas.height - 10);
      
      animationId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
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
  const isMobile = useStore(s => s.isMobile);
  
  const agent = agents.find(a => a.id === selectedAgentId);
  
  if (!agent) return null;
  
  return (
    <div className={`agent-hud ${isMobile ? 'mobile' : ''}`} data-testid="agent-hud">
      <div className="hud-header">
        <button className="close-btn" onClick={() => selectAgent(null)}>×</button>
      </div>
      
      <h2 className="agent-title">{agent.name}</h2>
      <div className="agent-meta">
        <span className="level-badge">LVL {agent.level}</span>
        <span className="state-badge">{agent.state}</span>
        {agent.is_awakened && (
          <span className="awakened-badge">
            <Zap size={10} /> Awakened
          </span>
        )}
      </div>
      
      {agent.last_decision && (
        <div className="decision-box">
          <div className="decision-header">
            <Brain size={12} /> {agent.last_decision.decision}
          </div>
          <div className="decision-text">{agent.last_decision.justification}</div>
        </div>
      )}
      
      <div className="stats-grid">
        <div className="stat-item">
          <Eye size={12} className="stat-icon" />
          <span className="stat-label">Vision</span>
          <span className="stat-value">{agent.vision_range?.toFixed(0)}u</span>
        </div>
        <div className="stat-item">
          <Package size={12} className="stat-icon" />
          <span className="stat-label">Gold</span>
          <span className="stat-value">{agent.gold}</span>
        </div>
      </div>
      
      <div className="progress-section">
        <div className="progress-item">
          <div className="progress-header">
            <span>Matrix Integrity</span>
            <span className={agent.integrity < 0.3 ? 'critical' : ''}>
              {((agent.integrity || 1) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill integrity" 
              style={{ width: `${(agent.integrity || 1) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="progress-item">
          <div className="progress-header">
            <span>Conscious Expansion</span>
            <span>{((agent.consciousness_level || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill consciousness" 
              style={{ width: `${(agent.consciousness_level || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="hud-footer">
        <span>COORD: [{agent.position?.x?.toFixed(0)}, {agent.position?.z?.toFixed(0)}]</span>
      </div>
    </div>
  );
};

const ChatConsole = () => {
  const chatMessages = useStore(s => s.chatMessages);
  const [activeTab, setActiveTab] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isExpanded]);
  
  const filteredMessages = activeTab === 'ALL' 
    ? chatMessages 
    : chatMessages.filter(m => m.channel === activeTab);
  
  const isGerman = (text) => /der|die|das|und|ist|ich|nicht/i.test(text || '');
  
  return (
    <div className={`chat-console ${isExpanded ? 'expanded' : 'collapsed'}`} data-testid="chat-console">
      <div className="chat-header">
        <div className="chat-tabs">
          {['ALL', 'LOCAL', 'THOUGHT', 'SYSTEM'].map(tab => (
            <button 
              key={tab}
              className={`chat-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="expand-btn" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      
      {isExpanded && (
        <div ref={scrollRef} className="chat-messages">
          {filteredMessages.map(msg => {
            const isCognition = msg.channel === 'THOUGHT';
            return (
              <div key={msg.id} className={`chat-message ${isCognition ? 'thought' : ''}`}>
                <div className="message-header">
                  <span className="sender-name">{msg.sender_name}</span>
                  <span className="language-tag">{isGerman(msg.content) ? 'DE' : 'EN'}</span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NeuralTerminal = () => {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const stabilityIndex = useStore(s => s.stabilityIndex);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  const addLog = useCallback((message, type = 'SYSTEM', sender = 'MATRIX') => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message,
      type,
      sender
    }].slice(-50));
  }, []);
  
  useEffect(() => {
    addLog('Neural Terminal initialisiert', 'SYSTEM');
    addLog(`Stability Index: ${(stabilityIndex * 100).toFixed(1)}%`, 'AXIOM');
  }, []);
  
  const handleSend = () => {
    if (!input.trim()) return;
    addLog(input, 'AXIOM', 'OVERSEER');
    setInput('');
  };
  
  return (
    <div className="neural-terminal" data-testid="neural-terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <Terminal size={16} />
          <div>
            <span className="title-main">Axiom Neural Terminal</span>
            <span className="title-sub">SYSTEM://RECURSIVE_DYNAMICS</span>
          </div>
        </div>
        <Activity size={16} className="pulse-icon" />
      </div>
      
      <div ref={scrollRef} className="terminal-logs">
        {logs.map(log => (
          <div key={log.id} className="log-entry">
            <div className="log-meta">
              <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`log-sender ${log.sender === 'NOTAR' ? 'notar' : 'system'}`}>
                {log.sender}
              </span>
            </div>
            <div className={`log-message ${log.type.toLowerCase()}`}>{log.message}</div>
          </div>
        ))}
      </div>
      
      <div className="terminal-input">
        <input
          type="text"
          placeholder="Sende Impuls an Matrix..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>
          <Send size={16} />
        </button>
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
  
  const mapSize = 400;
  const scale = 2;
  
  return (
    <div className="world-map-overlay" onClick={toggleMap} data-testid="world-map">
      <div className="world-map-container" onClick={e => e.stopPropagation()}>
        <h2>WORLD PROJECTION</h2>
        
        <div className="map-canvas" style={{ width: mapSize, height: mapSize }}>
          {chunks.map(chunk => (
            <div
              key={chunk.id}
              className={`map-chunk ${chunk.biome.toLowerCase()}`}
              style={{
                width: 80 * scale,
                height: 80 * scale,
                left: (mapSize / 2) + (chunk.x * 80 * scale) - (40 * scale),
                top: (mapSize / 2) + (chunk.z * 80 * scale) - (40 * scale),
              }}
            >
              {chunk.biome === 'CITY' && <span>SANCTUARY</span>}
            </div>
          ))}
          
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`map-agent ${agent.faction.toLowerCase()}`}
              style={{
                left: (mapSize / 2) + (agent.position?.x || 0) * scale,
                top: (mapSize / 2) + (agent.position?.z || 0) * scale,
              }}
              title={`${agent.name} (${agent.faction})`}
            />
          ))}
          
          <div className="map-crosshair-h" />
          <div className="map-crosshair-v" />
        </div>
        
        <div className="map-footer">Click anywhere outside to close</div>
      </div>
    </div>
  );
};

const CharacterImporter = () => {
  const showImporter = useStore(s => s.showImporter);
  const toggleImporter = useStore(s => s.toggleImporter);
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
        
        <h2>
          <Upload size={20} />
          Character Import
        </h2>
        <p className="importer-subtitle">
          Import agents from JanitorAI or CharacterAI JSON exports
        </p>
        
        <div className="source-selector">
          <button 
            className={source === 'janitorai' ? 'active' : ''}
            onClick={() => setSource('janitorai')}
          >
            JanitorAI
          </button>
          <button 
            className={source === 'characterai' ? 'active' : ''}
            onClick={() => setSource('characterai')}
          >
            CharacterAI
          </button>
          <button 
            className={source === 'custom' ? 'active' : ''}
            onClick={() => setSource('custom')}
          >
            Custom JSON
          </button>
        </div>
        
        <textarea
          placeholder={`Paste your ${source} JSON export here...

Example format:
{
  "name": "Agent Name",
  "description": "Character description and lore",
  "personality": {
    "primary": "Wise",
    "sociability": 0.8,
    "aggression": 0.2
  },
  "stats": {
    "str": 12,
    "agi": 10,
    "int": 15,
    "vit": 10
  }
}`}
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
        />
        
        {result && (
          <div className={`import-result ${result.success ? 'success' : 'error'}`}>
            {result.success 
              ? `Agent "${result.agent.name}" imported successfully!`
              : `Error: ${result.error}`
            }
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

const TierInfoPanel = () => {
  const showTierInfo = useStore(s => s.showTierInfo);
  const toggleTierInfo = useStore(s => s.toggleTierInfo);
  const [notary, setNotary] = useState(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const tiers = [
    { level: 1, name: 'Autosave', desc: 'Jede Interaktion wird persistent gespeichert', color: '#6b7280' },
    { level: 2, name: 'Duden-Entry', desc: 'Der Notar wird Teil der permanenten Lore', color: '#06b6d4' },
    { level: 3, name: 'Universal Key', desc: 'Zugriff auf externe Emanationen', color: '#fbbf24' }
  ];
  
  const handleLogin = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    
    try {
      // Try to get existing notary
      const response = await axios.get(`${API_URL}/api/notaries/${userId}`);
      setNotary(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // Create new notary
        const createResponse = await axios.post(`${API_URL}/api/notaries`, {
          user_id: userId,
          email: `${userId}@ouroboros.net`
        });
        setNotary(createResponse.data);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpgrade = async () => {
    if (!notary || notary.tier >= 3) return;
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/notaries/${notary.user_id}/upgrade`);
      setNotary({
        ...notary,
        tier: response.data.new_tier,
        tier_name: response.data.tier_name,
        has_universal_key: response.data.new_tier >= 3
      });
      
      if (response.data.universal_key) {
        alert(`Universal Key Unlocked!\n${response.data.universal_key}`);
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!showTierInfo) return null;
  
  return (
    <div className="tier-overlay" onClick={toggleTierInfo} data-testid="tier-panel">
      <div className="tier-container" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={toggleTierInfo}>×</button>
        
        <h2><Crown size={20} /> Notary Tier System</h2>
        <p className="tier-subtitle">Axiom III: Punctuation - Kausalitätssicherung</p>
        
        {!notary ? (
          <div className="tier-login">
            <input
              type="text"
              placeholder="Enter your Firebase UID or Username"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
            <button onClick={handleLogin} disabled={loading || !userId.trim()}>
              {loading ? 'Loading...' : 'Access Duden-Register'}
            </button>
          </div>
        ) : (
          <div className="tier-info">
            <div className="current-tier">
              <span className="tier-label">Current Tier:</span>
              <span className="tier-value" style={{ color: tiers[notary.tier - 1]?.color }}>
                {notary.tier_name || tiers[notary.tier - 1]?.name}
              </span>
            </div>
            
            <div className="tier-levels">
              {tiers.map(tier => (
                <div 
                  key={tier.level} 
                  className={`tier-level ${notary.tier >= tier.level ? 'unlocked' : 'locked'}`}
                  style={{ borderColor: notary.tier >= tier.level ? tier.color : '#333' }}
                >
                  <div className="tier-header">
                    <Star size={14} style={{ color: tier.color }} />
                    <span>Tier {tier.level}: {tier.name}</span>
                  </div>
                  <p>{tier.desc}</p>
                  {notary.tier >= tier.level && (
                    <span className="unlocked-badge">UNLOCKED</span>
                  )}
                </div>
              ))}
            </div>
            
            {notary.tier < 3 && (
              <button className="upgrade-btn" onClick={handleUpgrade} disabled={loading}>
                {loading ? 'Upgrading...' : `Upgrade to Tier ${notary.tier + 1}`}
              </button>
            )}
            
            {notary.has_universal_key && (
              <div className="universal-key-info">
                <Zap size={14} />
                <span>Universal Key Active - External Emanations Enabled</span>
              </div>
            )}
          </div>
        )}
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
  const toggleTierInfo = useStore(s => s.toggleTierInfo);
  
  return (
    <div className="status-bar" data-testid="status-bar">
      <div className="status-left">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot" />
          <span>{isConnected ? 'DUDEN-REGISTER ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </div>
      
      <div className="status-center">
        <span className="title-text">OUROBOROS: NEURAL EMERGENCE</span>
        <span className="db-badge">PostgreSQL v2.0</span>
      </div>
      
      <div className="status-right">
        <div className="status-item">
          <Shield size={14} />
          <span>Stability: {(stabilityIndex * 100).toFixed(1)}%</span>
        </div>
        <div className={`status-item ${threatLevel > 0.5 ? 'danger' : 'threat'}`}>
          <AlertTriangle size={14} />
          <span>Corruption: {(threatLevel * 100).toFixed(1)}%</span>
        </div>
        <div className="status-item">
          <Users size={14} />
          <span>Agents: {agents.length}</span>
        </div>
        
        <button className="toolbar-btn" onClick={toggleMap} title="World Map (35x35)">
          <Map size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleImporter} title="Import Character">
          <Upload size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleTierInfo} title="Tier System">
          <Crown size={16} />
        </button>
      </div>
    </div>
  );
};

// ============== MAIN APP ==============

function App() {
  const setWorldState = useStore(s => s.setWorldState);
  const setConnected = useStore(s => s.setConnected);
  const wsRef = useRef(null);
  
  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws';
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'initial_state' || data.type === 'world_update') {
            setWorldState(data);
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [setWorldState, setConnected]);
  
  // Fallback polling
  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/world`);
        setWorldState(response.data);
      } catch (error) {
        console.error('Failed to fetch world:', error);
      }
    };
    
    fetchWorld();
    const pollInterval = setInterval(fetchWorld, 5000);
    
    return () => clearInterval(pollInterval);
  }, [setWorldState]);
  
  return (
    <div className="app-container" data-testid="app-container">
      <WorldCanvas />
      
      <StatusBar />
      
      <div className="ui-overlay">
        <div className="ui-top-left">
          <AgentHUD />
        </div>
        
        <div className="ui-bottom-left">
          <ChatConsole />
          <NeuralTerminal />
        </div>
      </div>
      
      <WorldMap />
      <CharacterImporter />
      
      <div className="vignette" />
      <div className="frame-border" />
    </div>
  );
}

export default App;
