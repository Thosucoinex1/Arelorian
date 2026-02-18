
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

        <div className="mt-10 pt-6 border-t border-white/5 text-[9px] text-gray-600 font-mono italic text-center">
          {ADMIN_EMAIL}
        </div>
      </div>
    </div>
  );
};

/**
 * NeuralTerminal component for interaction with simulation logs and signals.
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
                  className={`transition-all transform hover:scale-110 active:scale-90 ${isAxiomAuthenticated ? 'text-green-400' : 'text-axiom-cyan'}`}
                  title={isAxiomAuthenticated ? "Handshake Verified" : "Perform Axiom Handshake"}
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
                className={`flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={canSend ? "Sende Impuls an Matrix..." : isAdmin ? "Handshake Required to Send" : "Observer Mode: Neural Bridge Locked"}
                value={String(input)}
                disabled={!canSend}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input && canSend && (sendSignal(input), setInput(""))}
              />
              <button 
                onClick={() => { if(input && canSend) { sendSignal(input); setInput(""); } }}
                disabled={!canSend}
                className={`p-3 rounded-2xl transition-all shadow-lg ${canSend ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/40 text-white' : 'bg-gray-800 text-gray-600'}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Main application component responsible for initializing the game state and rendering the main UI.
 */
const App = () => {
  const initGame = useStore(state => state.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none">
      {/* 3D Simulation Background */}
      <WorldScene />
      
      {/* Overlay Interaction Layer */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <AgentHUD />
          </div>
          <div className="flex flex-col items-end gap-4">
            <QuestLog />
            <EventOverlay />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-4">
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
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
};

export default App;
