
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ChatChannel, ChatMessage, ActionProposal } from '../../types';
import { soundManager } from '../../services/SoundManager';
import { Brain, MessageSquare, Shield, Zap, Info, Globe, ChevronUp, ChevronDown, CheckCircle2, XCircle, Loader2, ArrowRightLeft } from 'lucide-react';

export const ChatConsole = () => {
    const messages = useStore(state => state.chatMessages);
    const agents = useStore(state => state.agents);
    const actionProposals = useStore(state => state.actionProposals);
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
    }, [messages, isExpanded, activeTab]);

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

    const isGerman = (text: string) => /der|die|das|und|ist|ich|nicht|gebaut|haus|beutel|bündnis|möchte/i.test(text);

    return (
        <div className={`
            relative pointer-events-auto shadow-2xl z-30 font-sans transition-all duration-500 ease-in-out
            ${isMobile ? 'w-full max-w-sm' : 'w-[580px]'}
            ${isExpanded ? 'h-52 md:h-64 bg-axiom-dark/90' : 'h-10 bg-axiom-dark/70'}
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
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]">
                        {filteredMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-2">
                                <Brain className="w-8 h-8" />
                                <div className="text-[10px] uppercase font-bold tracking-widest">Neural Link Silent</div>
                            </div>
                        )}
                        {filteredMessages.map((msg) => {
                            const { color, icon, bg } = getChannelStyles(msg.channel);
                            const isCognition = msg.channel === 'THOUGHT';
                            const msgIsGerman = isGerman(msg.message);
                            const proposal = msg.proposalId ? actionProposals.find(p => p.id === msg.proposalId) : null;

                            return (
                                <div 
                                    key={msg.id} 
                                    className={`group flex flex-col p-2 rounded-xl transition-all border border-transparent hover:border-white/5 ${bg} ${
                                        isCognition ? 'animate-in fade-in slide-in-from-left-2 duration-300' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={`${color} opacity-70`}>{icon}</div>
                                        <span className="text-[8px] font-mono text-gray-600">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        {msg.channel !== 'SYSTEM' && (
                                            <span 
                                                onClick={() => handleMessageClick(msg)}
                                                className={`text-[10px] font-black uppercase tracking-tighter cursor-pointer hover:underline flex items-center gap-1 ${color}`}
                                            >
                                                {msg.senderName}
                                                {msgIsGerman && <span className="text-[7px] bg-white/5 px-1 rounded opacity-50">DE</span>}
                                                {!msgIsGerman && msg.channel !== 'EVENT' && <span className="text-[7px] bg-white/5 px-1 rounded opacity-50">EN</span>}
                                            </span>
                                        )}
                                    </div>
                                    <div 
                                        onClick={() => (msg.channel === 'EVENT' || msg.channel === 'THOUGHT') ? handleMessageClick(msg) : null}
                                        className={`text-[11px] leading-relaxed transition-colors ${
                                            isCognition 
                                            ? 'text-cyan-100/90 font-medium italic pl-1 border-l border-axiom-cyan/20 cursor-pointer' 
                                            : msg.channel === 'EVENT' 
                                                ? 'text-axiom-gold font-bold uppercase tracking-tight cursor-pointer' 
                                                : 'text-gray-300'
                                        }`}
                                    >
                                        {msg.message}
                                    </div>

                                    {/* Proposal Interaction Block */}
                                    {proposal && (
                                        <div className="mt-2 bg-black/60 border border-white/10 rounded-lg p-3 animate-in zoom-in-95 duration-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <ArrowRightLeft className="w-3 h-3 text-axiom-purple" />
                                                    <span className="text-[9px] text-axiom-purple font-black uppercase tracking-[0.2em]">Dialectic Proposal</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {proposal.status === 'PENDING' && <Loader2 className="w-3 h-3 text-axiom-cyan animate-spin" />}
                                                    {proposal.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                                    {proposal.status === 'EXECUTED' && <CheckCircle2 className="w-3 h-3 text-axiom-gold" />}
                                                    {proposal.status === 'DECLINED' && <XCircle className="w-3 h-3 text-red-500" />}
                                                    <span className={`text-[8px] font-bold uppercase ${
                                                        proposal.status === 'PENDING' ? 'text-axiom-cyan' :
                                                        proposal.status === 'DECLINED' ? 'text-red-500' : 'text-green-500'
                                                    }`}>
                                                        {proposal.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-300 mb-2 leading-tight">
                                                {proposal.description}
                                            </div>
                                            {proposal.decisionReasoning && (
                                                <div className="text-[9px] italic text-axiom-cyan/70 border-t border-white/5 pt-1 mt-1 bg-white/5 p-2 rounded">
                                                    <div className="flex items-center gap-1 mb-1 opacity-50">
                                                        <Brain className="w-2 h-2" />
                                                        <span className="uppercase text-[7px]">Cognitive Analysis</span>
                                                    </div>
                                                    {proposal.decisionReasoning}
                                                </div>
                                            )}
                                            {proposal.costGold && proposal.status === 'PENDING' && (
                                                <div className="flex justify-between items-center mt-2 text-[9px]">
                                                    <span className="text-gray-500">Resource Required:</span>
                                                    <span className="text-axiom-gold font-black">{proposal.costGold} Gold</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Status Bar */}
                    <div className="h-9 border-t border-white/5 flex items-center px-4 bg-black/60 shrink-0">
                        <div className="flex items-center gap-4 w-full">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-axiom-cyan animate-pulse shadow-[0_0_5px_#06b6d4]" />
                                <span className="text-axiom-cyan text-[9px] font-black uppercase tracking-widest">Axiom Feed</span>
                            </div>
                            <div className="flex-1 h-[1px] bg-white/5" />
                            <div className="text-[9px] text-gray-500 font-mono flex gap-3 italic">
                                <span>Entropy: 0.042λ</span>
                                <span className="text-axiom-purple font-bold not-italic">Synchronized</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
