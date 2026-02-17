
import React from 'react';
import { useStore } from '../../store';

export const CharacterSheet = () => {
  const { selectedAgentId, agents, showCharacterSheet, toggleCharacterSheet } = useStore();
  const agent = agents.find(a => a.id === selectedAgentId);

  if (!showCharacterSheet || !agent) return null;

  return (
    <div className="w-[90vw] md:w-[600px] h-[80vh] bg-axiom-dark border border-axiom-purple/50 rounded-lg shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
      <div className="p-4 bg-axiom-purple/20 border-b border-axiom-purple/30 flex justify-between items-center">
        <h2 className="text-xl font-serif text-white tracking-widest">{agent.name}'s Awareness</h2>
        <button onClick={() => toggleCharacterSheet(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 touch-scroll">
        {/* Memory Fragments */}
        <section>
          <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-3 tracking-widest">Memory fragments</h3>
          <div className="space-y-2">
            {agent.memoryCache.length === 0 ? (
              <p className="text-gray-600 text-xs italic">Tabula rasa. No memories found.</p>
            ) : (
              agent.memoryCache.map(m => (
                <div key={m.id} className="bg-white/5 p-2 rounded border-l-2 border-axiom-cyan text-[10px] text-gray-300">
                  <span className="text-gray-500 mr-2">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  {m.description}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Skills & Evolution */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 p-3 rounded border border-white/5">
             <h4 className="text-axiom-gold text-[10px] font-bold uppercase mb-2">Professions</h4>
             <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Mining</span> <span className="text-white">{agent.skills.mining}</span></div>
                <div className="flex justify-between"><span>Woodcutting</span> <span className="text-white">{agent.skills.woodcutting}</span></div>
                <div className="flex justify-between"><span>Crafting</span> <span className="text-white">{agent.skills.crafting}</span></div>
             </div>
          </div>
          <div className="bg-black/40 p-3 rounded border border-white/5">
             <h4 className="text-axiom-purple text-[10px] font-bold uppercase mb-2">Social Rank</h4>
             <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Negotiation</span> <span className="text-white">{agent.skills.negotiation}</span></div>
                <div className="flex justify-between"><span>Alignment</span> <span className="text-white">{agent.thinkingMatrix.alignment}</span></div>
             </div>
          </div>
        </section>

        {/* Internal Monologue */}
        <section className="bg-axiom-purple/5 p-4 rounded-lg border border-axiom-purple/20 italic text-sm text-gray-400">
          <h4 className="text-[10px] text-axiom-purple not-italic font-bold mb-2 uppercase">Neural Monologue</h4>
          "{agent.loreSnippet || "The consciousness is still forming..."}"
        </section>
      </div>
    </div>
  );
};
