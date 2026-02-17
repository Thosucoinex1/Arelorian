
import React, { useState } from 'react';
import WorldScene from './components/World/WorldScene';
import { NotaryDashboard } from './components/UI/NotaryDashboard';
import { AgentHUD } from './components/UI/AgentHUD';
import { CharacterSheet } from './components/UI/CharacterSheet';
import { ChatConsole } from './components/UI/ChatConsole';
import { QuestLog } from './components/UI/QuestLog';
import { PayPalModal } from './components/UI/PayPalModal';
import { AdminDashboard } from './components/UI/AdminDashboard';
import { WorldMap } from './components/UI/WorldMap';
import { useStore } from './store';
import { soundManager } from './services/SoundManager';

const App = () => {
  const [isPayModalOpen, setPayModalOpen] = useState(false);
  const toggleViewMode = useStore(state => state.toggleViewMode);
  const viewMode = useStore(state => state.viewMode);
  const toggleAdmin = useStore(state => state.toggleAdmin);
  const toggleMap = useStore(state => state.toggleMap);

  return (
    <div className="w-full h-screen relative bg-axiom-dark overflow-hidden font-sans select-none">
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <WorldScene />
      </div>

      {/* Main UI Layout */}
      <div className="absolute inset-0 z-10 flex pointer-events-none">
        
        {/* Left Side / HUD Area */}
        <div className="flex-1 relative">
            <AgentHUD />
            <ChatConsole />
            
            {/* Center Popups */}
            <div className="absolute inset-0 pointer-events-auto flex items-center justify-center z-50 pointer-events-none">
                 <div className="pointer-events-auto">
                    <CharacterSheet />
                 </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-6 pointer-events-auto flex space-x-2">
                <button 
                    onClick={() => { setPayModalOpen(true); soundManager.playUI('CLICK'); }}
                    className="bg-axiom-gold hover:bg-yellow-500 text-black px-4 py-2 rounded font-bold shadow-lg text-sm border border-yellow-600"
                >
                    + FUNDS
                </button>
                <button 
                    onClick={() => { toggleViewMode(); soundManager.playUI('CLICK'); }}
                    className="bg-black/40 hover:bg-black/60 text-white border border-white/20 px-4 py-2 rounded font-bold backdrop-blur-md text-sm"
                >
                    {viewMode === 'ORBIT' ? 'TACTICAL' : 'ORBIT'}
                </button>
                <button 
                    onClick={() => { toggleMap(true); soundManager.playUI('CLICK'); }}
                    className="bg-black/40 hover:bg-black/60 text-white border border-white/20 px-4 py-2 rounded font-bold backdrop-blur-md text-sm"
                >
                    MAP
                </button>
                <button 
                    onClick={() => { toggleAdmin(true); soundManager.playUI('CLICK'); }}
                    className="bg-axiom-purple/40 hover:bg-axiom-purple/60 text-white border border-axiom-purple/50 px-4 py-2 rounded font-bold backdrop-blur-md text-sm"
                >
                    ADMIN
                </button>
            </div>
        </div>

        {/* Right Side */}
        <div className="relative flex">
            <QuestLog />
            <NotaryDashboard />
        </div>

      </div>

      {/* Modals & Overlays */}
      <PayPalModal isOpen={isPayModalOpen} onClose={() => setPayModalOpen(false)} />
      <AdminDashboard />
      <WorldMap />
      
      {/* Axiom Watermark */}
      <div className="absolute bottom-2 right-84 text-white/5 text-[100px] font-serif font-bold pointer-events-none select-none z-0">
        OUROBOROS
      </div>
    </div>
  );
};

export default App;
