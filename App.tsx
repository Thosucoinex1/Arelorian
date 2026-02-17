
import React, { useEffect, useState } from 'react';
import WorldScene from './components/World/WorldScene';
import { AgentHUD } from './components/UI/AgentHUD';
import { ChatConsole } from './components/UI/ChatConsole';
import { AuctionHouse } from './components/UI/AuctionHouse';
import { CharacterSheet } from './components/UI/CharacterSheet';
import { useStore } from './store';
import { NotaryDashboard } from './components/UI/NotaryDashboard';
import { AdminDashboard } from './components/UI/AdminDashboard';
import { WorldMap } from './components/UI/WorldMap';
import { QuestLog } from './components/UI/QuestLog';
import { EventOverlay } from './components/UI/EventOverlay';
import { soundManager } from './services/SoundManager';
import { VirtualJoysticks } from './components/UI/VirtualJoysticks';

const AuthGate = () => {
    const { user, login } = useStore();
    const [email, setEmail] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if(email) login(email);
    };

    if (!user) {
        return (
            <div className="w-full h-screen bg-axiom-dark flex items-center justify-center font-sans">
                <div className="w-96 bg-black/30 border border-axiom-purple/50 rounded-lg p-8 shadow-2xl backdrop-blur-lg text-center">
                    <h1 className="text-3xl font-serif text-white tracking-widest mb-2">OUROBOROS</h1>
                    <p className="text-sm text-gray-400 mb-6">Axiom Engine - Notary Authentication</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="notary_email@axiom.dev"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-3 text-sm text-white rounded mb-4 focus:outline-none focus:ring-2 focus:ring-axiom-cyan"
                            required
                        />
                        <button type="submit" className="w-full bg-axiom-purple hover:bg-axiom-purple/80 text-white py-3 rounded font-bold uppercase tracking-wider transition-colors">
                            Assume Notary Role
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <App />;
}

const App = () => {
  const { initGame, showAdmin, showMap, toggleAdmin, toggleMap, device } = useStore();
  const isMobile = device.isMobile;

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleToggle = (setter: (show: boolean) => void, current: boolean) => {
    setter(!current);
    soundManager.playUI('CLICK');
  }

  return (
    <div className="w-full h-screen relative bg-axiom-dark overflow-hidden font-sans select-none touch-none">
      <EventOverlay />
      <div className="absolute inset-0 z-0">
        <WorldScene />
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none flex justify-between p-2 md:p-4 pt-12">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-4 items-start">
            <AgentHUD />
            <AuctionHouse />
          </div>
          <ChatConsole />
        </div>
        <div className="h-full flex flex-col items-end justify-between">
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
                 <div className="flex gap-2">
                     <button onClick={() => handleToggle(toggleMap, showMap)} className="w-10 h-10 bg-black/50 border border-white/20 rounded text-gray-300 hover:bg-axiom-purple text-xs font-bold">MAP</button>
                     <button onClick={() => handleToggle(toggleAdmin, showAdmin)} className="w-10 h-10 bg-black/50 border border-white/20 rounded text-gray-300 hover:bg-axiom-purple text-xs font-bold">ADM</button>
                 </div>
                <QuestLog />
            </div>
        </div>
      </div>
       <div className="absolute top-0 right-0 h-full z-20 pointer-events-none flex items-center pt-10">
            <NotaryDashboard />
       </div>
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
        <CharacterSheet />
      </div>
      <AdminDashboard />
      <WorldMap />
      {isMobile && <VirtualJoysticks />}
    </div>
  );
};

export default AuthGate;
