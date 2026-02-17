
import React from 'react';
import { useStore } from '../../store';

export const WorldMap = () => {
    const { showMap, toggleMap, loadedChunks, agents } = useStore();

    if (!showMap) return null;

    // Map bounds calculation (simplified center)
    const mapSize = 400; // px
    const scale = 2; // px per unit

    return (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center" onClick={() => toggleMap(false)}>
            <div className="relative bg-[#050505] border-2 border-axiom-gold rounded-lg p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-axiom-gold font-serif text-center mb-4 text-xl">WORLD PROJECTION</h2>
                
                <div 
                    className="relative bg-[#0a0a0f] overflow-hidden border border-white/10"
                    style={{ width: mapSize, height: mapSize }}
                >
                    {/* Render Chunks */}
                    {loadedChunks.map(chunk => (
                        <div 
                            key={chunk.id}
                            className="absolute border border-white/5 bg-green-900/20"
                            style={{
                                width: 80 * scale, // 80 units size
                                height: 80 * scale,
                                left: (mapSize / 2) + (chunk.x * 80 * scale) - (40 * scale), // Center offset
                                top: (mapSize / 2) + (chunk.z * 80 * scale) - (40 * scale),
                            }}
                        >
                            {chunk.biome === 'CITY' && (
                                <div className="w-full h-full bg-axiom-purple/30 flex items-center justify-center text-[8px] text-white font-bold">SANCTUARY</div>
                            )}
                        </div>
                    ))}

                    {/* Render Agents */}
                    {agents.map(agent => (
                        <div
                            key={agent.id}
                            className={`absolute w-2 h-2 rounded-full ${agent.classType.startsWith('NPC') ? 'bg-yellow-400' : 'bg-red-500'} border border-black`}
                            style={{
                                left: (mapSize / 2) + (agent.position[0] * scale),
                                top: (mapSize / 2) + (agent.position[2] * scale),
                                transform: 'translate(-50%, -50%)'
                            }}
                        />
                    ))}

                    {/* Crosshair Center */}
                    <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                    Click anywhere outside to close
                </div>
            </div>
        </div>
    );
};
