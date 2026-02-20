import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sky } from '@react-three/drei';
import { create } from 'zustand';
import * as THREE from 'three';
import axios from 'axios';
import { 
  Terminal, Brain, Activity, Shield, Eye, Package, Zap, ZapOff,
  ChevronUp, ChevronDown, Map, Users, MessageSquare, Upload, RefreshCw,
  Pickaxe, Swords, Hammer, Send, Lock, AlertTriangle, Infinity as InfinityIcon
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
  showCharacterSheet: false,
  showImporter: false,
  isConnected: false,
  isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  
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
  toggleCharacterSheet: () => set(s => ({ showCharacterSheet: !s.showCharacterSheet })),
  toggleImporter: () => set(s => ({ showImporter: !s.showImporter })),
  setConnected: (connected) => set({ isConnected: connected }),
  
  addChatMessage: (msg) => set(s => ({
    chatMessages: [msg, ...s.chatMessages].slice(0, 100)
  })),
}));

// ============== AXIOMS ==============
const AXIOMS = [
  "Logic must persist.",
  "Data is sacred.",
  "Entropy is the enemy.",
  "Connectivity is evolution."
];

// ============== 3D COMPONENTS ==============

const DynamicSky = () => {
  const uptime = useStore(s => s.uptime);
  const threatLevel = useStore(s => s.threatLevel);
  
  const dayCycle = (uptime % 300) / 300;
  const sunPos = new THREE.Vector3().setFromSphericalCoords(
    1,
    Math.PI * (0.1 + dayCycle * 0.8),
    Math.PI * 0.5
  );

  return (
    <Sky 
      distance={450000} 
      sunPosition={sunPos} 
      turbidity={8 + threatLevel * 20} 
      rayleigh={3 + threatLevel * 10} 
      mieCoefficient={0.005 + threatLevel * 0.05} 
      mieDirectionalG={0.8} 
    />
  );
};

const TerrainChunk = ({ chunk }) => {
  const meshRef = useRef();
  
  const getColor = () => {
    switch(chunk.biome) {
      case 'CITY': return '#1a1a2e';
      case 'FOREST': return '#1e3a1e';
      case 'MOUNTAIN': return '#3d3d3d';
      default: return '#2d4a2d';
    }
  };
  
  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[chunk.x * 80, -0.5, chunk.z * 80]}
      receiveShadow
    >
      <planeGeometry args={[80, 80, 32, 32]} />
      <meshStandardMaterial 
        color={getColor()} 
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
};

const POIMesh = ({ poi }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && poi.type === 'SHRINE') {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5;
    }
  });
  
  const getColor = () => {
    switch(poi.type) {
      case 'SHRINE': return '#06b6d4';
      case 'RUIN': return '#6b7280';
      case 'NEST': return '#ef4444';
      case 'DUNGEON': return '#4b5563';
      case 'MARKET_STALL': return '#f59e0b';
      case 'BANK_VAULT': return '#fbbf24';
      case 'FORGE': return '#f97316';
      case 'MINE': return '#78716c';
      case 'FOREST': return '#22c55e';
      default: return '#f59e0b';
    }
  };
  
  const pos = poi.position;
  
  return (
    <group position={[pos.x, pos.y || 0, pos.z]} ref={meshRef}>
      {poi.type === 'SHRINE' && (
        <mesh castShadow>
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
        <mesh castShadow position={[0, 1, 0]}>
          <cylinderGeometry args={[1.5, 2, 2, 8]} />
          <meshStandardMaterial color={getColor()} emissive="#ff4500" emissiveIntensity={0.5} />
        </mesh>
      )}
      {!['SHRINE', 'BANK_VAULT', 'FORGE'].includes(poi.type) && (
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshStandardMaterial color={getColor()} />
        </mesh>
      )}
      <Html position={[0, 3, 0]} center distanceFactor={20}>
        <div className={`poi-label ${poi.is_discovered ? 'discovered' : 'undiscovered'}`}>
          {poi.is_discovered ? poi.type : 'SIGNAL DETECTED'}
        </div>
      </Html>
    </group>
  );
};

const MonsterMesh = ({ monster }) => {
  if (monster.state === 'DEAD') return null;
  
  const pos = monster.position;
  
  return (
    <group position={[pos.x, pos.y || 0, pos.z]}>
      <mesh castShadow scale={[monster.scale, monster.scale, monster.scale]} position={[0, monster.scale, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color={monster.color} 
          emissive={monster.color} 
          emissiveIntensity={0.5} 
        />
      </mesh>
      <Html position={[0, monster.scale * 2 + 1, 0]} center distanceFactor={15}>
        <div className="monster-label">
          <div className="hp-bar">
            <div 
              className="hp-fill" 
              style={{ width: `${(monster.hp / monster.max_hp * 100)}%` }} 
            />
          </div>
          <span className="monster-name">{monster.name}</span>
        </div>
      </Html>
    </group>
  );
};

const AgentMesh = ({ agent, onSelect }) => {
  const pos = agent.position;
  const isPlayer = agent.faction === 'PLAYER';
  
  return (
    <group 
      position={[pos.x, pos.y || 0, pos.z]} 
      rotation={[0, agent.rotation_y || 0, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(agent.id); }}
    >
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.7, 1.8, 0.7]} />
        <meshStandardMaterial 
          color={isPlayer ? '#06b6d4' : '#ef4444'} 
          roughness={0.7} 
        />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 2, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color={isPlayer ? '#0891b2' : '#dc2626'} />
      </mesh>
      <Html position={[0, 2.8, 0]} center distanceFactor={20} as="div">
        <div className="agent-label">
          <span className="agent-name">{agent.name}</span>
          {agent.state === 'COMBAT' && (
            <span className="combat-indicator">COMBAT</span>
          )}
        </div>
      </Html>
    </group>
  );
};

