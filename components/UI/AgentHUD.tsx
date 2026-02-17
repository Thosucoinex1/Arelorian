import React from 'react';
import { useStore } from '../../store';

export const AgentHUD = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const selectAgent = useStore(state => state.selectAgent);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const isOpen = useStore(state => state.showCharacterSheet);

  const agent = agents.find(a => a.id === selectedAgentId);

  if (!agent) return null;

  // If character sheet is open, we hide the mini-HUD to avoid clutter, 
  // or we can keep it as a small anchor. Let's keep it but simplified.
  
  return (
    <div className="absolute top-4 left-4 z-20 w-72 pointer-events-auto transition-all duration-300">
        <div className={`bg-axiom-dark/95 backdrop-blur-xl border border-axiom-cyan/30 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all ${isOpen ? 'opacity-50 blur-sm hover:opacity-100 hover:blur-0' : 'opacity-100'}`}>
            <div className="h-1 bg-axiom-cyan w-full"></div>
            <div className="p-4 relative">
                <button 
                    onClick={() => selectAgent(null)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white"
                >
                    ✕
                </button>
                
                <h2 className="text-xl font-serif text-white mb-1">{agent.name}</h2>
                <div className="flex items-center space-x-2 text-xs mb-3">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-axiom-cyan">Lvl {agent.level}</span>
                    <span className={`px-2 py-0.5 rounded border ${
                        agent.state === 'COMBAT' ? 'border-red-500 text-red-500' : 'border-gray-500 text-gray-400'
                    }`}>
                        {agent.state}
                    </span>
                </div>

                <div className="space-y-2 mb-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-400 uppercase">
                            <span>Soul Density</span>
                            <span>{(agent.soulDensity * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-axiom-purple to-soul-fire"
                                style={{ width: `${agent.soulDensity * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex space-x-2">
                    <button 
                        onClick={() => toggleCharacterSheet(true)}
                        className="flex-1 bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 text-axiom-purple text-xs font-bold py-2 rounded transition-colors uppercase tracking-wider"
                    >
                        Inspect Gear
                    </button>
                </div>

            </div>
            
            <div className="bg-white/5 p-2 flex justify-between items-center text-[10px] text-gray-500">
                <span>ID: {agent.id}</span>
                <span>POS: {agent.position[0].toFixed(0)}, {agent.position[2].toFixed(0)}</span>
            </div>
        </div>
    </div>
  );
};