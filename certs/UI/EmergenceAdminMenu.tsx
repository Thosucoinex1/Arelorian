
import React from 'react';
import { useStore } from '../../store';
import { Settings, Brain, Zap, Globe, Eye, ShieldAlert } from 'lucide-react';

export const EmergenceAdminMenu = () => {
    const showAdmin = useStore(state => state.showAdmin);
    const toggleAdmin = useStore(state => state.toggleAdmin);
    const settings = useStore(state => state.emergenceSettings);
    const setEmergenceSetting = useStore(state => state.setEmergenceSetting);
    const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);

    if (!showAdmin) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0a0a0f] border-2 border-axiom-cyan/30 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-axiom-cyan/10 rounded-2xl">
                            <Settings className="w-6 h-6 text-axiom-cyan" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Axiomatic Control Center</h2>
                            <p className="text-[10px] text-axiom-cyan font-mono uppercase tracking-widest opacity-60">System://Emergence_Parameters</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toggleAdmin(false)}
                        className="p-4 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {!isAxiomAuthenticated && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4">
                            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <h4 className="text-red-500 text-xs font-black uppercase mb-1">Restricted Access</h4>
                                <p className="text-[10px] text-red-400/70 leading-relaxed">Most advanced axiomatic controls require an active Handshake. Please verify your identity via the Neural Terminal.</p>
                            </div>
                        </div>
                    )}

                    <section className="space-y-4">
                        <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Brain className="w-4 h-4 text-axiom-cyan" /> Emergence Logic
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => setEmergenceSetting('isEmergenceEnabled', !settings.isEmergenceEnabled)}
                                className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-2 ${settings.isEmergenceEnabled ? 'bg-axiom-cyan/10 border-axiom-cyan/40' : 'bg-white/5 border-white/10 opacity-60'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">Global Emergence</span>
                                    <div className={`w-3 h-3 rounded-full ${settings.isEmergenceEnabled ? 'bg-axiom-cyan shadow-[0_0_10px_#06b6d4]' : 'bg-gray-700'}`} />
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight">Toggle all autonomous agent behaviors and unscripted interactions.</p>
                            </button>

                            <button 
                                onClick={() => setEmergenceSetting('useHeuristicsOnly', !settings.useHeuristicsOnly)}
                                className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-2 ${settings.useHeuristicsOnly ? 'bg-axiom-gold/10 border-axiom-gold/40' : 'bg-white/5 border-white/10 opacity-60'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">Local Heuristics Only</span>
                                    <div className={`w-3 h-3 rounded-full ${settings.useHeuristicsOnly ? 'bg-axiom-gold shadow-[0_0_10px_#f59e0b]' : 'bg-gray-700'}`} />
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight">Deactivate API-cost features. Use internal logic strings for behavior generation.</p>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Globe className="w-4 h-4 text-axiom-cyan" /> World Synthesis
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                disabled={!isAxiomAuthenticated}
                                onClick={() => setEmergenceSetting('axiomaticWorldGeneration', !settings.axiomaticWorldGeneration)}
                                className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-2 ${settings.axiomaticWorldGeneration ? 'bg-axiom-cyan/10 border-axiom-cyan/40' : 'bg-white/5 border-white/10'} ${!isAxiomAuthenticated ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">Axiomatic Generation</span>
                                    <div className={`w-3 h-3 rounded-full ${settings.axiomaticWorldGeneration ? 'bg-axiom-cyan shadow-[0_0_10px_#06b6d4]' : 'bg-gray-700'}`} />
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight">Enable mathematical information field world creation based on logic strings.</p>
                            </button>

                            <button 
                                disabled={!isAxiomAuthenticated}
                                onClick={() => setEmergenceSetting('physicsBasedActivation', !settings.physicsBasedActivation)}
                                className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-2 ${settings.physicsBasedActivation ? 'bg-axiom-cyan/10 border-axiom-cyan/40' : 'bg-white/5 border-white/10'} ${!isAxiomAuthenticated ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">Physics Activation</span>
                                    <div className={`w-3 h-3 rounded-full ${settings.physicsBasedActivation ? 'bg-axiom-cyan shadow-[0_0_10px_#06b6d4]' : 'bg-gray-700'}`} />
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight">World generation triggers based on physical proximity and axiom rules.</p>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Eye className="w-4 h-4 text-axiom-cyan" /> Visualization
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => setEmergenceSetting('showAxiomaticOverlay', !settings.showAxiomaticOverlay)}
                                className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-2 ${settings.showAxiomaticOverlay ? 'bg-axiom-cyan/10 border-axiom-cyan/40' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">Axiom Overlay</span>
                                    <div className={`w-3 h-3 rounded-full ${settings.showAxiomaticOverlay ? 'bg-axiom-cyan shadow-[0_0_10px_#06b6d4]' : 'bg-gray-700'}`} />
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight">Visualize the underlying logic strings and information fields in real-time.</p>
                            </button>
                        </div>
                    </section>
                </div>

                <div className="p-8 bg-black/40 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-axiom-gold animate-pulse" />
                        <span className="text-[10px] text-gray-500 font-mono uppercase">Matrix Status: Nominal</span>
                    </div>
                    <div className="text-[10px] text-axiom-cyan font-mono uppercase tracking-widest">v1.0.0-RELEASE-CANDIDATE</div>
                </div>
            </div>
        </div>
    );
};
