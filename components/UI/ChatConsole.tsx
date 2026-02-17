
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ChatChannel } from '../../types';

export const ChatConsole = () => {
    const messages = useStore(state => state.chatMessages);
    const isMobile = useStore(state => state.device.isMobile);
    const [activeTab, setActiveTab] = useState<ChatChannel | 'ALL'>('ALL');
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    const filteredMessages = activeTab === 'ALL' 
        ? messages 
        : messages.filter(m => m.channel === activeTab);

    const getChannelColor = (channel: ChatChannel) => {
        switch(channel) {
            case 'GLOBAL': return 'text-red-400';
            case 'LOCAL': return 'text-white';
            case 'COMBAT': return 'text-yellow-500';
            case 'GUILD': return 'text-green-400';
            case 'SYSTEM': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className={`
            relative pointer-events-auto shadow-2xl z-30 font-sans transition-all duration-300
            ${isMobile ? 'w-full max-w-sm' : 'w-[600px]'}
            ${isExpanded ? 'h-40 md:h-48 bg-black/80' : 'h-8 bg-black/60'}
            border border-white/20 rounded-lg flex flex-col
        `}>
            {/* Tabs / Header */}
            <div className="flex justify-between items-center border-b border-white/10 bg-black/40 rounded-t-lg pr-2">
                <div className="flex overflow-x-auto scrollbar-hide">
                    {['ALL', 'GLOBAL', 'LOCAL', 'COMBAT', 'SYSTEM'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); setIsExpanded(true); }}
                            className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white/10 text-axiom-cyan' : 'text-gray-500 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 text-xs px-2">
                    {isExpanded ? '▼' : '▲'}
                </button>
            </div>

            {/* Log Area */}
            {isExpanded && (
                <>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 touch-scroll">
                        {filteredMessages.length === 0 && (
                            <div className="text-gray-600 text-xs italic text-center mt-4">No messages in this channel.</div>
                        )}
                        {filteredMessages.map((msg) => (
                            <div key={msg.id} className="text-xs break-words leading-tight hover:bg-white/5 p-0.5 rounded">
                                <span className="text-gray-500 mr-2 text-[10px] md:text-xs">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                                {msg.channel !== 'SYSTEM' && (
                                    <span className="font-bold text-gray-300 mr-1 cursor-pointer hover:underline text-[10px] md:text-xs">
                                        [{msg.senderName}]:
                                    </span>
                                )}
                                <span className={`${getChannelColor(msg.channel)} text-[10px] md:text-xs`}>
                                    {msg.message}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Input Placeholder */}
                    <div className="h-8 border-t border-white/10 flex items-center px-2 bg-black/60 flex-shrink-0">
                        <span className="text-axiom-cyan text-xs font-bold mr-2">[SAY]:</span>
                        <input 
                            disabled 
                            placeholder="Chat module strictly autonomous. Observer Mode active." 
                            className="bg-transparent border-none outline-none text-xs text-gray-500 w-full italic"
                        />
                    </div>
                </>
            )}
        </div>
    );
};