
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { AgentState, AXIOMS } from '../../types';
import { Timer, ZapOff, Eye, Package, Shield, Swords, Pickaxe, Hammer, Brain } from 'lucide-react';

export const AgentHUD = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const selectAgent = useStore(state => state.selectAgent);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
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

  const invCount = agent.inventory.filter(i => i).length;
  const bankCount = agent.bank.filter(i => i).length;

  const topSkills = Object.entries(agent.skills || {})
    .sort(([, a], [, b]) => b.level - a.level)
    .slice(0, 3);

  const getSkillIcon = (name: string) => {
    switch(String(name).toLowerCase()) {
        case 'mining': return <Pickaxe className="w-3 h-3" />;
        case 'combat': return <Swords className="w-3 h-3" />;
        case 'crafting': return <Hammer className="w-3 h-3" />;
        default: return <Package className="w-3 h-3" />;
    }
  };

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
                    <span className="bg-white/10 px-2 py-0.5 rounded text-axiom-cyan uppercase tracking-tighter">LVL {String(agent.level || 1)}</span>
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

                {/* Cognitive Trace - FIXED ERROR #31 */}
                {agent.lastDecision && (
                    <div className="mb-4 bg-axiom-cyan/5 border border-axiom-cyan/20 p-2 rounded text-[9px] italic text-cyan-100 leading-tight">
                        <div className="flex items-center gap-1 mb-1 not-italic font-black text-axiom-cyan uppercase">
                            <Brain className="w-2.5 h-2.5" /> 
                            {String(agent.lastDecision.decision)}
                        </div>
                        {String(agent.lastDecision.justification)}
                    </div>
                )}

                {/* SKILLS SECTION */}
                <div className="grid grid-cols-3 gap-1 mb-4">
                    {topSkills.map(([name, skill]) => (
                        <div key={name} className="bg-black/40 p-1.5 rounded border border-white/5 flex flex-col items-center">
                            <span className="text-[7px] text-gray-500 uppercase font-black">{String(name)}</span>
                            <div className="flex items-center gap-1 text-white">
                                {getSkillIcon(name)}
                                <span className="text-[10px] font-bold">{String(skill.level)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-axiom-gold/5 p-2 rounded border border-axiom-gold/20 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-axiom-gold" />
                            <span className="text-[8px] text-gray-400 uppercase font-black">Vision</span>
                        </div>
                        <span className="text-[10px] text-white font-mono">{String(agent.visionRange.toFixed(0))}u</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${invCount >= 9 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-1">
                            <Package className={`w-3 h-3 ${invCount >= 9 ? 'text-red-500' : 'text-gray-400'}`} />
                            <span className="text-[8px] text-gray-400 uppercase font-black">Inv</span>
                        </div>
                        <span className={`text-[10px] font-mono ${invCount >= 9 ? 'text-red-500' : 'text-white'}`}>{String(invCount)}/10</span>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                            <span>Matrix Integrity</span>
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
                </div>
                
                <div className="flex space-x-2">
                    <button 
                        onClick={() => toggleCharacterSheet(true)}
                        className="flex-1 bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 text-axiom-purple text-[10px] font-bold py-2 rounded transition-colors uppercase tracking-wider active:scale-95"
                    >
                        Neural Matrix
                    </button>
                    {bankCount > 0 && (
                         <div className="bg-axiom-cyan/10 border border-axiom-cyan/30 rounded px-2 flex flex-col items-center justify-center">
                            <span className="text-[7px] text-axiom-cyan uppercase font-black">Bank</span>
                            <span className="text-[10px] text-white font-bold">{String(bankCount)}</span>
                         </div>
                    )}
                </div>

            </div>
            
            <div className="bg-white/5 p-2 flex justify-between items-center text-[9px] text-gray-600 font-mono">
                <span>DNA: {String((agent.dna?.hash || "0x0").slice(0,10))}</span>
                <span>COORD: {`[${String((agent.position?.[0] || 0).toFixed(0))}, ${String((agent.position?.[2] || 0).toFixed(0))}]`}</span>
            </div>
        </div>
    </div>
  );
};