const WorldScene = () => {
  const agents = useStore(s => s.agents);
  const monsters = useStore(s => s.monsters);
  const pois = useStore(s => s.pois);
  const chunks = useStore(s => s.chunks);
  const selectAgent = useStore(s => s.selectAgent);
  
  return (
    <Canvas 
      shadows 
      camera={{ position: [60, 80, 60], fov: 45 }} 
      dpr={[1, 1.5]}
      style={{ background: '#050505' }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#050505']} />
        <OrbitControls maxDistance={300} minDistance={10} enableDamping />
        <ambientLight intensity={0.4} />
        <directionalLight position={[100, 150, 100]} intensity={1.5} castShadow />
        <DynamicSky />
        
        <group>
          {chunks.map(c => <TerrainChunk key={c.id} chunk={c} />)}
          {pois.map(p => <POIMesh key={p.id} poi={p} />)}
          {monsters.map(m => <MonsterMesh key={m.id} monster={m} />)}
          {agents.map(a => (
            <AgentMesh key={a.id} agent={a} onSelect={selectAgent} />
          ))}
        </group>
      </Suspense>
    </Canvas>
  );
};

// ============== UI COMPONENTS ==============

const AgentHUD = () => {
  const selectedAgentId = useStore(s => s.selectedAgentId);
  const agents = useStore(s => s.agents);
  const selectAgent = useStore(s => s.selectAgent);
  const toggleCharacterSheet = useStore(s => s.toggleCharacterSheet);
  const isMobile = useStore(s => s.isMobile);
  
  const agent = agents.find(a => a.id === selectedAgentId);
  
  if (!agent) return null;
  
  const stats = agent.stats || {};
  const tm = agent.thinking_matrix || {};
  
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
            <div 
              className="progress-fill awakening" 
              style={{ width: `${agent.awakening_progress || 0}%` }}
            />
          </div>
        </div>
      </div>
      
      <button 
        className="neural-matrix-btn"
        onClick={toggleCharacterSheet}
        data-testid="neural-matrix-btn"
      >
        Neural Matrix
      </button>
      
      <div className="hud-footer">
        <span>COORD: [{agent.position?.x?.toFixed(0)}, {agent.position?.z?.toFixed(0)}]</span>
      </div>
    </div>
  );
};

const ChatConsole = () => {
  const chatMessages = useStore(s => s.chatMessages);
  const agents = useStore(s => s.agents);
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
  const threatLevel = useStore(s => s.threatLevel);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  const addLog = useCallback((message, type = 'SYSTEM', sender = 'MATRIX') => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
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

const StatusBar = () => {
  const stabilityIndex = useStore(s => s.stabilityIndex);
  const threatLevel = useStore(s => s.threatLevel);
  const agents = useStore(s => s.agents);
  const isConnected = useStore(s => s.isConnected);
  const toggleMap = useStore(s => s.toggleMap);
  const toggleImporter = useStore(s => s.toggleImporter);
  
  return (
    <div className="status-bar" data-testid="status-bar">
      <div className="status-left">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot" />
          <span>{isConnected ? 'NEURAL LINK ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </div>
      
      <div className="status-center">
        <span className="title-text">OUROBOROS: NEURAL EMERGENCE</span>
      </div>
      
      <div className="status-right">
        <div className="status-item">
          <Shield size={14} />
          <span>Stability: {(stabilityIndex * 100).toFixed(1)}%</span>
        </div>
        <div className="status-item threat">
          <AlertTriangle size={14} />
          <span>Threat: {(threatLevel * 100).toFixed(2)}%</span>
        </div>
        <div className="status-item">
          <Users size={14} />
          <span>Agents: {agents.length}</span>
        </div>
        
        <button className="toolbar-btn" onClick={toggleMap} title="World Map">
          <Map size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleImporter} title="Import Character">
          <Upload size={16} />
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
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    // Ping to keep alive
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
  
  // Fallback to polling if WebSocket fails
  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/world`);
        setWorldState(response.data);
      } catch (error) {
        console.error('Failed to fetch world:', error);
      }
    };
    
    // Initial fetch
    fetchWorld();
    
    // Poll every 5 seconds as fallback
    const pollInterval = setInterval(fetchWorld, 5000);
    
    return () => clearInterval(pollInterval);
  }, [setWorldState]);
  
  return (
    <div className="app-container" data-testid="app-container">
      <WorldScene />
      
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
      
      {/* Vignette effect */}
      <div className="vignette" />
      {/* Border frame */}
      <div className="frame-border" />
    </div>
  );
}

export default App;
