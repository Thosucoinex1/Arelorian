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

  const handleClose = () => {
    selectAgent(null);
    setSelectedChunk(null);
  };

  if (!selectedAgent && !selectedChunk) {
    return null;
  }

  return (
    <div className="fixed top-1/2 right-8 -translate-y-1/2 z-50 bg-axiom-dark/80 backdrop-blur-md p-6 rounded-lg border border-axiom-cyan/30 shadow-lg w-80 animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
        <X size={20} />
      </button>
      {selectedAgent && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Agent Details</h3>
          <p className="text-sm text-gray-400">ID: {selectedAgent.id}</p>
          <p className="text-sm text-gray-400">Name: {selectedAgent.name}</p>
          <p className="text-sm text-gray-400">Faction: {selectedAgent.faction}</p>
          <p className="text-sm text-gray-400">State: {selectedAgent.state}</p>
        </div>
      )}
      {selectedChunk && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Chunk Details</h3>
          <p className="text-sm text-gray-400">ID: {selectedChunk.id}</p>
          <p className="text-sm text-gray-400">Biome: {selectedChunk.biome}</p>
          <p className="text-sm text-gray-400">Stability: {selectedChunk.stabilityIndex.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Corruption: {selectedChunk.corruptionLevel.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};
