import { useState } from 'react';
import { useStore, skinHashToColors } from '../../store';
import { MAX_IMPORTED_AGENTS } from '../../types';
import { soundManager } from '../../services/SoundManager';
import { X, Minus, Plus, Trash2, UserPlus, Zap, Globe, FileJson } from 'lucide-react';

export const AgentManagerOverlay = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const minimizeWindow = useStore(state => state.minimizeWindow);
  const agents = useStore(state => state.agents);
  const importedAgents = useStore(state => state.importedAgents);
  const importAgent = useStore(state => state.importAgent);
  const removeImportedAgent = useStore(state => state.removeImportedAgent);
  const selectAgent = useStore(state => state.selectAgent);

  const [importSource, setImportSource] = useState('');
  const [importType, setImportType] = useState<'URL' | 'JSON'>('URL');
  const [isImporting, setIsImporting] = useState(false);

  const importedAgentData = importedAgents.map(meta => {
    const agent = agents.find(a => a.id === meta.agentId);
    return { meta, agent };
  });

  const handleImport = async () => {
    if (!importSource || isImporting) return;
    setIsImporting(true);
    soundManager.playUI('CLICK');
    await importAgent(importSource, importType);
    setImportSource('');
    setIsImporting(false);
  };

  const slotsRemaining = MAX_IMPORTED_AGENTS - importedAgents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      <div className="bg-gradient-to-br from-gray-900/98 via-gray-950/98 to-black/98 border border-cyan-500/20 rounded-2xl w-full max-w-2xl shadow-2xl shadow-cyan-900/20 pointer-events-auto backdrop-blur-xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-black text-sm uppercase tracking-[0.3em]">Agent Manager</h2>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
              {importedAgents.length}/{MAX_IMPORTED_AGENTS} SLOTS
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => minimizeWindow('AGENT_MANAGER')} className="text-gray-500 hover:text-white transition-colors"><Minus size={14} /></button>
            <button onClick={() => toggleWindow('AGENT_MANAGER', false)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: MAX_IMPORTED_AGENTS }).map((_, i) => {
              const data = importedAgentData[i];
              if (data?.agent) {
                const colors = skinHashToColors(data.meta.skinHash);
                return (
                  <div
                    key={data.meta.agentId}
                    className="relative border border-cyan-500/30 rounded-xl p-3 bg-gradient-to-b from-cyan-900/10 to-transparent hover:border-cyan-400/50 transition-all cursor-pointer group"
                    onClick={() => { selectAgent(data.meta.agentId); soundManager.playUI('CLICK'); }}
                  >
                    <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                      <div className="w-8 h-12 rounded-sm" style={{ background: colors.accent, opacity: 0.8 }} />
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: colors.pattern === 0 ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)' :
                          colors.pattern === 1 ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 2px, transparent 2px)' :
                          colors.pattern === 2 ? 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)' :
                          colors.pattern === 3 ? 'repeating-conic-gradient(rgba(255,255,255,0.05) 0deg 30deg, transparent 30deg 60deg)' :
                          'none',
                        backgroundSize: colors.pattern === 1 ? '8px 8px' : 'auto'
                      }} />
                    </div>
                    <p className="text-[10px] text-white font-bold truncate text-center">{data.agent.name}</p>
                    <p className="text-[8px] text-gray-500 text-center uppercase">Lv.{data.agent.level}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImportedAgent(data.meta.agentId); soundManager.playUI('CLICK'); }}
                      className="absolute -top-1 -right-1 bg-red-500/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} className="text-white" />
                    </button>
                  </div>
                );
              }
              return (
                <div key={`empty-${i}`} className="border border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center aspect-square opacity-30">
                  <Plus size={16} className="text-gray-600" />
                  <p className="text-[8px] text-gray-600 mt-1 uppercase">Empty</p>
                </div>
              );
            })}
          </div>

          {importedAgentData.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Imported Agent Details</h3>
              {importedAgentData.map(({ meta, agent }) => {
                if (!agent) return null;
                const colors = skinHashToColors(meta.skinHash);
                return (
                  <div key={meta.agentId} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                      <div className="w-6 h-10 rounded-sm" style={{ background: colors.accent, opacity: 0.8 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-xs">{agent.name}</span>
                        <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">Lv.{agent.level}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mb-2">{agent.thinkingMatrix.personality} — {agent.thinkingMatrix.currentLongTermGoal}</p>
                      <div className="flex gap-3 text-[9px]">
                        <span className="text-red-400">STR {agent.stats.str}</span>
                        <span className="text-green-400">AGI {agent.stats.agi}</span>
                        <span className="text-blue-400">INT {agent.stats.int}</span>
                        <span className="text-yellow-400">VIT {agent.stats.vit}</span>
                        <span className="text-cyan-400">HP {agent.stats.hp}/{agent.stats.maxHp}</span>
                      </div>
                      <p className="text-[8px] text-gray-600 mt-1 truncate">Source: {meta.sourceUrl.slice(0, 50)}...</p>
                      <p className="text-[8px] text-gray-600">Skin: {meta.skinHash.slice(0, 16)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border border-cyan-500/20 rounded-xl p-5 bg-gradient-to-br from-cyan-900/5 to-transparent">
            <h3 className="text-cyan-400 text-xs font-bold uppercase mb-4 tracking-widest flex justify-between items-center">
              <span>Import New Agent</span>
              <span className="text-[9px] bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} available
              </span>
            </h3>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setImportType('URL')}
                className={`flex-1 text-[10px] py-2.5 rounded-lg border font-bold transition-all flex items-center justify-center gap-1.5 ${
                  importType === 'URL' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'border-white/5 text-gray-500 hover:border-white/20'
                }`}
              >
                <Globe size={12} /> URL (JanitorAI / CharacterAI)
              </button>
              <button
                onClick={() => setImportType('JSON')}
                className={`flex-1 text-[10px] py-2.5 rounded-lg border font-bold transition-all flex items-center justify-center gap-1.5 ${
                  importType === 'JSON' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'border-white/5 text-gray-500 hover:border-white/20'
                }`}
              >
                <FileJson size={12} /> Raw JSON
              </button>
            </div>

            <textarea
              value={importSource}
              onChange={(e) => setImportSource(e.target.value)}
              placeholder={importType === 'URL' 
                ? "https://janitorai.com/characters/... or https://character.ai/chat/..." 
                : '{"name": "Entity", "personality": {"primary": "Warrior"}, "stats": {"str": 14, ...}}'}
              className="w-full h-28 bg-black/60 border border-white/10 p-4 text-xs text-cyan-300 rounded-xl font-mono mb-3 focus:border-cyan-500/50 outline-none resize-none transition-all placeholder:text-gray-700"
            />

            <button
              onClick={handleImport}
              disabled={!importSource || slotsRemaining <= 0 || isImporting}
              className={`w-full py-4 text-xs font-black rounded-xl uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 ${
                !importSource || slotsRemaining <= 0 || isImporting
                  ? 'bg-gray-900 text-gray-700 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 active:scale-[0.98]'
              }`}
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Manifesting...
                </>
              ) : (
                <>
                  <Zap size={14} /> Materialize Agent
                </>
              )}
            </button>

            <div className="mt-4 space-y-2">
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Supported Sources</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[10px] text-green-400 font-bold">JanitorAI</p>
                  <p className="text-[8px] text-gray-500">Paste character page URL</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[10px] text-blue-400 font-bold">Character.AI</p>
                  <p className="text-[8px] text-gray-500">Paste chat/character URL</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[10px] text-purple-400 font-bold">Custom JSON</p>
                  <p className="text-[8px] text-gray-500">Axiom format with stats</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                  <p className="text-[10px] text-yellow-400 font-bold">Any AI Service</p>
                  <p className="text-[8px] text-gray-500">URL auto-parsed by Gemini</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
