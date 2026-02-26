import { useState, useEffect } from 'react';
import { useStore } from '../store';

// Placeholder Components (will be fleshed out later)
const Header = () => {
  const toggleDeveloperTools = useStore(state => state.toggleDeveloperTools);
  return (
    <header id="header" className="grid-area-header flex items-center gap-arl-lg px-arl-lg bg-arl-deep border-b border-arl-border relative z-100">
      <div className="font-display text-base text-arl-gold text-shadow-arl-gold-glow tracking-wide whitespace-nowrap">
        Arelorian
        <span className="text-arl-text-muted font-code text-xs tracking-widest ml-2">DEV STUDIO v0.9.4</span>
      </div>

      <nav className="flex gap-0.5 ml-2">
        <button className="px-3 py-1 bg-none border border-transparent text-arl-text-secondary font-heading text-xs tracking-wider cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow active">World</button>
        <button className="px-3 py-1 bg-none border border-transparent text-arl-text-secondary font-heading text-xs tracking-wider cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Agents</button>
        <button className="px-3 py-1 bg-none border border-transparent text-arl-text-secondary font-heading text-xs tracking-wider cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Registry</button>
        <button className="px-3 py-1 bg-none border border-transparent text-arl-text-secondary font-heading text-xs tracking-wider cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Lore Engine</button>
        <button className="px-3 py-1 bg-none border border-transparent text-arl-text-secondary font-heading text-xs tracking-wider cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Netzwerk</button>
      </nav>

      <div className="flex-1"></div>

      {/* Circuit Breaker Widget */}
      <div className="flex items-center gap-arl-sm px-3 py-1 bg-arl-surface border border-arl-border-glow rounded-arl-md cursor-pointer transition-all duration-fast hover:border-arl-warn">
        <div className="font-code text-xs text-arl-text-secondary tracking-widest">⚡ BUDGET</div>
        <div>
          <div className="w-15 h-1 bg-arl-border rounded-xs overflow-hidden">
            <div className="h-full bg-arl-ok rounded-xs transition-all duration-1000" style={{ width: '38%' }}></div>
          </div>
        </div>
        <div className="font-code text-sm font-bold text-arl-ok">0.76€ / 2€</div>
      </div>

      <button onClick={() => toggleDeveloperTools(false)} className="px-3.5 py-1.5 bg-gradient-to-br from-arl-arcane to-arl-arcane-mid border border-arl-arcane text-white font-heading text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast shadow-arl-arcane-glow hover:shadow-arl-arcane-glow-lg hover:brightness-125">
        ⟡ Agent Spawn
      </button>
    </header>
  );
};

