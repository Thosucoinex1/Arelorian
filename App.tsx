
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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

// UI Component Imports
import GameUI from './components/UI/GameUI';
import { MainMenu } from './components/UI/MainMenu';
import WorldScene from './components/World/WorldScene';

const App = () => {
  const { 
    initGame, 
    updatePhysics, 
    runCognition, 
    runSocialInteractions, 
    runEmergentBehavior, 
    triggerAxiomEvent, 
    generateQuests, 
    syncAgents,
    setUserApiKey,
    updateScreenSize,
    agents,
    quests
  } = useStore(state => ({
    initGame: state.initGame,
    updatePhysics: state.updatePhysics,
    runCognition: state.runCognition,
    runSocialInteractions: state.runSocialInteractions,
    runEmergentBehavior: state.runEmergentBehavior,
    triggerAxiomEvent: state.triggerAxiomEvent,
    generateQuests: state.generateQuests,
    syncAgents: state.syncAgents,
    setUserApiKey: state.setUserApiKey,
    updateScreenSize: state.updateScreenSize,
    agents: state.agents,
    quests: state.quests,
  }));

  const [hasApiKey, setHasApiKey] = useState(false);
  const lastUpdateTime = useRef(0);
  const cognitionCooldown = useRef(8000);
  const socialCooldown = useRef(10000);
  const emergentBehaviorCooldown = useRef(30000);
  const worldEventsCooldown = useRef(45000);
  const syncCooldown = useRef(60000);

  const gameLoop = useCallback((timestamp: number) => {
    const delta = timestamp - lastUpdateTime.current;
    lastUpdateTime.current = timestamp;

    // High-frequency updates (every frame)
    updatePhysics(delta / 1000); // Expects delta in seconds

    // Cooldown-based updates
    cognitionCooldown.current -= delta;
    socialCooldown.current -= delta;
    emergentBehaviorCooldown.current -= delta;
    worldEventsCooldown.current -= delta;
    syncCooldown.current -= delta;

    if (cognitionCooldown.current <= 0) {
      runCognition();
      cognitionCooldown.current = 8000;
    }

    if (socialCooldown.current <= 0) {
      runSocialInteractions();
      socialCooldown.current = 10000;
    }

    if (emergentBehaviorCooldown.current <= 0) {
      const activeAgents = agents.filter(a => a.faction !== 'SYSTEM');
      if (activeAgents.length > 0) {
        const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        runEmergentBehavior(randomAgent.id);
      }
      emergentBehaviorCooldown.current = 30000;
    }

    if (worldEventsCooldown.current <= 0) {
      if (Math.random() > 0.8) triggerAxiomEvent();
      if (quests.length < 5) generateQuests();
      worldEventsCooldown.current = 45000;
    }

    if (syncCooldown.current <= 0) {
      syncAgents();
      syncCooldown.current = 60000;
    }

    requestAnimationFrame(gameLoop);
  }, [
    updatePhysics, 
    runCognition, 
    runSocialInteractions, 
    runEmergentBehavior, 
    triggerAxiomEvent, 
    generateQuests, 
    syncAgents, 
    agents, 
    quests
  ]);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keySelected);
        if (keySelected) {
          // This assumes the environment variable is available after selection.
          // In a real app, you might get the key directly from the function.
          setUserApiKey(process.env.REACT_APP_GEMINI_API_KEY || null);
        }
      } catch (error) {
        console.error("AI Studio SDK not available.", error);
      }
    };

    initGame();
    webSocketService.connect();
    updateScreenSize();
    checkApiKey();

    const handleResize = () => updateScreenSize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      cancelAnimationFrame(animationFrameId);
      webSocketService.disconnect();
    };
  }, [initGame, setUserApiKey, updateScreenSize, gameLoop]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none font-sans">
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
                    setUserApiKey(process.env.REACT_APP_GEMINI_API_KEY || null);
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
    </div>
  );
};

export default App;
