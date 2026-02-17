import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ChatChannel } from '../../types';

export const ChatConsole = () => {
    const messages = useStore(state => state.chatMessages);
    const [activeTab, setActiveTab] = useState<ChatChannel | 'ALL'>('ALL');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-black/80 border border-white/20 rounded-lg flex flex-col pointer-events-auto shadow-2xl z-30 font-sans">
            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/40 rounded-t-lg">
                {['ALL', 'GLOBAL', 'LOCAL', 'COMBAT', 'SYSTEM'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${activeTab === tab ? 'bg-white/10 text-axiom-cyan' : 'text-gray-500 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Log Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {filteredMessages.length === 0 && (
                    <div className="text-gray-600 text-xs italic text-center mt-4">No messages in this channel.</div>
                )}
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className="text-xs break-words leading-tight hover:bg-white/5 p-0.5 rounded">
                        <span className="text-gray-500 mr-2">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                        {msg.channel !== 'SYSTEM' && (
                            <span className="font-bold text-gray-300 mr-1 cursor-pointer hover:underline">
                                [{msg.senderName}]:
                            </span>
                        )}
                        <span className={`${getChannelColor(msg.channel)}`}>
                            {msg.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input Placeholder */}
            <div className="h-8 border-t border-white/10 flex items-center px-2 bg-black/60">
                <span className="text-axiom-cyan text-xs font-bold mr-2">[SAY]:</span>
                <input 
                    disabled 
                    placeholder="Chat module strictly autonomous. Observer Mode active." 
                    className="bg-transparent border-none outline-none text-xs text-gray-500 w-full italic"
                />
            </div>
        </div>
    );
};