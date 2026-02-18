
import React, { useEffect, useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Send,
  Terminal,
  BrainCircuit,
  Activity,
  Infinity as InfinityIcon
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
const ADMIN_EMAIL = 'projectouroboroscollective@gmail.com';

const AxiomHandshakeModal = ({ onClose }: { onClose: () => void }) => {
  const [keyInput, setKeyInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const setAxiomAuthenticated = useStore(state => state.setAxiomAuthenticated);
  const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);

  const handleHandshake = () => {
    if (String(keyInput).trim() === UNIVERSAL_KEY) {
      setIsSuccess(true);
      setAxiomAuthenticated(true);
      // Brief delay for visual confirmation before closing
      setTimeout(onClose, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-6 font-sans backdrop-blur-md pointer-events-auto animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-axiom-dark/95 border-2 border-axiom-cyan/40 p-10 rounded-[2.5rem] text-center shadow-[0_0_60px_rgba(6,182,212,0.25)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-axiom-cyan to-transparent animate-pulse" />
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors p-2"
        >
          ✕
        </button>
        
        <div className="mb-8">
          <ShieldCheck className={`w-14 h-14 mx-auto transition-all duration-700 ${isSuccess ? 'text-green-400 scale-110' : 'text-axiom-cyan animate-pulse'}`} />
        </div>
        
        <h2 className="text-2xl font-serif font-black text-white mb-2 uppercase tracking-tighter">
          {isSuccess ? 'AXIOM SYNCHRONIZED' : 'NEURAL HANDSHAKE'}
        </h2>
        <p className="text-[10px] text-gray-500 mb-8 uppercase tracking-[0.3em] font-bold">
          {isSuccess ? 'Singularity Access Confirmed' : 'Elevated Entity Verification Required'}
        </p>
        
        {!isSuccess ? (
          <>
            <div className="relative mb-8">
              <div className="absolute left-4 top-4">
                <Key className="w-5 h-5 text-gray-600" />
              </div>
              <input 
                type="password" 
                placeholder="UNIVERSAL KEY..." 
                className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-axiom-cyan placeholder:text-gray-800 focus:border-axiom-cyan/60 outline-none transition-all shadow-inner"
                value={String(keyInput)} 
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleHandshake()}
              />
            </div>
            
            <button 
              onClick={handleHandshake}
              className="w-full bg-axiom-cyan py-5 rounded-2xl font-black text-sm text-black hover:bg-white transition-all shadow-xl shadow-cyan-900/40 active:scale-95"
            >
              GRANT ACCESS
            </button>
          </>
        ) : (
          <div className="py-10 space-y-2">
            <div className="text-green-400 text-[10px] font-mono animate-pulse uppercase tracking-widest">
              [SINGULARITY STATUS: ACTIVE]
            </div>
            <div className="text-green-400/60 text-[9px] font-mono uppercase">
              Admin privileges materialized
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-white/5 text-[9px] text-gray-600 font-mono italic">
          {ADMIN_EMAIL}
        </div>
      </div>
    </div>
  );
};

const NeuralTerminal = () => {
  const logs = useStore(state => state.logs);
  const user = useStore(state => state.user);
  const sendSignal = useStore(state => state.sendSignal);
  const [input, setInput] = useState("");
  const [showHandshake, setShowHandshake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {showHandshake && <AxiomHandshakeModal onClose={() => setShowHandshake(false)} />}
      <div className="fixed bottom-6 left-6 w-[420px] pointer-events-auto font-sans z-50 hidden md:flex">
        <div className="bg-black/90 border-2 border-cyan-500/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[500px] backdrop-blur-xl">
          <div className="bg-cyan-900/20 p-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Terminal v4.5</span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button 
                  onClick={() => setShowHandshake(true)}
                  className="text-axiom-cyan hover:text-white transition-all transform hover:scale-110 active:scale-90"
                  title="Axiom Handshake (Admin Only)"
                >
                  <InfinityIcon className="w-4 h-4" />
                </button>
              )}
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {(logs || []).map(log => (
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
                className={`flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={isAdmin ? "Sende Impuls an Matrix..." : "Observer Mode: Neural Bridge Locked"}
                value={String(input)}
                disabled={!isAdmin}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input && isAdmin && (sendSignal(input), setInput(""))}
              />
              <button 
                onClick={() => { if(input && isAdmin) { sendSignal(input); setInput(""); } }}
                disabled={!isAdmin}
                className={`p-3 rounded-2xl transition-all shadow-lg ${isAdmin ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex justify-between items-center mt-3 px-2">
              <span className="text-[8px] text-gray-600 uppercase tracking-tighter">Axiomatic Grounding Active</span>
              <span className={`text-[8px] flex items-center gap-1 font-bold ${isAdmin ? 'text-red-500' : 'text-gray-600'}`}>
                <BrainCircuit className="w-3 h-3" /> {isAdmin ? 'Neural Bridge: Recurse' : 'Neural Bridge: Read-Only'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function App() {
  const initGame = useStore(state => state.initGame);
  const stability = useStore(state => state.stability);
  const globalJackpot = useStore(state => state.globalJackpot);
  const user = useStore(state => state.user);
  const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);

  const [showInitialHandshake, setShowInitialHandshake] = useState(false);
  
  useEffect(() => { 
    initGame();
    // Trigger the handshake modal for admin on initial load if not already authenticated
    if (user?.email === ADMIN_EMAIL && !isAxiomAuthenticated) {
      setShowInitialHandshake(true);
    }
  }, [user, isAxiomAuthenticated]);

  return (
    <div className="w-full h-screen bg-axiom-dark overflow-hidden select-none relative">
      {showInitialHandshake && (
        <AxiomHandshakeModal onClose={() => setShowInitialHandshake(false)} />
      )}

      <div className="absolute inset-0 z-0">
        <WorldScene />
      </div>

      <div className="absolute inset-0 pointer-events-none z-40">
        <div className="absolute top-6 left-6 z-50 flex gap-4 pointer-events-none">
          <div className="bg-black/80 border border-cyan-500/20 p-3 rounded-xl backdrop-blur-md">
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Reality Stability</div>
            <div className={`text-xl font-serif font-black ${(stability || 0) < 0.7 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
              {String((Number(stability || 1.0) * 100).toFixed(1))}%
            </div>
          </div>
          <div className="bg-black/80 border border-axiom-gold/20 p-3 rounded-xl backdrop-blur-md">
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Jackpot Reserve</div>
            <div className="text-xl font-serif font-black text-axiom-gold">
              {String(Number(globalJackpot || 0).toLocaleString())} G
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

      <NeuralTerminal />
      
      <div className="absolute inset-0 pointer-events-none border-[12px] border-white/5 z-50" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/20 z-10" />
    </div>
  );
}
