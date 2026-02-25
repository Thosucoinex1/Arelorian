import { useStore } from '../../store';
import { Brain, Zap, History, TrendingUp, X, Activity } from 'lucide-react';

export const EmergentBehaviorMonitor = () => {
  const agents = useStore(state => state.agents);
  const showDebugger = useStore(state => state.showDebugger);
  const toggleDebugger = useStore(state => state.toggleDebugger);

  if (!showDebugger) return null;

  return (
    <div className="fixed top-24 right-8 w-96 max-h-[70vh] z-[60] pointer-events-auto">
      <div className="bg-[#050505]/90 border border-axiom-cyan/30 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/10 bg-axiom-cyan/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-axiom-cyan" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Emergent Behavior Monitor</h3>
          </div>
          <button onClick={() => toggleDebugger(false)} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {agents.map(agent => (
            <div key={agent.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-axiom-cyan rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase">{agent.name}</span>
                </div>
                <span className="text-[8px] font-mono text-axiom-cyan/60">LVL {agent.level}</span>
              </div>

              {/* Economic Desires */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-axiom-gold" />
                    <span className="text-[7px] text-gray-500 uppercase font-black">Greed / Risk</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-axiom-gold" 
                        style={{ width: `${(agent.economicDesires?.greedLevel || 0) * 100}%` }} 
                      />
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-axiom-cyan" 
                        style={{ width: `${(agent.economicDesires?.riskAppetite || 0) * 100}%` }} 
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="w-3 h-3 text-axiom-cyan" />
                    <span className="text-[7px] text-gray-500 uppercase font-black">Role / Frugality</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-white truncate">{agent.economicDesires?.marketRole}</span>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-axiom-purple" 
                        style={{ width: `${(agent.economicDesires?.frugality || 0) * 100}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergent Log */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                  <History className="w-3 h-3" /> Recent Emergence
                </div>
                <div className="space-y-2">
                  {agent.emergentBehaviorLog?.length === 0 ? (
                    <div className="text-[9px] text-gray-600 italic p-2 border border-dashed border-white/5 rounded-xl">
                      Awaiting neural spark...
                    </div>
                  ) : (
                    agent.emergentBehaviorLog?.slice(0, 3).map((log, i) => (
                      <div key={i} className="bg-axiom-cyan/5 border border-axiom-cyan/10 p-3 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-axiom-cyan uppercase">{log.action}</span>
                          <span className="text-[7px] font-mono text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[9px] text-gray-400 leading-tight italic">"{log.reasoning}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="h-px bg-white/5 w-full" />
            </div>
          ))}
        </div>

        <div className="p-4 bg-black/40 border-t border-white/10">
          <div className="flex items-center gap-2 text-[8px] text-gray-500 font-mono uppercase">
            <Activity className="w-3 h-3 animate-pulse text-emerald-500" />
            Matrix Stability: 99.9% | Heuristic Load: Low
          </div>
        </div>
      </div>
    </div>
  );
};
