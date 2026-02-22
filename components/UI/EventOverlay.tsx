
import React from 'react';
import { useStore } from '../../store';
import { AlertTriangle, Zap, Activity, Info } from 'lucide-react';

export const EventOverlay = () => {
  const activeEvents = useStore(state => state.activeEvents);

  if (activeEvents.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none w-full max-w-md px-4">
      {activeEvents.map((event) => (
        <div 
          key={event.id}
          className={`bg-black/80 backdrop-blur-md border rounded-xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-500 ${
            event.type === 'AXIOM_STORM' ? 'border-red-500/50 shadow-red-500/10' : 
            event.type === 'MATRIX_GLITCH' ? 'border-axiom-purple/50 shadow-axiom-purple/10' : 
            'border-axiom-cyan/50 shadow-axiom-cyan/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              event.type === 'AXIOM_STORM' ? 'bg-red-500/20 text-red-500' : 
              event.type === 'MATRIX_GLITCH' ? 'bg-axiom-purple/20 text-axiom-purple' : 
              'bg-axiom-cyan/20 text-axiom-cyan'
            }`}>
              {event.type === 'AXIOM_STORM' ? <AlertTriangle size={20} /> : 
               event.type === 'MATRIX_GLITCH' ? <Zap size={20} /> : 
               <Activity size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">{event.type.replace('_', ' ')}</h4>
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                   <span className="text-[8px] font-mono text-red-500 uppercase">Active</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-tight">{event.description}</p>
            </div>
          </div>
          
          <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                event.type === 'AXIOM_STORM' ? 'bg-red-500' : 
                event.type === 'MATRIX_GLITCH' ? 'bg-axiom-purple' : 
                'bg-axiom-cyan'
              }`}
              style={{ width: `${Math.max(0, 100 - ((Date.now() - event.startTime) / event.duration) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
