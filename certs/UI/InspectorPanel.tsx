import React from 'react';
import { useStore } from '../../store';
import { X } from 'lucide-react';

export const InspectorPanel = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const selectedChunkId = useStore(state => state.selectedChunkId);
  const chunks = useStore(state => state.loadedChunks);
  const selectAgent = useStore(state => state.selectAgent);
  const setSelectedChunk = useStore(state => state.setSelectedChunk);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedChunk = chunks.find(c => c.id === selectedChunkId);
  const selectedMonsterId = useStore(state => state.selectedMonsterId);
  const monsters = useStore(state => state.monsters);
  const selectedMonster = monsters.find(m => m.id === selectedMonsterId);
  const selectedPoiId = useStore(state => state.selectedPoiId);
  const pois = useStore(state => state.pois);
  const selectedPoi = pois.find(p => p.id === selectedPoiId);

  const { isMobile, orientation, height: screenHeight } = useStore(state => state.device);
  const isLandscapeMobile = isMobile && orientation === 'landscape';

  const handleClose = () => {
    selectAgent(null);
    setSelectedChunk(null);
    useStore.getState().selectMonster(null);
    useStore.getState().selectPoi(null);
  };

  if (!selectedAgent && !selectedChunk && !selectedMonster && !selectedPoi) {
    return null;
  }

  const panelWidth = isMobile ? (isLandscapeMobile ? 'w-72' : 'w-full max-w-sm') : 'w-80';
  const panelPosition = isMobile 
    ? (isLandscapeMobile ? 'top-4 right-4 translate-y-0' : 'bottom-4 left-1/2 -translate-x-1/2 translate-y-0') 
    : 'top-1/2 right-8 -translate-y-1/2';
  const panelMaxHeight = isMobile ? (isLandscapeMobile ? screenHeight - 32 : 400) : 'none';

  return (
    <div 
      className={`fixed ${panelPosition} z-50 bg-axiom-dark/90 backdrop-blur-md p-6 rounded-2xl border border-axiom-cyan/30 shadow-2xl ${panelWidth} animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto custom-scrollbar`}
      style={{ maxHeight: panelMaxHeight !== 'none' ? `${panelMaxHeight}px` : 'none' }}
    >
      <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
        <X size={20} />
      </button>
      {selectedAgent && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Agent Details</h3>
            <p className="text-[10px] text-axiom-cyan font-mono uppercase tracking-widest mb-4">ID: {selectedAgent.id.slice(0, 8)}...</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Name</p>
              <p className="text-sm text-white font-medium">{selectedAgent.name}</p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">State</p>
              <p className="text-sm text-axiom-purple font-bold">{selectedAgent.state}</p>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded border border-white/10">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 tracking-tighter">Core Stats</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[8px] text-gray-500 uppercase">STR</p>
                <p className="text-xs text-white font-mono">{selectedAgent.stats.str}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase">AGI</p>
                <p className="text-xs text-white font-mono">{selectedAgent.stats.agi}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase">INT</p>
                <p className="text-xs text-white font-mono">{selectedAgent.stats.int}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase">VIT</p>
                <p className="text-xs text-white font-mono">{selectedAgent.stats.vit}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[8px] text-gray-500 uppercase">HP</p>
                <p className="text-xs text-green-400 font-mono">{selectedAgent.stats.hp} / {selectedAgent.stats.maxHp}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded border border-white/10">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 tracking-tighter">Recent Memories</p>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {selectedAgent.memoryCache.slice(-5).reverse().map((memory, i) => (
                <p key={i} className="text-[9px] text-gray-300 leading-tight border-l border-axiom-cyan/30 pl-2 py-1 bg-white/5">
                  {memory}
                </p>
              ))}
              {selectedAgent.memoryCache.length === 0 && (
                <p className="text-[9px] text-gray-600 italic">No memories recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedChunk && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">Chunk Details</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-400 flex justify-between"><span>ID:</span> <span className="text-white font-mono">{selectedChunk.id}</span></p>
            <p className="text-sm text-gray-400 flex justify-between"><span>Biome:</span> <span className="text-white">{selectedChunk.biome}</span></p>
            <p className="text-sm text-gray-400 flex justify-between"><span>Stability:</span> <span className="text-green-400 font-mono">{(selectedChunk.stabilityIndex * 100).toFixed(0)}%</span></p>
            <p className="text-sm text-gray-400 flex justify-between"><span>Corruption:</span> <span className="text-red-400 font-mono">{(selectedChunk.corruptionLevel * 100).toFixed(0)}%</span></p>
          </div>
        </div>
      )}
      {selectedMonster && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">Monster Details</h3>
          <div className="space-y-3">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Name</p>
              <p className="text-sm text-white font-medium">{selectedMonster.name}</p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Status</p>
              <p className={`text-sm font-bold ${selectedMonster.state === 'COMBAT' ? 'text-red-500 animate-pulse' : 'text-axiom-cyan'}`}>
                {selectedMonster.state}
              </p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Vitality</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-green-400 font-mono">{selectedMonster.stats.hp} / {selectedMonster.stats.maxHp}</p>
                <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${(selectedMonster.stats.hp / selectedMonster.stats.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedPoi && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">Point of Interest</h3>
          <div className="space-y-3">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Type</p>
              <p className="text-sm text-axiom-gold font-bold uppercase tracking-widest">{selectedPoi.type}</p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Discovery Status</p>
              <p className={`text-sm font-bold ${selectedPoi.isDiscovered ? 'text-green-400' : 'text-gray-500'}`}>
                {selectedPoi.isDiscovered ? 'DISCOVERED' : 'UNDISCOVERED'}
              </p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <p className="text-[8px] text-gray-500 uppercase font-bold">Threat Level</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-bold ${selectedPoi.threatLevel > 7 ? 'text-red-500' : selectedPoi.threatLevel > 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {selectedPoi.threatLevel.toFixed(1)}
                </span>
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${selectedPoi.threatLevel > 7 ? 'bg-red-500' : selectedPoi.threatLevel > 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${(selectedPoi.threatLevel / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
