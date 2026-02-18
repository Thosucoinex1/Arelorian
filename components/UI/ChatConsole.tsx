
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ChatChannel, ChatMessage, ActionProposal } from '../../types';
import { soundManager } from '../../services/SoundManager';
import { Brain, MessageSquare, Shield, Zap, Info, Globe, ChevronUp, ChevronDown, CheckCircle2, XCircle, Loader2, ArrowRightLeft, Hand, Sparkles } from 'lucide-react';

export const ChatConsole = () => {
    const messages = useStore(state => state.chatMessages);
    const agents = useStore(state => state.agents);
    const actionProposals = useStore(state => state.actionProposals);
    const manualProposalAction = useStore(state => state.manualProposalAction);
    const setCameraTarget = useStore(state => state.setCameraTarget);
    const selectAgent = useStore(state => state.selectAgent);
    const isMobile = useStore(state => state.device.isMobile);
    const [activeTab, setActiveTab] = useState<ChatChannel | 'ALL'>('ALL');
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded, activeTab, actionProposals]);

    const filteredMessages = activeTab === 'ALL' 
        ? messages 
        : messages.filter(m => m.channel === activeTab);

    const getChannelStyles = (channel: ChatChannel) => {
        switch(channel) {
            case 'GLOBAL': return { color: 'text-red-400', icon: <Globe className="w-3 h-3" />, bg: 'bg-red-500/5' };
            case 'LOCAL': return { color: 'text-white', icon: <MessageSquare className="w-3 h-3" />, bg: 'bg-white/5' };
            case 'COMBAT': return { color: 'text-yellow-500', icon: <Shield className="w-3 h-3" />, bg: 'bg-yellow-500/5' };
            case 'SYSTEM': return { color: 'text-blue-400', icon: <Info className="w-3 h-3" />, bg: 'bg-blue-500/5' };
            case 'THOUGHT': return { color: 'text-axiom-cyan', icon: <Brain className="w-3 h-3" />, bg: 'bg-axiom-cyan/10' };
            case 'EVENT': return { color: 'text-axiom-gold', icon: <Zap className="w-3 h-3" />, bg: 'bg-axiom-gold/10' };
            default: return { color: 'text-gray-400', icon: <MessageSquare className="w-3 h-3" />, bg: 'bg-transparent' };
        }
    };

    const handleMessageClick = (msg: ChatMessage) => {
        soundManager.playUI('CLICK');
        if (msg.channel === 'EVENT' && msg.eventPosition) {
            setCameraTarget([...msg.eventPosition]);
            soundManager.playCombat('MAGIC');
            return;
        }
        const targetAgent = agents.find(a => a.id === msg.senderId);
        if (targetAgent) {
            setCameraTarget([...targetAgent.position]);
            selectAgent(targetAgent.id);
            soundManager.playCombat('MAGIC');
        }
    };

    return (
        <div className={`
            relative pointer-events-auto shadow-2xl z-30 font-sans transition-all duration-500 ease-in-out
            ${isMobile ? 'w-full max-w-sm' : 'w-[580px]'}
            ${isExpanded ? 'h-64 md:h-80 bg-axiom-dark/95' : 'h-10 bg-axiom-dark/70'}
            border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl overflow-hidden
        `}>
            {/* Tab Bar */}
            <div className="flex justify-between items-center border-b border-white/5 bg-black/40 px-2 h-10 shrink-0">
                <div className="flex overflow-x-auto scrollbar-hide gap-1">
                    {['ALL', 'LOCAL', 'EVENT', 'THOUGHT', 'SYSTEM', 'COMBAT'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); setIsExpanded(true); }}
                            className={`px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === tab 
                                ? 'bg-axiom-cyan/20 text-axiom-cyan border border-axiom-cyan/30' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {getChannelStyles(tab as ChatChannel).icon}
                            {tab === 'THOUGHT' ? 'COGNITION' : tab}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="text-gray-400 hover:text-white p-2 transition-transform active:scale-90"
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Message Feed */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]">
                        {filteredMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-2">
                                <Brain className="w-8 h-8" />
                                <div className="text-[10px] uppercase font-bold tracking-widest">Neural Link Silent</div>
                            </div>
                        )}
                        {filteredMessages.map((msg) => {
                            const { color, icon, bg } = getChannelStyles(msg.channel);
                            const isCognition = msg.channel === 'THOUGHT';
                            const proposal = msg.proposalId ? actionProposals.find(p => p.id === msg.proposalId) : null;

                            return (
                                <div key={msg.id} className={`group flex flex-col p-2.5 rounded-xl transition-all border border-transparent hover:border-white/5 ${bg} ${isCognition ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`${color} opacity-70`}>{icon}</div>
                                        <span className="text-[8px] font-mono text-gray-600">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        {msg.channel !== 'SYSTEM' && (
                                            <span onClick={() => handleMessageClick(msg)} className={`text-[10px] font-black uppercase tracking-tighter cursor-pointer hover:underline flex items-center gap-1 ${color}`}>
                                                {msg.senderName}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`text-[11px] leading-relaxed transition-colors ${isCognition ? 'text-cyan-100/90 font-medium italic pl-1 border-l border-axiom-cyan/20 cursor-pointer' : msg.channel === 'EVENT' ? 'text-axiom-gold font-bold uppercase tracking-tight' : 'text-gray-300'}`}>
                                        {msg.message}
                                    </div>

                                    {proposal && (
                                        <div className="mt-2.5 bg-black/60 border border-white/10 rounded-xl p-3 animate-in zoom-in-95 shadow-inner">
                                            <div className="flex justify-between items-center mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-axiom-cyan animate-pulse" />
                                                    <span className="text-[9px] text-axiom-cyan font-black uppercase tracking-[0.2em]">Sovereign Proposal</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {proposal.status === 'PENDING' && <Loader2 className="w-3 h-3 text-axiom-cyan animate-spin" />}
                                                    <span className={`text-[8px] font-bold uppercase ${proposal.status === 'PENDING' ? 'text-axiom-cyan' : proposal.status === 'DECLINED' ? 'text-red-500' : 'text-green-500'}`}>
                                                        {proposal.status}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="text-[10px] text-gray-300 mb-2.5 leading-tight italic">
                                                "{proposal.description}"
                                            </div>

                                            {proposal.status === 'PENDING' && (
                                                <div className="flex items-center gap-2 py-1 bg-axiom-cyan/10 rounded-lg px-2 border border-axiom-cyan/20 mb-2">
                                                    <Brain className="w-3 h-3 text-axiom-cyan" />
                                                    <span className="text-[8px] text-axiom-cyan font-bold uppercase">Self-Deliberating...</span>
                                                </div>
                                            )}

                                            {proposal.decisionReasoning && (
                                                <div className="text-[9px] italic text-axiom-cyan/70 border-t border-white/5 pt-2 mt-2 bg-white/5 p-2 rounded-lg">
                                                    <div className="flex items-center gap-1 mb-1 opacity-50 font-black uppercase tracking-widest text-[7px]">Cognitive Trace</div>
                                                    {proposal.decisionReasoning}
                                                </div>
                                            )}

                                            {(proposal.costGold || proposal.costWood || proposal.costStone) && proposal.status === 'PENDING' && (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex gap-3 text-[9px] opacity-70">
                                                    {proposal.costGold && <div className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-axiom-gold" /> {proposal.costGold}g</div>}
                                                    {proposal.costWood && <div className="flex items-center gap-1"><Hand className="w-2.5 h-2.5 text-green-400" /> {proposal.costWood}w</div>}
                                                    {proposal.costStone && <div className="flex items-center gap-1"><Shield className="w-2.5 h-2.5 text-gray-400" /> {proposal.costStone}s</div>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="h-9 border-t border-white/5 flex items-center px-4 bg-black/80 shrink-0">
                        <div className="flex items-center gap-4 w-full">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-axiom-cyan animate-pulse shadow-[0_0_5px_#06b6d4]" />
                                <span className="text-axiom-cyan text-[9px] font-black uppercase tracking-widest">Sovereign Link</span>
                            </div>
                            <div className="flex-1 h-[1px] bg-white/5" />
                            <div className="text-[9px] text-gray-500 font-mono italic">Axiom v4.1 (Autonomous)</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
