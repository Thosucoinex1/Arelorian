
import { useStore } from '../../store';
import { X, ScrollText, MapPin, ShieldAlert, Zap, CheckCircle2, Minus } from 'lucide-react';

export const QuestBoardOverlay = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const minimizeWindow = useStore(state => state.minimizeWindow);
  const quests = useStore(state => state.quests);
  const acceptQuest = useStore(state => state.acceptQuest);
  const agents = useStore(state => state.agents);
  const currentUserAgent = agents.find(a => a.faction === 'PLAYER');

  if (false) return null; // Logic handled by GameUI

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => toggleWindow('QUESTS', false)} />
      
      <div className="w-full max-w-4xl bg-axiom-dark/95 border border-axiom-purple/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-axiom-purple/20 to-transparent p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-axiom-purple/10 rounded-lg border border-axiom-purple/30">
              <ScrollText className="w-6 h-6 text-axiom-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-black text-white tracking-widest uppercase">Axiomatic Quest Board</h2>
              <p className="text-[10px] text-axiom-purple font-mono tracking-widest uppercase opacity-60">Logic Stabilization: Active Tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => minimizeWindow('QUESTS')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Minimize"
            >
              <Minus size={20} />
            </button>
            <button 
              onClick={() => toggleWindow('QUESTS', false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {quests.map((quest) => (
            <div key={quest.id} className={`bg-white/5 border rounded-xl p-5 transition-all ${quest.status === 'COMPLETED' ? 'border-green-500/30 opacity-60' : quest.status === 'ACTIVE' ? 'border-axiom-cyan/40' : 'border-white/10 hover:border-axiom-purple/40'}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-white">{quest.title}</h3>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${quest.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : quest.status === 'ACTIVE' ? 'bg-axiom-cyan/20 text-axiom-cyan' : 'bg-axiom-purple/20 text-axiom-purple'}`}>
                  {quest.status}
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-4 leading-relaxed">{quest.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
                  <MapPin size={12} className="text-axiom-purple" />
                  <span>Target: {quest.targetChunkId || 'Global'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
                  <ShieldAlert size={12} className="text-axiom-purple" />
                  <span>Type: {quest.type.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-3">
                  <div className="flex items-center gap-1">
                    <Zap size={12} className="text-axiom-gold" />
                    <span className="text-xs text-white font-mono">{quest.rewardGold}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-axiom-cyan" />
                    <span className="text-xs text-white font-mono">+{quest.rewardInsight} Insight</span>
                  </div>
                </div>

                {quest.status === 'AVAILABLE' && currentUserAgent && (
                  <button 
                    onClick={() => acceptQuest(quest.id, currentUserAgent.id)}
                    className="bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 text-axiom-purple px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Accept Task
                  </button>
                )}
              </div>
            </div>
          ))}

          {quests.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <ScrollText className="w-12 h-12 text-gray-800 mx-auto mb-4" />
              <p className="text-gray-600 font-mono uppercase tracking-widest text-sm">The Matrix is stable. No quests available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-axiom-purple animate-pulse" />
            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Logic Field Synchronized</span>
          </div>
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
            Active Quests: {quests.filter(q => q.status === 'ACTIVE').length}
          </div>
        </div>
      </div>
    </div>
  );
};
