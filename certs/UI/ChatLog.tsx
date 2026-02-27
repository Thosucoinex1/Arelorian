import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { Send, Minus, X } from 'lucide-react';
import { ChatChannel } from '../../types';

const getChannelColor = (channel: ChatChannel) => {
  switch (channel) {
    case 'THOUGHT':
      return 'text-gray-500 italic';
    case 'LOCAL':
      return 'text-white';
    case 'GLOBAL':
      return 'text-yellow-400';
    case 'SYSTEM':
      return 'text-purple-400';
    default:
      return 'text-gray-300';
  }
};

export const ChatLog = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const minimizeWindow = useStore(state => state.minimizeWindow);
  const chatMessages = useStore(state => state.chatMessages);
  const addChatMessage = useStore(state => state.addChatMessage);
  const selectedAgent = useStore(state => state.agents.find(a => a.id === state.selectedAgentId));
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = () => {
    if (input.trim() && selectedAgent) {
      addChatMessage(input, 'LOCAL', selectedAgent.id, selectedAgent.name);
      setInput('');
    }
  };

  return (
    <div className="fixed bottom-24 left-8 w-[450px] h-[300px] bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col pointer-events-auto font-sans text-xs shadow-lg overflow-hidden">
      <div className="bg-white/5 p-2 flex justify-between items-center border-b border-white/10">
        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-2">Matrix Chat</span>
        <div className="flex gap-1">
          <button 
            onClick={() => minimizeWindow('CHAT')} 
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={() => toggleWindow('CHAT', false)} 
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-2 ${getChannelColor(msg.channel)}`}>
            <span className="font-bold flex-shrink-0">{msg.senderName}:</span>
            <p className="break-words">{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={selectedAgent ? 'Say something...' : 'Select an agent to speak'}
            disabled={!selectedAgent}
            className="w-full bg-white/5 px-3 py-2 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-axiom-cyan transition"
          />
          <button onClick={handleSend} disabled={!selectedAgent || !input.trim()} className="bg-axiom-cyan text-black p-2 rounded-lg disabled:bg-gray-600">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
