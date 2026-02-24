
import React from 'react';
import { useStore } from '../../store';

export const AxiomaticOverlay = () => {
    const settings = useStore(state => state.emergenceSettings);
    const chunks = useStore(state => state.loadedChunks);
    const agents = useStore(state => state.agents);

    if (!settings.showAxiomaticOverlay) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[45] overflow-hidden">
            {chunks.map(chunk => (
                chunk.logicString && (
                    <div 
                        key={`logic-${chunk.id}`}
                        className="absolute text-[8px] font-mono text-axiom-cyan/40 uppercase tracking-widest whitespace-nowrap"
                        style={{
                            left: `${(chunk.x * 80 + 400) / 8}%`, // Rough screen mapping
                            top: `${(chunk.z * 80 + 400) / 8}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {chunk.logicString}
                        <div className="flex gap-1 mt-1">
                            {chunk.axiomaticData?.[0].slice(0, 4).map((v, i) => (
                                <div key={i} className="w-1 h-1 bg-axiom-cyan/20" style={{ opacity: v }} />
                            ))}
                        </div>
                    </div>
                )
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
