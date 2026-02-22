
import React, { useState } from 'react';
import { useStore } from '../../store';
import { soundManager } from '../../services/SoundManager';
import { Brain, History, Zap } from 'lucide-react';

export const AgentMemoryDisplay = ({ agentId }: { agentId: string }) => {
    const agents = useStore(state => state.agents);
    const reflectOnMemory = useStore(state => state.reflectOnMemory);
    const agent = agents.find(a => a.id === agentId);
    const [isReflecting, setIsReflecting] = useState(false);

    if (!agent) return null;

    const handleReflection = async () => {
        setIsReflecting(true);
        soundManager.playUI('CLICK');
        await reflectOnMemory(agent.id);
        setIsReflecting(false);
        soundManager.playCombat('MAGIC');
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-axiom-cyan text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4" /> Neural History
                </h3>
                <button 
                    onClick={handleReflection}
                    disabled={isReflecting || agent.memoryCache.length < 3}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                        isReflecting 
                        ? 'bg-axiom-purple/40 border-axiom-purple text-white animate-pulse' 
                        : 'bg-axiom-gold/20 border-axiom-gold/40 text-axiom-gold hover:bg-axiom-gold hover:text-black'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                    <Brain className="w-3 h-3" />
                    {isReflecting ? 'Processing...' : 'Initiate Reflection'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-black/40 p-3 rounded-xl border border-white/5">
                {agent.memoryCache.length === 0 ? (
                    <div className="text-center py-10 opacity-30 italic text-xs">
                        Neural logs are empty. Experience is required for reflection.
                    </div>
                ) : (
                    agent.memoryCache.slice().reverse().map((mem, i) => {
                        const isReflection = mem.startsWith('REFLECTED:');
                        return (
                            <div 
                                key={i} 
                                className={`p-3 rounded-lg text-[11px] leading-relaxed border transition-all ${
                                    isReflection 
                                    ? 'bg-axiom-cyan/10 border-axiom-cyan/20 text-axiom-cyan font-medium' 
                                    : 'bg-white/5 border-white/5 text-gray-300'
                                }`}
                            >
                                {isReflection && <Zap className="w-3 h-3 mb-1 text-axiom-cyan" />}
                                {mem}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="mt-4 p-4 bg-axiom-purple/10 border border-axiom-purple/20 rounded-xl">
                <h4 className="text-[10px] text-axiom-purple font-bold uppercase mb-2">Cognitive & Economic Matrix</h4>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-[10px]">
                    <div>
                        <span className="text-gray-500 uppercase block">Personality</span>
                        <span className="text-white font-bold">{agent.thinkingMatrix.personality}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Goal</span>
                        <span className="text-white font-bold truncate" title={agent.thinkingMatrix.currentLongTermGoal}>{agent.thinkingMatrix.currentLongTermGoal}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Market Role</span>
                        <span className="text-white font-bold">{agent.economicDesires.marketRole}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Sociability</span>
                        <span className="text-white font-bold">{((agent.thinkingMatrix.sociability ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Aggression</span>
                        <span className="text-white font-bold">{((agent.thinkingMatrix.aggression ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                     <div>
                        <span className="text-gray-500 uppercase block">Alignment</span>
                        <span className="text-white font-bold">{(agent.thinkingMatrix.alignment ?? 0).toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Greed</span>
                        <span className="text-white font-bold">{((agent.economicDesires.greedLevel ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Risk Appetite</span>
                        <span className="text-white font-bold">{((agent.economicDesires.riskAppetite ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase block">Frugality</span>
                        <span className="text-white font-bold">{((agent.economicDesires.frugality ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
