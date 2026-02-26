
import { useStore } from '../../store';

export const AxiomaticOverlay = () => {
    const settings = useStore(state => state.emergenceSettings);
    const chunks = useStore(state => state.loadedChunks);

    if (!settings.showAxiomaticOverlay) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[45] overflow-hidden">
            {chunks.map(chunk => (
                <div 
                    key={`chunk-overlay-${chunk.id}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: `${(chunk.x * 80 + 400) / 8}%`,
                        top: `${(chunk.z * 80 + 400) / 8}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {chunk.logicString && (
                        <div className="text-[10px] font-mono text-axiom-cyan font-black bg-black/40 px-2 py-1 rounded border border-axiom-cyan/20 whitespace-nowrap mb-2">
                            {chunk.logicString}
                        </div>
                    )}
                    
                    {/* Logic Field Grid Visualization */}
                    <div className="grid grid-cols-8 gap-1 opacity-20">
                        {chunk.logicField?.map((row, i) => 
                            row.map((force, j) => {
                                const angle = Math.atan2(force.vz, force.vx) * (180 / Math.PI);
                                const magnitude = Math.hypot(force.vx, force.vz) * 100;
                                return (
                                    <div 
                                        key={`f-${i}-${j}`} 
                                        className="w-2 h-2 flex items-center justify-center"
                                    >
                                        <div 
                                            className="relative w-full h-[1px] bg-axiom-cyan origin-center"
                                            style={{ 
                                                transform: `rotate(${angle}deg) scaleX(${magnitude})`,
                                                opacity: magnitude / 10
                                            }}
                                        >
                                            {/* Arrow Head */}
                                            <div 
                                                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 border-t border-r border-axiom-cyan rotate-45"
                                                style={{ display: magnitude > 2 ? 'block' : 'none' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ))}

            {/* Axiom Rules HUD */}
            <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-4">
                {['PERSISTENCE', 'SACREDNESS', 'ANTI-ENTROPY', 'CONNECTIVITY', 'EMERGENCE'].map((rule, i) => (
                    <div key={rule} className="flex items-center gap-3 group">
                        <div className="w-1 h-8 bg-axiom-cyan/20 group-hover:bg-axiom-cyan transition-all" />
                        <div className="flex flex-col">
                            <span className="text-[8px] text-gray-600 font-black">RULE 0{i+1}</span>
                            <span className="text-[10px] text-white font-black uppercase tracking-widest">{rule}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
