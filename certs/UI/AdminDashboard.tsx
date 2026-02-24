
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { soundManager } from '../../services/SoundManager';
import { Settings, Brain, Zap, Globe, Eye, ShieldAlert, Database, Activity } from 'lucide-react';

const ADMIN_EMAIL = 'projectouroboroscollective@gmail.com';

/**
 * AdminDashboard - High-level administrative control center.
 * Restricted to projectouroboroscollective@gmail.com.
 */
export const AdminDashboard = () => {
    const showAdmin = useStore(state => state.showAdmin);
    const toggleAdmin = useStore(state => state.toggleAdmin);
    const serverStats = useStore(state => state.serverStats);
    const graphicPacks = useStore(state => state.graphicPacks);
    const uploadGraphicPack = useStore(state => state.uploadGraphicPack);
    const importAgent = useStore(state => state.importAgent);
    const agentsCount = useStore(state => state.agents.length);
    const user = useStore(state => state.user);
    const isAxiomAuthenticated = useStore(state => state.isAxiomAuthenticated);
    const emergenceSettings = useStore(state => state.emergenceSettings);
    const setEmergenceSetting = useStore(state => state.setEmergenceSetting);
    
    const [paypalKey, setPaypalKey] = useState("sk_test_123456789");
    const [newPackName, setNewPackName] = useState("");
    const [importSource, setImportSource] = useState("");
    const [importType, setImportType] = useState<'URL' | 'JSON'>('URL');
    const [backendStatus, setBackendStatus] = useState<any>(null);
    const [fetchDataMessage, setFetchDataMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (showAdmin) {
            fetch('/api/health')
                .then(res => res.json())
                .then(data => setBackendStatus(data))
                .catch(err => console.error("Failed to fetch backend status", err));
        }
    }, [showAdmin]);

    // Security Gate: Memoized check for admin status
    const hasAccess = useMemo(() => {
        return user?.email === ADMIN_EMAIL && isAxiomAuthenticated;
    }, [user?.email, isAxiomAuthenticated]);

    // If visibility is off, or the user is not the authorized admin, do not render.
    if (!showAdmin || !hasAccess) return null;

    const handleImport = () => {
        if (!importSource) return;
        importAgent(importSource, importType);
        setImportSource("");
        soundManager.playUI('CLICK');
    };

    const handleFetchData = async () => {
        try {
            const res = await fetch('/api/data');
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            setFetchDataMessage({ type: 'success', text: 'Data fetched successfully!' });
        } catch (err: any) {
            setFetchDataMessage({ type: 'error', text: err.message || 'Failed to fetch data' });
        }
        setTimeout(() => setFetchDataMessage(null), 3000);
    };

    return (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center font-sans backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-[850px] bg-[#0a0a0f] border-2 border-axiom-purple/50 rounded-2xl shadow-[0_0_100px_rgba(79,70,229,0.2)] flex flex-col overflow-hidden max-h-[90vh] relative">
                
                {/* Visual Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                    <div className="w-full h-1 bg-axiom-purple animate-[scan_4s_linear_infinite]" />
                </div>

                {/* Header */}
                <div className="bg-gradient-to-r from-axiom-purple/40 to-black p-6 flex justify-between items-center border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-serif font-black text-white tracking-[0.2em] uppercase">Matrix Overseer</h2>
                        <p className="text-[10px] text-axiom-cyan font-mono tracking-widest mt-1">[SESSION: AUTHORIZED_ADMIN]</p>
                    </div>
                    <button 
                        onClick={() => toggleAdmin(false)} 
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex p-8 gap-8 h-auto overflow-y-auto">
                    {/* Left Column: Diagnostics */}
                    <div className="w-1/3 space-y-6">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                            <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-axiom-cyan animate-pulse" />
                                Live Diagnostics
                            </h3>
                            <div className="space-y-3 text-sm font-mono">
                                <div className="flex justify-between text-gray-400">
                                    <span>Uptime</span> 
                                    <span className="text-white">{String((serverStats.uptime / 60).toFixed(1))}m</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Active Entities</span> 
                                    <span className="text-green-400">{String(agentsCount)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Simulation Hz</span> 
                                    <span className="text-white">{String(serverStats.tickRate)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Mem Heap</span> 
                                    <span className="text-yellow-400">{String(serverStats.memoryUsage)}MB</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                            <h3 className="text-axiom-purple text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                                <Database className="w-3 h-3" /> Axiomatic Backend
                            </h3>
                            <div className="space-y-2 text-[10px] font-mono mb-4">
                                <div className="flex justify-between text-gray-500">
                                    <span>Service</span>
                                    <span className="text-white text-right">{backendStatus?.service || 'Connecting...'}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Database</span>
                                    <span className="text-axiom-cyan text-right">{backendStatus?.database || 'Loading...'}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 items-center">
                                    <span>Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${backendStatus?.status === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                        <span className={backendStatus?.status === 'HEALTHY' ? 'text-green-400' : 'text-red-400'}>
                                            {backendStatus?.status || 'OFFLINE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleFetchData}
                                className="w-full py-2 bg-axiom-purple/20 hover:bg-axiom-purple/40 text-axiom-purple border border-axiom-purple/50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Fetch Data
                            </button>
                            {fetchDataMessage && (
                                <div className={`mt-2 text-[10px] font-mono text-center ${fetchDataMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {fetchDataMessage.text}
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                             <h3 className="text-axiom-gold text-xs font-bold uppercase mb-4 tracking-widest">Revenue Gateway</h3>
                             <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-500 uppercase">Sandbox API Key</label>
                                    <input 
                                        type="password" 
                                        value={String(paypalKey)} 
                                        onChange={(e) => setPaypalKey(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 p-3 text-xs text-axiom-gold rounded-lg font-mono focus:border-axiom-gold/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 bg-green-500/10 p-2 rounded border border-green-500/20">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">Gateway Synchronized</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Right Column: Entity Manipulation & Emergence Settings */}
                    <div className="w-2/3 space-y-6">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <h3 className="text-white text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                                <Brain className="w-4 h-4 text-axiom-cyan" /> Emergence Parameters
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setEmergenceSetting('isEmergenceEnabled', !emergenceSettings.isEmergenceEnabled)}
                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex justify-between items-center ${emergenceSettings.isEmergenceEnabled ? 'bg-axiom-cyan/10 border-axiom-cyan/40 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                >
                                    <span>Global Emergence</span>
                                    <div className={`w-2 h-2 rounded-full ${emergenceSettings.isEmergenceEnabled ? 'bg-axiom-cyan shadow-[0_0_8px_#06b6d4]' : 'bg-gray-700'}`} />
                                </button>
                                <button 
                                    onClick={() => setEmergenceSetting('useHeuristicsOnly', !emergenceSettings.useHeuristicsOnly)}
                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex justify-between items-center ${emergenceSettings.useHeuristicsOnly ? 'bg-axiom-gold/10 border-axiom-gold/40 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                >
                                    <span>Local Heuristics</span>
                                    <div className={`w-2 h-2 rounded-full ${emergenceSettings.useHeuristicsOnly ? 'bg-axiom-gold shadow-[0_0_8px_#f59e0b]' : 'bg-gray-700'}`} />
                                </button>
                                <button 
                                    onClick={() => setEmergenceSetting('axiomaticWorldGeneration', !emergenceSettings.axiomaticWorldGeneration)}
                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex justify-between items-center ${emergenceSettings.axiomaticWorldGeneration ? 'bg-axiom-purple/10 border-axiom-purple/40 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                >
                                    <span>Axiomatic Gen</span>
                                    <div className={`w-2 h-2 rounded-full ${emergenceSettings.axiomaticWorldGeneration ? 'bg-axiom-purple shadow-[0_0_8px_#a855f7]' : 'bg-gray-700'}`} />
                                </button>
                                <button 
                                    onClick={() => setEmergenceSetting('showAxiomaticOverlay', !emergenceSettings.showAxiomaticOverlay)}
                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex justify-between items-center ${emergenceSettings.showAxiomaticOverlay ? 'bg-axiom-cyan/10 border-axiom-cyan/40 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                >
                                    <span>Axiom Overlay</span>
                                    <div className={`w-2 h-2 rounded-full ${emergenceSettings.showAxiomaticOverlay ? 'bg-axiom-cyan shadow-[0_0_8px_#06b6d4]' : 'bg-gray-700'}`} />
                                </button>
                                <button 
                                    onClick={() => {
                                        useStore.getState().loadedChunks.forEach(c => useStore.getState().stabilizeChunk(c.id));
                                        soundManager.playUI('CLICK');
                                    }}
                                    className="p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-[10px] font-black uppercase hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-3 h-3" /> Stabilize Matrix
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 p-6 rounded-xl relative overflow-hidden">
                             <h3 className="text-green-400 text-xs font-bold uppercase mb-4 tracking-widest flex justify-between items-center">
                                 <span>Neural Entity Manifestation</span>
                                 <span className="bg-green-500/20 text-[9px] px-2 py-0.5 rounded-full border border-green-500/30">LORE-SYNC ACTIVE</span>
                             </h3>
                             
                             <div className="flex gap-2 mb-4">
                                 <button 
                                    onClick={() => setImportType('URL')} 
                                    className={`flex-1 text-[10px] py-2 rounded-lg border font-bold transition-all ${importType === 'URL' ? 'bg-green-500/20 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-white/5 text-gray-500 hover:border-white/20'}`}
                                 >
                                    URL (Janitor/CAI)
                                 </button>
                                 <button 
                                    onClick={() => setImportType('JSON')} 
                                    className={`flex-1 text-[10px] py-2 rounded-lg border font-bold transition-all ${importType === 'JSON' ? 'bg-green-500/20 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-white/5 text-gray-500 hover:border-white/20'}`}
                                 >
                                    Raw Axiom JSON
                                 </button>
                             </div>

                             <textarea 
                                value={String(importSource)}
                                onChange={(e) => setImportSource(e.target.value)}
                                placeholder={importType === 'URL' ? "https://janitorai.com/characters/..." : "{\"name\": \"Entity\", ...}"}
                                className="w-full h-24 bg-black/60 border border-white/10 p-4 text-xs text-green-300 rounded-xl font-mono mb-4 focus:border-green-500/50 outline-none resize-none transition-all placeholder:text-gray-700"
                             />

                             <button 
                                onClick={handleImport}
                                disabled={!importSource}
                                className={`w-full py-4 text-xs font-black rounded-xl uppercase tracking-[0.3em] transition-all ${!importSource ? 'bg-gray-900 text-gray-700' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30 active:scale-[0.98]'}`}
                             >
                                Materialize Awareness
                             </button>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col h-64">
                            <h3 className="text-white text-xs font-bold uppercase mb-4 tracking-widest">Visual Logic Packs</h3>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 mb-6 custom-scrollbar pr-2">
                                {graphicPacks.map((pack, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-axiom-purple" />
                                            <span className="text-sm text-gray-300 font-medium">{String(pack)}</span>
                                        </div>
                                        <span className="text-[9px] text-axiom-cyan bg-axiom-cyan/10 px-2 py-1 rounded-md font-bold uppercase tracking-tighter">Manifested</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex space-x-3">
                                    <input 
                                        type="text" 
                                        placeholder="Pack Identifier..." 
                                        value={String(newPackName)}
                                        onChange={(e) => setNewPackName(e.target.value)}
                                        className="flex-1 bg-black/60 border border-white/10 p-3 text-xs text-white rounded-lg focus:border-axiom-purple/50 outline-none transition-all"
                                    />
                                    <button 
                                        onClick={() => {
                                            if(newPackName) {
                                                uploadGraphicPack(newPackName);
                                                setNewPackName("");
                                                soundManager.playUI('CLICK');
                                            }
                                        }}
                                        className="bg-axiom-purple hover:bg-axiom-purple/80 text-white px-6 rounded-lg font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Inject
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-black/80 text-center border-t border-white/5">
                    <span className="text-[9px] text-gray-700 font-mono tracking-[0.5em] uppercase">Security Clearance: {ADMIN_EMAIL}</span>
                </div>
            </div>
        </div>
    );
};
