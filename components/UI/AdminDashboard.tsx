
import React, { useState } from 'react';
import { useStore } from '../../store';
import { soundManager } from '../../services/SoundManager';

export const AdminDashboard = () => {
    const showAdmin = useStore(state => state.showAdmin);
    const toggleAdmin = useStore(state => state.toggleAdmin);
    const serverStats = useStore(state => state.serverStats);
    const graphicPacks = useStore(state => state.graphicPacks);
    const uploadGraphicPack = useStore(state => state.uploadGraphicPack);
    const importAgent = useStore(state => state.importAgent);
    const agentsCount = useStore(state => state.agents.length);
    
    const [paypalKey, setPaypalKey] = useState("sk_test_123456789");
    const [newPackName, setNewPackName] = useState("");
    const [importSource, setImportSource] = useState("");
    const [importType, setImportType] = useState<'URL' | 'JSON'>('URL');

    if (!showAdmin) return null;

    const handleImport = () => {
        if (!importSource) return;
        importAgent(importSource, importType);
        setImportSource("");
        soundManager.playUI('CLICK');
    };

    return (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center font-sans">
            <div className="w-[800px] bg-[#111] border border-axiom-purple rounded-lg shadow-[0_0_50px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden max-h-[90vh]">
                
                <div className="bg-gradient-to-r from-axiom-purple to-black p-4 flex justify-between items-center">
                    <h2 className="text-xl font-serif font-bold text-white tracking-widest">SERVER ADMIN CONSOLE</h2>
                    <button onClick={() => toggleAdmin(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex p-6 gap-6 h-auto overflow-y-auto">
                    <div className="w-1/3 space-y-4">
                        <div className="bg-black/40 border border-white/10 p-4 rounded">
                            <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-2">Real-Time Metrics</h3>
                            <div className="space-y-2 text-sm text-gray-300">
                                <div className="flex justify-between"><span>Uptime:</span> <span className="text-white">{String((serverStats.uptime / 60).toFixed(1))}m</span></div>
                                <div className="flex justify-between"><span>Active Agents:</span> <span className="text-green-400">{String(agentsCount)}</span></div>
                                <div className="flex justify-between"><span>Tick Rate:</span> <span className="text-white">{String(serverStats.tickRate)} Hz</span></div>
                                <div className="flex justify-between"><span>Memory:</span> <span className="text-yellow-400">{String(serverStats.memoryUsage)} MB</span></div>
                            </div>
                        </div>

                        <div className="bg-black/40 border border-white/10 p-4 rounded">
                             <h3 className="text-axiom-gold text-xs font-bold uppercase mb-2">PayPal Integration</h3>
                             <input 
                                type="password" 
                                value={String(paypalKey)} 
                                onChange={(e) => setPaypalKey(e.target.value)}
                                className="w-full bg-black border border-white/20 p-2 text-xs text-gray-300 rounded mb-2"
                             />
                             <div className="flex items-center space-x-2">
                                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                 <span className="text-xs text-gray-400">Gateway Active (Sandbox)</span>
                             </div>
                        </div>
                    </div>

                    <div className="w-2/3 space-y-4">
                        <div className="bg-black/40 border border-white/10 p-4 rounded border-l-4 border-l-green-500">
                             <h3 className="text-green-500 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                                 <span>Neural Entity Import</span>
                                 <span className="bg-green-900/40 text-[9px] px-1 rounded">V2.1</span>
                             </h3>
                             <div className="flex gap-2 mb-2">
                                 <button onClick={() => setImportType('URL')} className={`flex-1 text-[10px] py-1 rounded border ${importType === 'URL' ? 'bg-green-900/40 border-green-500 text-white' : 'border-gray-700 text-gray-500'}`}>JanitorAI / CAI URL</button>
                                 <button onClick={() => setImportType('JSON')} className={`flex-1 text-[10px] py-1 rounded border ${importType === 'JSON' ? 'bg-green-900/40 border-green-500 text-white' : 'border-gray-700 text-gray-500'}`}>Raw JSON Schema</button>
                             </div>
                             <textarea 
                                value={String(importSource)}
                                onChange={(e) => setImportSource(e.target.value)}
                                placeholder={importType === 'URL' ? "Paste https://janitorai.com/characters/... URL" : "{ \"name\": \"Entity\", ... }"}
                                className="w-full h-20 bg-black border border-white/20 p-2 text-xs text-green-300 rounded font-mono mb-2 focus:border-green-500 outline-none"
                             />
                             <button 
                                onClick={handleImport}
                                disabled={!importSource}
                                className={`w-full py-2 text-xs font-bold rounded uppercase tracking-wider ${!importSource ? 'bg-gray-800 text-gray-500' : 'bg-green-700 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]'}`}
                             >
                                 Materialize Entity
                             </button>
                        </div>

                        <div className="bg-black/40 border border-white/10 p-4 rounded h-full flex flex-col">
                            <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-white/10 pb-2">Graphic Pack Manager</h3>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                {graphicPacks.map((pack, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                                        <span className="text-sm text-gray-300">{String(pack)}</span>
                                        <span className="text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded">INSTALLED</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <label className="text-xs text-gray-500 mb-1 block">Upload New Texture Pack (.zip / .json)</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        placeholder="Pack Name..." 
                                        value={String(newPackName)}
                                        onChange={(e) => setNewPackName(e.target.value)}
                                        className="flex-1 bg-black border border-white/20 p-2 text-sm text-white rounded"
                                    />
                                    <button 
                                        onClick={() => {
                                            if(newPackName) {
                                                uploadGraphicPack(newPackName);
                                                setNewPackName("");
                                                soundManager.playUI('CLICK');
                                            }
                                        }}
                                        className="bg-axiom-purple hover:bg-axiom-purple/80 text-white px-4 rounded font-bold text-sm"
                                    >
                                        UPLOAD
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
