
import React, { useEffect, useState } from 'react';
import WorldScene from './components/World/WorldScene';
import { AgentHUD } from './components/UI/AgentHUD';
import { ChatConsole } from './components/UI/ChatConsole';
import { useStore } from './store';
import { NotaryDashboard } from './components/UI/NotaryDashboard';
import { EventOverlay } from './components/UI/EventOverlay';
import { QuestLog } from './components/UI/QuestLog';
import { CharacterSheet } from './components/UI/CharacterSheet';
import { AdminDashboard } from './components/UI/AdminDashboard';
import { WorldMap } from './components/UI/WorldMap';
import { VirtualJoysticks } from './components/UI/VirtualJoysticks';
import { soundManager } from './services/SoundManager';

const ChecklistOverlay = () => {
    const [visible, setVisible] = useState(true);
    const items = [
        "ARE-Logic Core (Stability/DNA)",
        "Grid 35x35 Expansion System",
        "Hellgate & Dungeon Recursion",
        "Mount System (Horse mechanics)",
        "High-Fidelity Character Sheet",
        "Notary & Land Certification",
        "World Jackpot (10% fees)"
    ];

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-axiom-cyan p-8 rounded-lg max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                <h2 className="text-axiom-cyan font-serif text-2xl mb-4 tracking-widest uppercase">System Initialization Checklist</h2>
                <div className="space-y-3 mb-8">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-4 h-4 border border-axiom-cyan flex items-center justify-center text-[10px] text-axiom-cyan">✓</div>
                            <span className="text-gray-300 text-sm font-sans">{item}</span>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={() => setVisible(false)}
                    className="w-full bg-axiom-cyan hover:bg-axiom-cyan/80 text-black font-bold py-3 rounded uppercase tracking-widest transition-all"
                >
                    SYSTEM ONLINE. Ouroboros-Instanz N+1 initialisiert.
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-4 italic">"Das lebendige Haus atmet."</p>
            </div>
        </div>
    );
}

const AuthGate = () => {
    const { user, login } = useStore();
    const [email, setEmail] = useState('');

    if (!user) {
        return (
            <div className="w-full h-screen bg-axiom-dark flex items-center justify-center font-sans">
                <div className="w-96 bg-black/30 border border-axiom-purple/50 rounded-lg p-8 shadow-2xl backdrop-blur-lg text-center">
                    <h1 className="text-3xl font-serif text-white tracking-widest mb-2">OUROBOROS V3.0</h1>
                    <p className="text-xs text-axiom-cyan mb-6">SINGULARITÄT: AXIOM REALITY EMERGENCE</p>
                    <form onSubmit={(e) => { e.preventDefault(); if(email) login(email); }}>
                        <input
                            type="email"
                            placeholder="notary_id@axiom.dev"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-3 text-sm text-white rounded mb-4 focus:outline-none focus:ring-2 focus:ring-axiom-cyan"
                            required
                        />
                        <button type="submit" className="w-full bg-axiom-purple hover:bg-axiom-purple/80 text-white py-3 rounded font-bold uppercase tracking-wider">
                            Initialize Singularity
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <>
            <ChecklistOverlay />
            <App />
        </>
    );
}

const App = () => {
  const { initGame, stability, globalJackpot, showCharacterSheet, showAdmin, showMap, toggleMap, toggleAdmin, hasNotaryLicense, device } = useStore();

  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="w-full h-screen relative bg-axiom-dark overflow-hidden font-sans select-none touch-none">
      {/* Top Status HUD */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 pointer-events-none">
        <div className="bg-black/60 border border-axiom-cyan/40 p-2 rounded backdrop-blur-md pointer-events-auto cursor-help">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Stability Index</div>
            <div className={`text-xl font-serif font-black ${stability < 0.7 ? 'text-red-500 animate-pulse' : 'text-axiom-cyan'}`}>
                {(stability * 100).toFixed(1)}%
            </div>
        </div>
        <div className="bg-black/60 border border-axiom-gold/40 p-2 rounded backdrop-blur-md">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">World Jackpot</div>
            <div className="text-xl font-serif font-black text-axiom-gold">
                {globalJackpot.toLocaleString()} G
            </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex gap-2 pointer-events-auto">
            <button 
                onClick={() => { toggleMap(true); soundManager.playUI('CLICK'); }}
                className="bg-black/60 border border-axiom-cyan/40 px-4 py-2 rounded backdrop-blur-md text-axiom-cyan text-xs font-bold uppercase tracking-widest hover:bg-axiom-cyan/20 transition-all"
            >
                World Map
            </button>
            {hasNotaryLicense && (
                <button 
                    onClick={() => { toggleAdmin(true); soundManager.playUI('CLICK'); }}
                    className="bg-black/60 border border-axiom-purple/40 px-4 py-2 rounded backdrop-blur-md text-axiom-purple text-xs font-bold uppercase tracking-widest hover:bg-axiom-purple/20 transition-all"
                >
                    Admin Console
                </button>
            )}
        </div>
      </div>

      <EventOverlay />
      
      <div className="absolute inset-0 z-0">
        <WorldScene />
      </div>
      
      {/* HUD Layers */}
      <div className="absolute inset-0 z-10 pointer-events-none flex justify-between p-4 pt-16">
        <div className="flex flex-col justify-between h-full">
          <AgentHUD />
          <ChatConsole />
        </div>
        <div className="h-full flex flex-col items-end">
            <QuestLog />
        </div>
      </div>

      {/* Mobile Controls */}
      {device.isMobile && <VirtualJoysticks />}

      {/* Right Side Notary Panel */}
      <div className="absolute top-0 right-0 h-full z-20 pointer-events-none flex items-center pt-10">
          <NotaryDashboard />
      </div>

      {/* Modals & Overlays */}
      {showCharacterSheet && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
              <CharacterSheet />
          </div>
      )}

      {showAdmin && <AdminDashboard />}
      {showMap && <WorldMap />}
    </div>
  );
};

export default AuthGate;