const Sidebar = () => {
  // Mock data based on the provided HTML's script
  const AGENT_TEMPLATES = [
    { id:'dm',       name:'Dungeon Master',    icon:'🎭', type:'arcane', model:'flash-2.5', tags:['core_lore','narrative'] },
    { id:'builder',  name:'World Builder',     icon:'🗺',  type:'gold',   model:'flash-2.5', tags:['routine','geography'] },
    { id:'npc',      name:'NPC Composer',      icon:'🧙',  type:'teal',   model:'flash-2.5', tags:['routine','dialog'] },
    { id:'artdir',   name:'Art Director',      icon:'🎨',  type:'arcane', model:'flash-2.5', tags:['critique','ux'] },
    { id:'security', name:'Security Monitor',  icon:'🛡',  type:'blood',  model:'flash-2.5', tags:['safety'] },
  ];

  const AGENT_TASKS = [
    'Generiert Quest: "Das Flüstern der Tiefe"',
    'Erstellt Tilemap: Nordwald Sektor 7',
    'NPC-Dialog: Händlerin Liris aktualisiert',
    'Bewertet UI-Molekül #MLC-047',
    'Firestore Security Rules geprüft',
  ];

  const WORLD_STATS = {
    'Spieler online': '1247',
    'NPCs aktiv': '8341',
    'Aktive Zonen': '23',
    'Laufende Events': '7',
    'Offene Dungeons': '4',
    'Wetter': 'Arcane Sturm',
    'Lore-Epoche': 'Dritte Ära, Tag 1403',
    'Genkit Flows/min': '34',
    'Firestore Writes/s': '12.4',
    'GitHub Commits h': '7',
  };

  const [agents, setAgents] = useState<any[]>([]);
  const [llmStats, setLlmStats] = useState({ 
    flashCalls: 147, 
    reasonCalls: 12,
    avgLatency: 342,
    avgTokens: 892,
    confidence: 98.2,
    throughput: 12.4
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLlmStats(prev => ({
        ...prev,
        flashCalls: prev.flashCalls + (Math.random() > 0.7 ? 1 : 0),
        avgLatency: Math.floor(300 + Math.random() * 100),
        confidence: Number((97 + Math.random() * 2.5).toFixed(1)),
        throughput: Number((10 + Math.random() * 5).toFixed(1))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setAgents(AGENT_TEMPLATES.map(t => ({
      ...t,
      status: Math.random() > 0.2 ? 'active' : 'idle',
      task: AGENT_TASKS[Math.floor(Math.random() * AGENT_TASKS.length)],
      dotState: Math.random() > 0.3 ? 'active' : 'ok',
    })));
  }, []);

  const activeAgents = agents.filter(a => a.status === 'active').length;

  const getAgentIconBg = (type: string) => {
    switch (type) {
      case 'arcane': return 'from-arl-arcane to-arl-arcane-mid';
      case 'gold': return 'from-arl-gold to-arl-gold-dim';
      case 'teal': return 'from-arl-teal to-arl-teal-dim';
      case 'blood': return 'from-arl-blood to-arl-blood-dim';
      case 'sage': return 'from-arl-sage to-arl-sage-bright';
      default: return 'from-arl-surface to-arl-elevated';
    }
  };

  return (
    <aside id="sidebar" className="grid-area-sidebar bg-arl-deep border-r border-arl-border flex flex-col overflow-hidden">
      {/* Active Agents */}
      <div className="border-b border-arl-border flex-shrink-0">
        <div className="flex items-center justify-between px-arl-md py-arl-sm cursor-pointer select-none">
          <h3 className="font-heading text-[9px] font-semibold tracking-[0.15em] text-arl-text-muted uppercase">Aktive Agenten</h3>
          <span className="text-arl-text-muted text-xs">{activeAgents}/{agents.length}</span>
        </div>
        <div className="p-arl-md pt-0">
          <div className="space-y-arl-sm">
            {agents.map((a: any) => (
              <div key={a.id} className={`flex items-start gap-arl-sm p-arl-sm bg-arl-surface border border-arl-border rounded-arl-md transition-colors duration-fast ${a.status === 'idle' ? 'opacity-60' : 'hover:border-arl-border-glow'}`}>
                <div className={`w-7 h-7 flex-shrink-0 rounded-arl-sm flex items-center justify-center text-sm bg-gradient-to-br ${getAgentIconBg(a.type)}`}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[10px] font-semibold text-arl-text-primary tracking-wider">{a.name}</div>
                  <div className="font-code text-[9px] text-arl-text-secondary mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{a.status === 'idle' ? 'Bereit...' : a.task}</div>
                  <div className="font-code text-[8px] text-arl-text-muted mt-1">{a.model}</div>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${a.status === 'idle' ? 'bg-arl-text-muted' : 'bg-arl-arcane animate-pulse'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LLM Telemetry & Router */}
      <div className="border-b border-arl-border flex-shrink-0">
        <div className="flex items-center justify-between px-arl-md py-arl-sm cursor-pointer select-none">
          <h3 className="font-heading text-[9px] font-semibold tracking-[0.15em] text-arl-text-muted uppercase">LLM Telemetry (Genkit)</h3>
          <span className="text-arl-ok text-xs">● Live</span>
        </div>
        <div className="p-arl-md pt-0">
          <div className="grid grid-cols-2 gap-arl-sm">
            <div className="p-2 bg-arl-surface border border-arl-border rounded-arl-md">
              <div className="font-code text-[8px] font-bold text-arl-gold tracking-wider">FLASH-2.5</div>
              <div className="font-code text-lg font-light text-arl-text-primary">{llmStats.flashCalls}</div>
              <div className="font-code text-[7px] text-arl-text-muted tracking-widest">ROUTINE</div>
            </div>
            <div className="p-2 bg-arl-surface border border-arl-border rounded-arl-md">
              <div className="font-code text-[8px] font-bold text-arl-gold tracking-wider">REASONING</div>
              <div className="font-code text-lg font-light text-arl-text-primary">{llmStats.reasonCalls}</div>
              <div className="font-code text-[7px] text-arl-text-muted tracking-widest">TIER 2+</div>
            </div>
          </div>
          <div className="mt-arl-sm font-code text-[9px] space-y-0.5">
             <div className="flex justify-between"><span className="text-arl-text-secondary">Avg Latency:</span> <span className="text-arl-teal">{llmStats.avgLatency}ms</span></div>
             <div className="flex justify-between"><span className="text-arl-text-secondary">Avg Tokens:</span> <span className="text-arl-text-muted">{llmStats.avgTokens}</span></div>
             <div className="flex justify-between"><span className="text-arl-text-secondary">Confidence:</span> <span className="text-arl-ok">{llmStats.confidence}%</span></div>
             <div className="flex justify-between"><span className="text-arl-text-secondary">Throughput:</span> <span className="text-arl-gold">{llmStats.throughput} t/s</span></div>
          </div>
        </div>
      </div>

      {/* World Stats */}
      <div className="flex-1 overflow-y-auto p-arl-md custom-scrollbar">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-[9px] font-semibold tracking-[0.15em] text-arl-text-muted uppercase">Weltzustand</h3>
        </div>
        <div className="mt-arl-sm">
          {Object.entries(WORLD_STATS).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-1 border-b border-arl-border last:border-b-0">
              <span className="font-code text-[9px] text-arl-text-muted tracking-wider">{key}</span>
              <span className="font-code text-[9px] font-bold text-arl-teal">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
const CanvasArea = () => (
  <main id="canvas-area" className="grid-area-canvas relative overflow-hidden bg-arl-void">
    <canvas id="world-canvas" className="absolute inset-0 w-full h-full"></canvas>

    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-arl-sm px-4 py-1.5 bg-arl-deep/90 border border-arl-border-glow rounded-arl-xl backdrop-blur-md z-10">
      <button className="px-2.5 py-1 bg-none border border-transparent text-arl-text-secondary font-code text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow active">Karte</button>
      <button className="px-2.5 py-1 bg-none border border-transparent text-arl-text-secondary font-code text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Entitäten</button>
      <button className="px-2.5 py-1 bg-none border border-transparent text-arl-text-secondary font-code text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Kollision</button>
      <button className="px-2.5 py-1 bg-none border border-transparent text-arl-text-secondary font-code text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">Lore-Layer</button>
      <button className="px-2.5 py-1 bg-none border border-transparent text-arl-text-secondary font-code text-xs tracking-widest cursor-pointer rounded-arl-sm transition-all duration-fast hover:text-arl-text-primary hover:border-arl-border-glow">⏳ Chronos</button>
    </div>

    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-arl-deep/85 border border-arl-border-glow rounded-arl-md font-code text-xs text-arl-text-secondary backdrop-blur-sm z-10">
      SeqID: <span id="seq-id">004821</span> &nbsp;|&nbsp;
      Keyframe: <span id="kf-id">KF-089</span> &nbsp;|&nbsp;
      Δ: <span id="delta-events">3 Events</span>
    </div>
  </main>
);

const Inspector = () => {
  const [activeTab, setActiveTab] = useState('Registry');

  // Mock data for a selected entity
  const selectedEntity = {
    id: 'NPC-LIRIS-001',
    name: 'Händlerin Liris',
    type: 'NPC',
    icon: '🧙',
    iconBg: 'bg-gradient-to-br from-arl-teal to-arl-teal-dim',
    properties: {
      'Position': '124.5, 88.1, 12.0',
      'State': 'Handel',
      'Health': '100/100',
      'Mana': '50/50',
      'Inventory Slots': '12/24',
      'Gold': '1240',
      'Faction': 'Händlergilde',
      'Quest-Status': '"Das Flüstern der Tiefe" (Schritt 2)',
    },
    tags: ['Händler', 'Questgeber', 'Nordwald'],
    thoughts: [
      { time: '10:52:01', type: 'COGNITION', content: 'Analysiere Marktpreise für SUNLEAF_HERB. Trend: Steigend.', tokens: 412, latency: 280, confidence: 0.98 },
      { time: '10:53:15', type: 'DECISION', content: 'Preisanpassung für Heiltränke initiiert (+5%). Grund: Rohstoffknappheit.', tokens: 890, latency: 1240, confidence: 0.92 },
      { time: '10:54:30', type: 'SOCIAL', content: 'Interaktion mit Aurelius. Status: Neutral. Austausch von Gerüchten über Nordwald.', tokens: 560, latency: 450, confidence: 0.95 },
      { time: '10:55:02', type: 'ROUTINE', content: 'Inventar-Check abgeschlossen. 12/24 Slots belegt.', tokens: 120, latency: 110, confidence: 1.0 },
    ]
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Registry':
        return (
          <div>
            <div className="flex items-center gap-arl-sm p-arl-sm bg-arl-surface border border-arl-border rounded-arl-md mb-arl-md">
              <div className={`w-8 h-8 flex-shrink-0 rounded-arl-sm flex items-center justify-center text-lg ${selectedEntity.iconBg}`}>{selectedEntity.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-heading text-xs font-semibold text-arl-text-primary tracking-wider">{selectedEntity.name}</div>
                <div className="font-code text-[9px] text-arl-text-muted mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">ID: {selectedEntity.id}</div>
              </div>
            </div>
            <div className="space-y-1">
              {Object.entries(selectedEntity.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1.5 px-arl-sm bg-arl-surface rounded-arl-sm">
                  <span className="font-code text-[9px] text-arl-text-secondary tracking-wider">{key}</span>
                  <span className="font-code text-[9px] font-bold text-arl-text-primary">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-arl-md">
              <h4 className="font-heading text-[9px] font-semibold tracking-[0.15em] text-arl-text-muted uppercase mb-arl-sm">Tags</h4>
              <div className="flex flex-wrap gap-arl-sm">
                {selectedEntity.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-arl-elevated border border-arl-border rounded-arl-sm font-code text-[9px] text-arl-text-secondary">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Thoughts':
        return (
          <div className="space-y-arl-sm">
            {selectedEntity.thoughts.map((thought, i) => (
              <div key={i} className="p-arl-sm bg-arl-surface border border-arl-border rounded-arl-md">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-code text-[8px] px-1 rounded ${
                    thought.type === 'DECISION' ? 'bg-arl-gold/20 text-arl-gold' :
                    thought.type === 'COGNITION' ? 'bg-arl-arcane/20 text-arl-arcane' :
                    'bg-arl-teal/20 text-arl-teal'
                  }`}>{thought.type}</span>
                  <span className="font-code text-[8px] text-arl-text-muted">{thought.time}</span>
                </div>
                <div className="font-code text-[10px] text-arl-text-primary leading-relaxed mb-2">
                  {thought.content}
                </div>
                <div className="flex gap-3 font-code text-[8px] text-arl-text-muted border-t border-arl-border pt-1">
                  <span>Tokens: <span className="text-arl-text-secondary">{thought.tokens}</span></span>
                  <span>Lat: <span className="text-arl-teal">{thought.latency}ms</span></span>
                  <span>Conf: <span className="text-arl-ok">{(thought.confidence * 100).toFixed(1)}%</span></span>
                </div>
              </div>
            ))}
          </div>
        );
      case 'Events':
        return <div className="font-code text-xs text-arl-text-muted">Event-Stream wird geladen...</div>;
      case 'RLHF':
        return <div className="font-code text-xs text-arl-text-muted">RLHF-Feedback-Panel.</div>;
      case 'Art Dir.':
        return <div className="font-code text-xs text-arl-text-muted">Art Director-Anmerkungen.</div>;
      default:
        return null;
    }
  };

  return (
    <aside id="inspector" className="grid-area-inspector bg-arl-deep border-l border-arl-border flex flex-col overflow-hidden">
      <div className="flex border-b border-arl-border flex-shrink-0">
        {['Registry', 'Thoughts', 'Events', 'RLHF'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 px-1 py-2.5 bg-none border-b-2 font-heading text-[9px] tracking-wider uppercase cursor-pointer transition-all duration-fast hover:text-arl-text-primary ${activeTab === tab ? 'border-arl-gold text-arl-gold' : 'border-transparent text-arl-text-muted'}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-arl-md custom-scrollbar">
        {renderContent()}
      </div>
    </aside>
  );
};

const StatusBar = () => (
  <footer id="statusbar" className="grid-area-status flex items-center gap-arl-lg px-arl-md bg-arl-void border-t border-arl-border font-code text-xs text-arl-text-muted tracking-tight">
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-arl-ok"></div><span>Firestore: Live</span>
    </div>
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-arl-ok"></div><span>GitHub Sync: OK</span>
    </div>
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-arl-ok"></div><span>Genkit: Online</span>
    </div>
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-arl-ok"></div><span>5 Agenten aktiv</span>
    </div>
    <div className="flex-1"></div>
    <div className="flex items-center gap-1"><span>PRNG Seed: 0x4AE3C1F8</span></div>
    <div className="flex items-center gap-1"><span>Tick: <span>0</span></span></div>
    <div className="flex items-center gap-1"><span>FPS: <span>60</span></span></div>
    <div className="flex items-center gap-1"><span>Fixed Δt: 16.66ms</span></div>
  </footer>
);

export const DeveloperTools = () => {
  const showDeveloperTools = useStore(state => state.showDeveloperTools);

  if (!showDeveloperTools) return null;

  return (
    <div id="app" className="grid grid-rows-[44px_1fr_28px] grid-cols-[260px_1fr_300px] grid-areas-header-header-header-sidebar-canvas-inspector-status-status-status w-screen h-screen">
      <Header />
      <Sidebar />
      <CanvasArea />
      <Inspector />
      <StatusBar />
    </div>
  );
};



