
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { AgentState, AXIOMS } from '../../types';
import { Timer, ZapOff } from 'lucide-react';

export const AgentHUD = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const selectAgent = useStore(state => state.selectAgent);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const toggleMount = useStore(state => state.toggleMount);
  const isOpen = useStore(state => state.showCharacterSheet);
  const isMobile = useStore(state => state.device.isMobile);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const agent = agents.find(a => a.id === selectedAgentId);

  if (!agent) return null;

  const SCAN_COOLDOWN = 30 * 60 * 1000;
  const timeSinceLastScan = now - agent.lastScanTime;
  const isOnScanCooldown = timeSinceLastScan < SCAN_COOLDOWN;
  const remainingScanTime = Math.max(0, SCAN_COOLDOWN - timeSinceLastScan);
  const minutes = Math.floor(remainingScanTime / 60000);
  const seconds = Math.floor((remainingScanTime % 60000) / 1000);

  return (
    <div className={`fixed top-8 left-8 pointer-events-auto transition-all duration-300 z-50 ${isMobile ? 'w-64' : 'w-72'}`}>
        <div className={`bg-axiom-dark/95 backdrop-blur-xl border border-axiom-cyan/30 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all ${isOpen ? 'opacity-50 blur-sm hover:opacity-100 hover:blur-0' : 'opacity-100'}`}>
            <div className="h-1 bg-axiom-cyan w-full"></div>
            <div className="p-3 md:p-4 relative">
                <button 
                    onClick={() => selectAgent(null)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white p-2"
                >
                    ✕
                </button>
                
                <h2 className="text-lg md:text-xl font-serif text-white mb-1">{String(agent.name || "Unknown")}</h2>
                <div className="flex items-center space-x-2 text-[10px] mb-3">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-axiom-cyan uppercase">Level {String(agent.level || 1)}</span>
                    <span className={`px-2 py-0.5 rounded border border-axiom-purple/30 text-axiom-purple uppercase font-bold tracking-tighter`}>
                        {String(agent.state || AgentState.IDLE)}
                    </span>
                    {agent.isAwakened && (
                        <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${agent.apiQuotaExceeded ? 'text-red-500 animate-pulse' : 'text-axiom-gold'}`}>
                            {agent.apiQuotaExceeded ? <ZapOff className="w-2.5 h-2.5" /> : null}
                            {agent.apiQuotaExceeded ? 'Neural Limit' : 'Awakened'}
                        </span>
                    )}
                </div>

                {isOnScanCooldown && (
                    <div className="flex items-center gap-2 mb-3 bg-white/5 p-2 rounded border border-white/5">
                        <Timer className="w-3 h-3 text-axiom-gold" />
                        <div className="flex flex-col">
                            <span className="text-[7px] text-gray-500 uppercase font-black">Matrix Scan Ready In</span>
                            <span className="text-[10px] text-axiom-gold font-mono">{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                )}

                {agent.apiQuotaExceeded && (
                    <div className="mb-3 bg-red-950/20 border border-red-500/30 p-2 rounded text-[9px] text-red-400 font-medium italic">
                        The Axiomatic Neural Link is currently throttled due to high entropy. Local heuristics active.
                    </div>
                )}

                <div className="space-y-3 mb-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                            <span title={String(AXIOMS.EROSION)}>Reality Integrity</span>
                            <span className={(agent.integrity || 0) < 0.3 ? 'text-red-500 animate-pulse' : 'text-axiom-gold'}>
                                {String(((agent.integrity || 0) * 100).toFixed(1))}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div 
                                className="h-full bg-axiom-gold transition-all duration-500"
                                style={{ width: `${((agent.integrity || 0) * 100).toFixed(0)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                            <span title={String(AXIOMS.ENERGY)}>Axiomatic Energy</span>
                            <span className="text-axiom-cyan">{String((agent.energy || 0).toFixed(0))} / {String(agent.maxEnergy || 100)}</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div 
                                className="h-full bg-axiom-cyan transition-all duration-300 shadow-[0_0_5px_#06b6d4]"
                                style={{ width: `${(((agent.energy || 0) / (agent.maxEnergy || 100)) * 100).toFixed(0)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] text-gray-400 uppercase">
                            <span>Soul Density</span>
                            <span>{String(((agent.soulDensity || 0.5) * 100).toFixed(0))}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-axiom-purple to-soul-fire"
                                style={{ width: `${((agent.soulDensity || 0.5) * 100).toFixed(0)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex space-x-2">
                    <button 
                        onClick={() => toggleCharacterSheet(true)}
                        className="flex-1 bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 text-axiom-purple text-[10px] font-bold py-2 rounded transition-colors uppercase tracking-wider active:scale-95"
                    >
                        Inspect Gear
                    </button>
                    {agent.faction === 'PLAYER' && (
                        <button 
                            onClick={() => toggleMount(agent.id)}
                            className={`flex-1 border text-[10px] font-bold py-2 rounded transition-colors uppercase tracking-wider active:scale-95 ${
                                agent.state === AgentState.MOUNTED 
                                ? 'bg-red-900/20 border-red-500 text-red-500 hover:bg-red-900/40' 
                                : 'bg-axiom-gold/20 border-axiom-gold/50 text-axiom-gold hover:bg-axiom-gold/40'
                            }`}
                        >
                            {agent.state === AgentState.MOUNTED ? 'Dismount' : 'Summon Mount'}
                        </button>
                    )}
                </div>

            </div>
            
            <div className="bg-white/5 p-2 flex justify-between items-center text-[9px] text-gray-600 font-mono">
                <span>DNA: {String((agent.dna?.hash || "0x0").slice(0,12))}...</span>
                <span>COORD: {`[${String((agent.position?.[0] || 0).toFixed(0))}, ${String((agent.position?.[2] || 0).toFixed(0))}]`}</span>
            </div>
        </div>
    </div>
  );
};
