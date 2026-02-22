
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Send,
  Terminal,
  BrainCircuit,
  Activity,
  Infinity as InfinityIcon,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { useStore } from './store';
import { webSocketService } from './services/webSocketService';
import { AXIOMS } from './types';

// UI Component Imports
import { EmergenceAdminMenu } from './components/UI/EmergenceAdminMenu';
import { AxiomaticOverlay } from './components/UI/AxiomaticOverlay';
import { BiomeControls } from './components/UI/BiomeControls';
import { InspectorPanel } from './components/UI/InspectorPanel';
import GameUI from './components/UI/GameUI';
import { MainMenu } from './components/UI/MainMenu';
import WorldScene from './components/World/WorldScene';

const UNIVERSAL_KEY = 'GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I';
const ADMIN_EMAIL = 'projectouroboroscollective@gmail.com';

const AxiomHandshakeModal = ({ onClose }: { onClose: () => void }) => {
  const [keyInput, setKeyInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(false);
  const setAxiomAuthenticated = useStore(state => state.setAxiomAuthenticated);
  const user = useStore(state => state.user);

  if (user?.email !== ADMIN_EMAIL) return null;

  const handleHandshake = () => {
    if (String(keyInput).trim() === UNIVERSAL_KEY) {
      setIsSuccess(true);
      setError(false);
      setAxiomAuthenticated(true);
      setTimeout(onClose, 1500);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6 font-sans backdrop-blur-3xl pointer-events-auto animate-in fade-in duration-700">
      <div className={`max-w-md w-full bg-[#0a0a0f] border-2 rounded-[3.5rem] p-12 text-center shadow-2xl relative overflow-hidden transition-all duration-500 ${
        isSuccess ? 'border-green-500/50 shadow-green-500/20' : 
        error ? 'border-red-500/50 shadow-red-500/20 animate-[shake_0.5s_ease-in-out]' : 
        'border-axiom-cyan/40 shadow-axiom-cyan/20'
      }`}>
        <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${isSuccess ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-axiom-cyan'} animate-[scan_3s_linear_infinite] shadow-[0_0_15px_currentColor]`} />
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-700 hover:text-white transition-all p-2 rounded-full hover:bg-white/5 active:scale-90">✕</button>
        <div className="mb-12 relative">
          <div className={`absolute inset-0 blur-3xl opacity-20 transition-colors duration-1000 ${isSuccess ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-axiom-cyan'}`} />
          {isSuccess ? <BrainCircuit className="w-20 h-20 mx-auto text-green-400 animate-[bounce_2s_infinite]" /> : error ? <AlertTriangle className="w-20 h-20 mx-auto text-red-500 animate-pulse" /> : <Lock className="w-20 h-20 mx-auto text-axiom-cyan animate-pulse" />}
        </div>
        <h2 className={`text-3xl font-serif font-black mb-3 uppercase tracking-tighter transition-colors duration-500 ${isSuccess ? 'text-green-400' : error ? 'text-red-500' : 'text-white'}`}>{isSuccess ? 'IDENTITY VERIFIED' : error ? 'ACCESS DENIED' : 'AXIOM HANDSHAKE'}</h2>
        {!isSuccess ? (
          <>
            <div className="relative mb-8 group">
              <div className="absolute left-6 top-6 transition-colors group-focus-within:text-axiom-cyan"><Key className="w-5 h-5 text-gray-700" /></div>
              <input type="password" placeholder="UNIVERSAL KEY..." className={`w-full bg-black/60 border rounded-3xl py-6 pl-16 pr-6 text-sm transition-all shadow-inner font-mono focus:outline-none ${error ? 'border-red-500/50 text-red-400 placeholder:text-red-900' : 'border-white/10 text-axiom-cyan placeholder:text-gray-800 focus:border-axiom-cyan/60'}`} value={String(keyInput)} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleHandshake()} />
            </div>
            <button onClick={handleHandshake} className={`w-full py-6 rounded-3xl font-black text-xs transition-all shadow-xl active:scale-[0.98] uppercase tracking-[0.3em] ${error ? 'bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-axiom-cyan text-black hover:bg-white shadow-cyan-900/40'}`}>{error ? 'RETRY HANDSHAKE' : 'GRANT ACCESS'}</button>
          </>
        ) : (
          <div className="py-10 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="text-green-400 text-xs font-mono animate-pulse uppercase tracking-[0.4em]">[OVERSEER STATUS: ACTIVE]</div>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-[10px] text-green-400/80 font-mono uppercase leading-loose">Matrix stabilization complete.<br/>Root privileges materialized.</div>
          </div>
        )}
      </div>
    </div>
  );
};

const NeuralTerminal = () => {
  const logs = useStore(state => state.logs);
  const storeUser = useStore(state => state.user);
  const sendSignal = useStore(state => state.sendSignal);
  const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);
  const toggleDebugger = useStore(state => state.toggleDebugger);
  const [input, setInput] = useState("");
  const [showHandshake, setShowHandshake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useMemo(() => storeUser, [storeUser]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs]);
  const isAdmin = user?.email === ADMIN_EMAIL;
  const canSend = isAdmin && isAxiomAuthenticated;

  return (
    <>
      {showHandshake && isAdmin && <AxiomHandshakeModal onClose={() => setShowHandshake(false)} />}
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
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleDebugger(true)} 
                    className="p-2 hover:bg-white/5 rounded-lg text-emerald-500 transition-all hover:scale-110"
                    title="Deep Solving Debugger"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowHandshake(true)} className={`transition-all transform hover:scale-110 active:scale-90 ${isAxiomAuthenticated ? 'text-green-400' : 'text-axiom-cyan'}`}><InfinityIcon className="w-5 h-5" /></button>
                </div>
              )}
              <Activity className="w-5 h-5 text-axiom-gold animate-pulse" />
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[radial-gradient(circle_at_bottom_left,_rgba(79,70,229,0.05)_0%,_transparent_50%)]">
            {logs.map(log => (
              <div key={log.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  <span className="text-[8px] font-mono text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${log.sender === 'NOTAR' ? 'text-axiom-cyan' : 'text-axiom-gold'}`}>{String(log.sender || 'SYSTEM')}</span>
                </div>
                <div className={`text-[11px] p-4 rounded-3xl border transition-all ${log.sender === 'NOTAR' ? 'bg-axiom-cyan/5 text-cyan-50 border-axiom-cyan/10 hover:border-axiom-cyan/30' : 'bg-axiom-gold/5 text-axiom-gold border-axiom-gold/10 hover:border-axiom-gold/30'}`}>{String(log.message)}</div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-black/40 border-t border-white/5 relative">
            <div className="flex gap-3">
              <input className={`flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-axiom-cyan/40 transition-all ${!canSend ? 'opacity-40 cursor-not-allowed italic' : 'shadow-inner'}`} placeholder={canSend ? "Sende Impuls an Matrix..." : "Observer Mode: Neural Bridge Locked"} value={String(input)} disabled={!canSend} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && input && canSend && (sendSignal(input), setInput(""))} />
              <button onClick={() => { if(input && canSend) { sendSignal(input); setInput(""); } }} disabled={!canSend} className={`p-4 rounded-2xl transition-all shadow-xl ${canSend ? 'bg-axiom-cyan hover:bg-white text-black shadow-cyan-900/30' : 'bg-gray-900 text-gray-700'}`}><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const App = () => {
  const initGame = useStore(state => state.initGame);
  const runSocialInteractions = useStore(state => state.runSocialInteractions);
  const runEmergentBehavior = useStore(state => state.runEmergentBehavior);
  const agents = useStore(state => state.agents);
  const storeUser = useStore(state => state.user);
  const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);
  const runDiagnostics = useStore(state => state.runDiagnostics);
  const toggleDebugger = useStore(state => state.toggleDebugger);
  const toggleAdmin = useStore(state => state.toggleAdmin);
  const showAdmin = useStore(state => state.showAdmin);
  const setUserApiKey = useStore(state => state.setUserApiKey);
  const [showInitialHandshake, setShowInitialHandshake] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const user = useMemo(() => storeUser, [storeUser]);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => { 
    initGame(); 
    webSocketService.connect();

    const checkApiKey = async () => {
      const keySelected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(keySelected);
      if (keySelected) {
        // Assuming process.env.GEMINI_API_KEY is updated after selection
        setUserApiKey(process.env.GEMINI_API_KEY || null);
      }
    };
    checkApiKey();
  }, [initGame, setUserApiKey]);
  useEffect(() => { if (user?.email === ADMIN_EMAIL && !isAxiomAuthenticated) setShowInitialHandshake(true); }, [user?.email, isAxiomAuthenticated]);

  // Global Error Listener for Deep Solving
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Matrix Corruption Detected:", event.error);
      toggleDebugger(true);
      runDiagnostics(`RUNTIME_ERROR: ${event.message}\nStack: ${event.error?.stack}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [toggleDebugger, runDiagnostics]);

  // Social Interaction Loop
  useEffect(() => {
    const interval = setInterval(() => {
        runSocialInteractions();
    }, 10000);
    return () => clearInterval(interval);
  }, [runSocialInteractions]);

  // Emergent Behavior Loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random agent to exhibit emergent behavior
      const activeAgents = agents.filter(a => a.faction !== 'SYSTEM');
      if (activeAgents.length > 0) {
        const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        runEmergentBehavior(randomAgent.id);
      }
    }, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [runEmergentBehavior, agents]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none font-sans">
      {showInitialHandshake && user?.email === ADMIN_EMAIL && <AxiomHandshakeModal onClose={() => setShowInitialHandshake(false)} />} 

      {!hasApiKey && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6 font-sans backdrop-blur-3xl pointer-events-auto animate-in fade-in duration-700">
          <div className="max-w-md w-full bg-[#0a0a0f] border-2 border-red-500/50 rounded-[3.5rem] p-12 text-center shadow-2xl shadow-red-500/20 relative overflow-hidden">
            <AlertTriangle className="w-20 h-20 mx-auto text-red-500 animate-pulse mb-8" />
            <h2 className="text-3xl font-serif font-black mb-3 uppercase tracking-tighter text-white">API Key Required</h2>
            <p className="text-sm text-gray-400 mb-8">To access advanced AI features, please select a Gemini API key from a paid Google Cloud project.</p>
            <button
              onClick={async () => {
                await window.aistudio.openSelectKey();
                const keySelected = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(keySelected);
                if (keySelected) {
                  setUserApiKey(process.env.GEMINI_API_KEY || null);
                }
              }}
              className="w-full py-6 rounded-3xl font-black text-xs transition-all shadow-xl active:scale-[0.98] uppercase tracking-[0.3em] bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"
            >
              Select Gemini API Key
            </button>
            <p className="text-[10px] text-gray-600 mt-4">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">Billing documentation</a>
            </p>
          </div>
        </div>
      )}

      <WorldScene />
      <GameUI />
      <MainMenu />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)] z-10" />
      <div className="fixed inset-0 pointer-events-none border-[20px] border-white/5 z-50" />
      
      {isAdmin && (
        <button 
          onClick={() => toggleAdmin(!showAdmin)}
          className="fixed top-8 right-8 z-[60] pointer-events-auto w-12 h-12 bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 rounded-full flex items-center justify-center text-axiom-purple transition-all hover:scale-110 active:scale-90 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          title="Toggle Admin Dashboard"
        >
          <ShieldCheck className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default App;
