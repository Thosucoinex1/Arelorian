
import React, { useEffect, useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Send,
  Terminal,
  BrainCircuit,
  Activity
} from 'lucide-react';
import { useStore } from './store';
import { AXIOMS } from './types';

// UI Component Imports
import { AgentHUD } from './components/UI/AgentHUD';
import { NotaryDashboard } from './components/UI/NotaryDashboard';
import { CharacterSheet } from './components/UI/CharacterSheet';
import { QuestLog } from './components/UI/QuestLog';
import { AdminDashboard } from './components/UI/AdminDashboard';
import { WorldMap } from './components/UI/WorldMap';
import { AuctionHouse } from './components/UI/AuctionHouse';
import { VirtualJoysticks } from './components/UI/VirtualJoysticks';
import { EventOverlay } from './components/UI/EventOverlay';
import { ChatConsole } from './components/UI/ChatConsole';
import WorldScene from './components/World/WorldScene';

const UNIVERSAL_KEY = 'GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I';

const NeuralTerminal = () => {
  const { logs, sendSignal } = useStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="fixed bottom-6 left-6 w-[420px] pointer-events-auto font-sans z-50 hidden md:flex">
      <div className="bg-black/90 border-2 border-cyan-500/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[500px] backdrop-blur-xl">
        <div className="bg-cyan-900/20 p-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Terminal v4.5</span>
          </div>
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8px] text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`text-[9px] font-black uppercase ${
                  log.sender === 'NOTAR' ? 'text-cyan-400' : 'text-axiom-gold'
                }`}>{String(log.sender || 'SYSTEM')}</span>
              </div>
              <p className={`text-[11px] p-3 rounded-2xl border ${
                log.sender === 'NOTAR' 
                  ? 'bg-cyan-500/10 text-cyan-100 border-cyan-500/20' 
                  : 'bg-axiom-gold/10 text-axiom-gold border-axiom-gold/20'
              }`}>
                {String(log.message)}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-black/60 border-t border-white/5">
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
              placeholder="Sende Impuls an Matrix..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input && (sendSignal(input), setInput(""))}
            />
            <button 
              onClick={() => { if(input) { sendSignal(input); setInput(""); } }}
              className="bg-cyan-600 hover:bg-cyan-500 p-3 rounded-2xl transition-all shadow-lg shadow-cyan-900/30"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-3 px-2">
            <span className="text-[8px] text-gray-600 uppercase">Axiomatic Grounding Active</span>
            <span className="text-[8px] text-red-500 flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> Neural Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { initGame, stability, globalJackpot } = useStore();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => { initGame(); }, []);

  if (!isConfirmed) {
    return (
      <div className="fixed inset-0 bg-axiom-dark flex items-center justify-center z-[100] p-6 font-sans">
        <div className="max-w-md w-full bg-black/60 border-2 border-axiom-cyan/40 p-10 rounded-[3rem] text-center shadow-2xl backdrop-blur-xl">
          <ShieldCheck className="w-16 h-16 text-axiom-cyan mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-serif font-black text-white mb-2 uppercase tracking-tighter">Axiom Handshake</h2>
          <p className="text-[10px] text-gray-500 mb-8 uppercase tracking-[0.2em]">Ouroboros Autonomous MMORPG Architect</p>
          
          <div className="relative mb-6">
            <Key className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
            <input 
              type="password" 
              placeholder="UNIVERSAL KEY..." 
              className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs text-axiom-cyan focus:border-axiom-cyan outline-none transition-all"
              value={keyInput} onChange={e => setKeyInput(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => { if(keyInput === UNIVERSAL_KEY) setIsConfirmed(true); }}
            className="w-full bg-axiom-cyan py-5 rounded-2xl font-black text-sm text-black hover:bg-white transition-all shadow-xl shadow-cyan-900/40"
          >
            INITIALIZE SINGULARITY
          </button>

          <div className="mt-8 flex justify-center gap-4 text-[9px] text-gray-600 font-mono">
             <span title={AXIOMS.ENERGY}>ENERGY_SYNC</span>
             <span title={AXIOMS.RECURSION}>RECURSION_V2</span>
             <span title={AXIOMS.EROSION}>EROSION_PULSE</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-axiom-dark overflow-hidden select-none relative">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <WorldScene />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 pointer-events-none z-40">
        {/* HUD Elements */}
        <div className="absolute top-6 left-6 z-50 flex gap-4 pointer-events-none">
            <div className="bg-black/80 border border-cyan-500/20 p-3 rounded-xl backdrop-blur-md">
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Reality Stability</div>
            <div className={`text-xl font-serif font-black ${stability < 0.7 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                {(Number(stability) * 100).toFixed(1)}%
            </div>
            </div>
            <div className="bg-black/80 border border-axiom-gold/20 p-3 rounded-xl backdrop-blur-md">
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Jackpot Reserve</div>
            <div className="text-xl font-serif font-black text-axiom-gold">
                {Number(globalJackpot || 0).toLocaleString()} G
            </div>
            </div>
        </div>

        <div className="absolute bottom-6 right-6 pointer-events-auto">
            <AgentHUD />
        </div>
        <div className="absolute right-0 top-0 h-full pointer-events-auto flex items-center">
            <NotaryDashboard />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
                <CharacterSheet />
            </div>
        </div>
        
        <div className="absolute bottom-20 left-6 pointer-events-auto">
             <ChatConsole />
        </div>

        <QuestLog />
        <AdminDashboard />
        <WorldMap />
        <AuctionHouse />
        <VirtualJoysticks />
        <EventOverlay />
      </div>

      {/* Terminal Overlay */}
      <NeuralTerminal />
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none border-[12px] border-white/5 z-50" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/20 z-10" />
    </div>
  );
}
