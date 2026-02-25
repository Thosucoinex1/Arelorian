
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { AgentState } from '../../types';
import { getXPForNextLevel } from '../../utils';
import { Timer, ZapOff, Eye, Package, Swords, Pickaxe, Hammer, Brain, Zap } from 'lucide-react';

export const AgentHUD = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const selectAgent = useStore(state => state.selectAgent);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const toggleAuctionHouse = useStore(state => state.toggleAuctionHouse);
  const toggleQuests = useStore(state => state.toggleQuests);
  const globalApiCooldown = useStore(state => state.globalApiCooldown);
  const isOpen = useStore(state => state.showCharacterSheet);
  const { isMobile, isTablet, orientation } = useStore(state => state.device);
  const isLandscapeMobile = isMobile && orientation === 'landscape';

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const agent = agents.find(a => a.id === selectedAgentId);

  if (!agent) return null;

  // Adjust positioning and sizing for mobile landscape
  const hudWidth = isMobile ? (isLandscapeMobile ? 'w-56' : 'w-64') : (isTablet ? 'w-80' : 'w-72');
  const hudTop = isLandscapeMobile ? 'top-4' : (isTablet ? 'top-10' : 'top-8');
  const hudLeft = isLandscapeMobile ? 'left-4' : (isTablet ? 'left-10' : 'left-8');
  const maxHeight = screenHeight - (isLandscapeMobile ? 32 : 128);

  const SCAN_COOLDOWN = 30 * 60 * 1000;
  const timeSinceLastScan = now - agent.lastScanTime;

  const invCount = agent.inventory.filter(i => i).length;
  const bankCount = agent.bank.filter(i => i).length;
  
  const isThrottled = now < globalApiCooldown;

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
    <div className={`fixed ${hudTop} ${hudLeft} pointer-events-auto transition-all duration-300 z-50 ${hudWidth}`}>
        <div 
          className={`bg-axiom-dark/95 backdrop-blur-xl border border-axiom-cyan/30 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all ${isOpen ? 'opacity-50 blur-sm hover:opacity-100 hover:blur-0' : 'opacity-100'}`}
          style={{ maxHeight: isLandscapeMobile ? `${maxHeight}px` : 'none', overflowY: isLandscapeMobile ? 'auto' : 'visible' }}
        >
            <div className="h-1 bg-axiom-cyan w-full"></div>
            <div className="p-3 md:p-4 relative">
                <button 
                    onClick={() => selectAgent(null)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white p-2"
                >
                    ✕
                </button>
                
                <h2 className={`${isTablet ? 'text-2xl' : 'text-lg md:text-xl'} font-serif text-white mb-1`}>{String(agent.name || "Unknown")}</h2>
                <div className={`flex items-center space-x-2 ${isTablet ? 'text-xs' : 'text-[10px]'} mb-3`}>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-axiom-cyan uppercase tracking-tighter">LVL {String(agent.level || 1)}</span>
                    <span className={`px-2 py-0.5 rounded border border-axiom-purple/30 text-axiom-purple uppercase font-bold tracking-tighter`}>
                        {String(agent.state || AgentState.IDLE)}
                    </span>
                    {agent.isAwakened && (
                        <div className="flex items-center gap-1">
                            <span className={`${isTablet ? 'text-xs' : 'text-[10px]'} font-black uppercase flex items-center gap-1 ${agent.apiQuotaExceeded || isThrottled ? 'text-red-500 animate-pulse' : 'text-axiom-gold'}`}>
                                {agent.apiQuotaExceeded || isThrottled ? <ZapOff className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                                {isThrottled ? 'Throttled' : 'Awakened'}
                            </span>
                            {agent.apiQuotaExceeded && (
                                <span className={`${isTablet ? 'text-[10px]' : 'text-[8px]'} bg-red-500/20 text-red-500 px-1 rounded border border-red-500/30 font-mono`}>QUOTA_EXCEEDED</span>
                            )}
                        </div>
                    )}
                </div>

                {/* XP PROGRESS SECTION */}
                <div className="mb-4">
                    <div className={`flex justify-between ${isTablet ? 'text-[11px]' : 'text-[9px]'} text-gray-500 uppercase font-black mb-1`}>
                        <span>Experience</span>
                        <span className="text-axiom-cyan">{String(agent.xp)} / {String(getXPForNextLevel(agent.level))} XP</span>
                    </div>
                    <div className={`${isTablet ? 'h-2.5' : 'h-1.5'} w-full bg-black/40 rounded-full overflow-hidden border border-white/5`}>
                        <div 
                            className="h-full bg-gradient-to-r from-axiom-cyan to-blue-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                            style={{ width: `${Math.min(100, (agent.xp / getXPForNextLevel(agent.level)) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Cognitive Trace - FIXED ERROR #31 */}
                {agent.lastDecision && (
                    <div className={`mb-4 bg-axiom-cyan/5 border border-axiom-cyan/20 p-2 rounded ${isTablet ? 'text-[11px]' : 'text-[9px]'} italic text-cyan-100 leading-tight`}>
                        <div className="flex items-center gap-1 mb-1 not-italic font-black text-axiom-cyan uppercase">
                            <Brain className={`${isTablet ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} /> 
                            {String(agent.lastDecision.decision)}
                            {timeSinceLastScan < SCAN_COOLDOWN && <span className={`${isTablet ? 'text-[9px]' : 'text-[7px]'} ml-auto text-red-500 font-mono`}>[HEURISTIC]</span>}
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
                    <div className="bg-white/5 p-2 rounded border border-white/10 group hover:border-axiom-cyan/40 transition-colors">
                        <p className={`${isTablet ? 'text-[10px]' : 'text-[8px]'} text-gray-500 uppercase font-black mb-1 flex items-center gap-1`}>
                            <Brain className="w-2.5 h-2.5" /> Neural Personality
                        </p>
                        <p className={`${isTablet ? 'text-xs' : 'text-[10px]'} text-axiom-cyan font-medium leading-tight`}>{String(agent.thinkingMatrix?.personality || "Standard Axiomatic")}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/10 group hover:border-axiom-gold/40 transition-colors">
                        <p className={`${isTablet ? 'text-[10px]' : 'text-[8px]'} text-gray-500 uppercase font-black mb-1 flex items-center gap-1`}>
                            <Timer className="w-2.5 h-2.5" /> Long-Term Objective
                        </p>
                        <p className={`${isTablet ? 'text-xs' : 'text-[10px]'} text-white font-medium leading-tight`}>{String(agent.thinkingMatrix?.currentLongTermGoal || "Awaiting Directive")}</p>
                    </div>

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

                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                            <span>Conscious Expansion</span>
                            <span className="text-axiom-cyan">
                                {String((agent.consciousnessLevel * 100).toFixed(1))}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full mt-1 overflow-hidden relative">
                            <div 
                                className="h-full bg-axiom-cyan transition-all duration-500"
                                style={{ width: `${(agent.consciousnessLevel * 100).toFixed(0)}%` }}
                            ></div>
                            <div 
                                className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300"
                                style={{ width: `${(agent.awakeningProgress).toFixed(0)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
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
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => toggleAuctionHouse(true)}
                            className="flex-1 bg-axiom-gold/10 hover:bg-axiom-gold/20 border border-axiom-gold/30 text-axiom-gold text-[9px] font-bold py-1.5 rounded transition-colors uppercase tracking-widest active:scale-95"
                        >
                            Auction House
                        </button>
                        <button 
                            onClick={() => toggleQuests(true)}
                            className="flex-1 bg-axiom-cyan/10 hover:bg-axiom-cyan/20 border border-axiom-cyan/30 text-axiom-cyan text-[9px] font-bold py-1.5 rounded transition-colors uppercase tracking-widest active:scale-95"
                        >
                            Quest Board
                        </button>
                    </div>
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
