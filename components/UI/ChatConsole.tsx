
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ChatChannel, ChatMessage } from '../../types';
import { Brain, MessageSquare, Shield, Zap, Info, Globe, ChevronUp, ChevronDown, Sparkles, Languages } from 'lucide-react';

export const ChatConsole = () => {
    const messages = useStore(state => state.chatMessages);
    const agents = useStore(state => state.agents);
    const isMobile = useStore(state => state.device.isMobile);
    const [activeTab, setActiveTab] = useState<ChatChannel | 'ALL' | 'THOUGHT'>('ALL');
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isExpanded, activeTab]);

    const filteredMessages = activeTab === 'ALL' ? messages : messages.filter(m => m.channel === activeTab);

    const isGerman = (text: string) => /der|die|das|und|ist|ich|nicht|beutel|bündnis|uns|wir/i.test(text);

    return (
        <div className={`relative pointer-events-auto shadow-2xl z-30 font-sans transition-all duration-500 ${isMobile ? 'w-full max-w-sm' : 'w-[580px]'} ${isExpanded ? 'h-80 bg-axiom-dark/95' : 'h-10 bg-axiom-dark/70'} border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl overflow-hidden`}>
            <div className="flex justify-between items-center border-b border-white/5 bg-black/40 px-2 h-10 shrink-0">
                <div className="flex overflow-x-auto scrollbar-hide gap-1">
                    {['ALL', 'LOCAL', 'THOUGHT', 'SYSTEM'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-1.5 ${activeTab === tab ? 'bg-axiom-cyan/20 text-axiom-cyan' : 'text-gray-500'}`}>
                            {String(tab)}
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 p-2">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
            </div>
            {isExpanded && (
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {filteredMessages.map((msg) => {
                        const isCognition = msg.channel === 'THOUGHT';
                        const agent = agents.find(a => a.id === msg.senderId);
                        return (
                            <div key={msg.id} className={`flex flex-col p-2 rounded-xl border ${isCognition ? 'bg-axiom-cyan/5 border-axiom-cyan/20' : 'bg-white/5 border-transparent'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black uppercase text-gray-500">{String(msg.senderName)}</span>
                                    <div className="flex-1" />
                                    <span className="text-[7px] font-bold text-gray-700 uppercase">{isGerman(String(msg.content)) ? 'DE' : 'EN'}</span>
                                </div>
                                <div className={`text-[11px] leading-relaxed ${isCognition ? 'text-cyan-100 italic' : 'text-gray-300'}`}>
                                    <span>{String(msg.content || "")}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
