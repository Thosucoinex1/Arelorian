
import React, { useState } from 'react';
import { useStore } from '../../store';
import { Minus, X, Info } from 'lucide-react';
import { Chunk } from '../../types';

export const WorldMap = () => {
    const toggleWindow = useStore(state => state.toggleWindow);
    const minimizeWindow = useStore(state => state.minimizeWindow);
    const loadedChunks = useStore(state => state.loadedChunks);
    const agents = useStore(state => state.agents);
    const showAxiomaticOverlay = useStore(state => state.emergenceSettings.showAxiomaticOverlay);
    const device = useStore(state => state.device);

    const [hoveredChunk, setHoveredChunk] = useState<Chunk | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent, chunk: Chunk) => {
        if (device.isMobile || device.isTablet) return;
        setHoveredChunk(chunk);
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const handleChunkClick = (e: React.MouseEvent | React.TouchEvent, chunk: Chunk) => {
        if (!device.isMobile && !device.isTablet) return;
        e.stopPropagation();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        if (hoveredChunk?.id === chunk.id) {
            setHoveredChunk(null);
        } else {
            setHoveredChunk(chunk);
            setTooltipPos({ x: clientX, y: clientY });
        }
    };

    const mapSize = device.isTablet ? 600 : 400; // Larger map for tablets
    const scale = device.isTablet ? 3 : 2; // Larger scale for tablets

    return (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center overflow-auto" onClick={() => toggleWindow('MAP', false)}>
            <div className="relative bg-[#050505] border-2 border-axiom-gold rounded-lg p-4 shadow-2xl my-8" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div className="w-10" /> {/* Spacer */}
                    <h2 className="text-axiom-gold font-serif text-center text-xl uppercase tracking-widest">World Projection</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => minimizeWindow('MAP')} 
                            className="text-gray-500 hover:text-white transition-colors p-1"
                            title="Minimize"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => toggleWindow('MAP', false)} 
                            className="text-gray-500 hover:text-white transition-colors p-1"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div 
                    className="relative bg-[#0a0a0f] overflow-hidden border border-white/10 cursor-crosshair"
                    style={{ width: mapSize, height: mapSize }}
                >
                    {loadedChunks.map(chunk => (
                        <div 
                            key={chunk.id}
                            className={`absolute border border-white/5 bg-green-900/20 transition-colors ${hoveredChunk?.id === chunk.id ? 'bg-axiom-cyan/20 border-axiom-cyan/40 z-10' : ''}`}
                            style={{
                                width: 80 * scale,
                                height: 80 * scale,
                                left: (mapSize / 2) + (chunk.x * 80 * scale) - (40 * scale),
                                top: (mapSize / 2) + (chunk.z * 80 * scale) - (40 * scale),
                            }}
                            onMouseMove={(e) => handleMouseMove(e, chunk)}
                            onMouseEnter={() => !device.isMobile && !device.isTablet && setHoveredChunk(chunk)}
                            onMouseLeave={() => !device.isMobile && !device.isTablet && setHoveredChunk(null)}
                            onClick={(e) => handleChunkClick(e, chunk)}
                            onTouchStart={(e) => handleChunkClick(e, chunk)}
                        >
                            {chunk.biome === 'CITY' && (
                                <div className="w-full h-full bg-axiom-purple/30 flex items-center justify-center text-[8px] text-white font-bold">SANCTUARY</div>
                            )}
                            
                            {showAxiomaticOverlay && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="text-[6px] text-axiom-cyan font-mono bg-black/60 px-1 mb-1">{chunk.logicString}</div>
                                    <div className="grid grid-cols-4 gap-0.5 opacity-40">
                                        {chunk.logicField?.slice(0, 4).map((row, i) => 
                                            row.slice(0, 4).map((force, j) => {
                                                const angle = Math.atan2(force.vz, force.vx) * (180 / Math.PI);
                                                return (
                                                    <div key={`mf-${i}-${j}`} className="w-1.5 h-1.5 flex items-center justify-center">
                                                        <div 
                                                            className="w-full h-[0.5px] bg-axiom-cyan origin-center"
                                                            style={{ transform: `rotate(${angle}deg)` }}
                                                        />
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {agents.map(agent => {
                        const agentColor = agent.faction === 'PLAYER' 
                            ? 'bg-axiom-cyan' 
                            : agent.faction === 'CREATURE' 
                                ? 'bg-red-500' 
                                : 'bg-soul-fire';

                        return (
                            <div
                                key={agent.id}
                                className={`absolute w-2 h-2 rounded-full ${agentColor} border border-black`}
                                style={{
                                    left: (mapSize / 2) + (agent.position[0] * scale),
                                    top: (mapSize / 2) + (agent.position[2] * scale),
                                    transform: 'translate(-50%, -50%)'
                                }}
                                title={`${String(agent.name)} (${String(agent.faction)})`}
                            />
                        );
                    })}

                    <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                    {device.isMobile || device.isTablet ? 'Tap a sector for details • Tap outside to close' : 'Hover for sector details • Click outside to close'}
                </div>

                {/* Tooltip */}
                {hoveredChunk && (
                    <div 
                        className="fixed z-[100] pointer-events-none"
                        style={{ 
                            left: tooltipPos.x, 
                            top: tooltipPos.y,
                            transform: device.isMobile || device.isTablet ? 'translate(-50%, -140%)' : 'translate(15px, -10px)'
                        }}
                    >
                        <div className="bg-black/90 border border-axiom-cyan/50 rounded-lg p-3 shadow-[0_0_15px_rgba(0,255,255,0.2)] backdrop-blur-md min-w-[180px]">
                            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1">
                                <Info className="w-3 h-3 text-axiom-cyan" />
                                <span className="text-[10px] font-mono text-axiom-cyan uppercase tracking-wider">Sector Data</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-[8px] text-gray-500 uppercase font-mono">Biome</div>
                                    <div className="text-xs text-white font-medium">{hoveredChunk.biome}</div>
                                </div>
                                {hoveredChunk.logicString && (
                                    <div>
                                        <div className="text-[8px] text-gray-500 uppercase font-mono">Logic String</div>
                                        <div className="text-[10px] text-axiom-cyan font-mono leading-tight break-all bg-axiom-cyan/5 p-1 rounded">
                                            {hoveredChunk.logicString}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <div className="text-[8px] text-gray-500 uppercase font-mono">Entropy</div>
                                        <div className="text-[10px] text-white font-mono">{(hoveredChunk.entropy * 100).toFixed(1)}%</div>
                                    </div>
                                    <div>
                                        <div className="text-[8px] text-gray-500 uppercase font-mono">Stability</div>
                                        <div className="text-[10px] text-white font-mono">{(hoveredChunk.stabilityIndex * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
