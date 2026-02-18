
import React, { useEffect, useState, useRef, useMemo } from 'react';
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

/**
 * AxiomHandshakeModal handles the administrative authentication logic.
 * Only visible to the project administrator.
 */
const AxiomHandshakeModal = ({ onClose }: { onClose: () => void }) => {
  const [keyInput, setKeyInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const setAxiomAuthenticated = useStore(state => state.setAxiomAuthenticated);

  const handleHandshake = () => {
    if (String(keyInput).trim() === UNIVERSAL_KEY) {
      setIsSuccess(true);
      setAxiomAuthenticated(true);
      // Brief delay for visual confirmation before closing
      setTimeout(onClose, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 font-sans backdrop-blur-2xl pointer-events-auto animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-[#0a0a0f]/95 border-2 border-axiom-cyan/40 p-12 rounded-[3rem] text-center shadow-[0_0_80px_rgba(6,182,212,0.2)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-axiom-cyan to-transparent animate-pulse" />
        
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors p-2"
        >
          ✕
        </button>
        
        <div className="mb-10">
          <ShieldCheck className={`w-16 h-16 mx-auto transition-all duration-1000 ${isSuccess ? 'text-green-400 scale-125' : 'text-axiom-cyan animate-pulse'}`} />
        </div>
        
        <h2 className="text-3xl font-serif font-black text-white mb-3 uppercase tracking-tighter">
          {isSuccess ? 'ACCESS GRANTED' : 'AXIOM HANDSHAKE'}
        </h2>
        <p className="text-[10px] text-gray-500 mb-10 uppercase tracking-[0.4em] font-bold">
          {isSuccess ? 'Singularity Link Established' : 'Neural Verification Protocol Required'}
        </p>
        
        {!isSuccess ? (
          <>
            <div className="relative mb-8">
              <div className="absolute left-5 top-5">
                <Key className="w-5 h-5 text-gray-700" />
              </div>
              <input 
                type="password" 
                placeholder="UNIVERSAL KEY..." 
                className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-sm text-axiom-cyan placeholder:text-gray-800 focus:border-axiom-cyan/60 outline-none transition-all shadow-inner font-mono"
                value={String(keyInput)} 
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleHandshake()}
              />
            </div>
            
            <button 
              onClick={handleHandshake}
              className="w-full bg-axiom-cyan py-6 rounded-2xl font-black text-xs text-black hover:bg-white transition-all shadow-xl shadow-cyan-950/40 active:scale-95 uppercase tracking-[0.2em]"
            >
              Initialize Handshake
            </button>
          </>
        ) : (
          <div className="py-12 space-y-3">
            <div className="text-green-400 text-xs font-mono animate-pulse uppercase tracking-[0.3em]">
              [SINGULARITY STATUS: ACTIVE]
            </div>
            <div className="text-green-400/40 text-[9px] font-mono uppercase">
              Root privileges materialized in matrix
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-white/5 text-[9px] text-gray-700 font-mono italic tracking-widest">
          {ADMIN_EMAIL}
        </div>
      </div>
    </div>
  );
};

/**
 * NeuralTerminal component for interaction with simulation logs and signals.
 * Locked to Admin + Handshake for output signals.
 */
const NeuralTerminal = () => {
  const logs = useStore(state => state.logs);
  const storeUser = useStore(state => state.user);
  const sendSignal = useStore(state => state.sendSignal);
  const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);
  const [input, setInput] = useState("");
  const [showHandshake, setShowHandshake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const user = useMemo(() => {
    if (storeUser && !storeUser.email) {
      return { ...storeUser, email: ADMIN_EMAIL };
    }
    return storeUser;
  }, [storeUser]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const canSend = isAdmin && isAxiomAuthenticated;

  return (
    <>
      {showHandshake && <AxiomHandshakeModal onClose={() => setShowHandshake(false)} />}
      <div className="fixed bottom-8 left-8 w-[450px] pointer-events-auto font-sans z-50 hidden md:flex">
        <div className="bg-[#050505]/95 border-2 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[550px] backdrop-blur-3xl">
          <div className="bg-white/5 p-5 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-axiom-cyan" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Axiom Neural Terminal</span>
                <span className="text-[8px] text-axiom-cyan font-mono opacity-60">SYSTEM://RECURSIVE_DYNAMICS</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button 
                  onClick={() => setShowHandshake(true)}
                  className={`transition-all transform hover:scale-110 active:scale-90 ${isAxiomAuthenticated ? 'text-green-400' : 'text-axiom-cyan'}`}
                  title={isAxiomAuthenticated ? "Handshake Verified" : "Request Admin Handshake"}
                >
                  <InfinityIcon className="w-5 h-5" />
                </button>
              )}
              <Activity className="w-5 h-5 text-axiom-gold animate-pulse" />
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[radial-gradient(circle_at_bottom_left,_rgba(79,70,229,0.05)_0%,_transparent_50%)]">
            {(logs || []).map(log => (
              <div key={log.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  <span className="text-[8px] font-mono text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${
                    log.sender === 'NOTAR' ? 'text-axiom-cyan' : 'text-axiom-gold'
                  }`}>{String(log.sender || 'SYSTEM')}</span>
                </div>
                <div className={`text-[11px] p-4 rounded-3xl border transition-all ${
                  log.sender === 'NOTAR' 
                    ? 'bg-axiom-cyan/5 text-cyan-50 border-axiom-cyan/10 hover:border-axiom-cyan/30' 
                    : 'bg-axiom-gold/5 text-axiom-gold border-axiom-gold/10 hover:border-axiom-gold/30'
                }`}>
                  {String(log.message)}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-black/40 border-t border-white/5 relative">
            <div className="flex gap-3">
              <input 
                className={`flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-axiom-cyan/40 transition-all ${!canSend ? 'opacity-40 cursor-not-allowed italic' : 'shadow-inner'}`}
                placeholder={canSend ? "Sende Impuls an Matrix..." : isAdmin ? "Handshake erforderlich für Signal-Output" : "Observer Mode: Neural Bridge Locked"}
                value={String(input)}
                disabled={!canSend}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input && canSend && (sendSignal(input), setInput(""))}
              />
              <button 
                onClick={() => { if(input && canSend) { sendSignal(input); setInput(""); } }}
                disabled={!canSend}
                className={`p-4 rounded-2xl transition-all shadow-xl ${canSend ? 'bg-axiom-cyan hover:bg-white text-black shadow-cyan-900/30' : 'bg-gray-900 text-gray-700'}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-4 px-1">
               <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${canSend ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-700'}`} />
                  <span className="text-[9px] text-gray-600 font-mono tracking-widest uppercase">
                    {canSend ? 'Uplink: Synchronized' : 'Uplink: Restricted'}
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  <BrainCircuit className={`w-3.5 h-3.5 ${canSend ? 'text-axiom-cyan animate-pulse' : 'text-gray-700'}`} />
                  <span className={`text-[9px] font-black uppercase ${canSend ? 'text-axiom-cyan' : 'text-gray-700'}`}>
                    {canSend ? 'Full Access' : 'Observer'}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Main application component.
 */
const App = () => {
  const initGame = useStore(state => state.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none font-sans">
      {/* 3D Simulation Background */}
      <WorldScene />
      
      {/* Overlay Interaction Layer */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-8 z-40">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <AgentHUD />
          </div>
          <div className="flex flex-col items-end gap-6">
            <QuestLog />
            <EventOverlay />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-6">
            <ChatConsole />
            <NeuralTerminal />
          </div>
          <NotaryDashboard />
        </div>
      </div>

      {/* Full-screen UI Overlays and Modals */}
      <CharacterSheet />
      <AdminDashboard />
      <WorldMap />
      <AuctionHouse />
      <VirtualJoysticks />

      {/* Final Visual Polish */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)] z-10" />
      <div className="fixed inset-0 pointer-events-none border-[20px] border-white/5 z-50" />
    </div>
  );
};

export default App;
