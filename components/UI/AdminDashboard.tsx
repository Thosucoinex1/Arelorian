
import React, { useState } from 'react';
import { useStore } from '../../store';
import { soundManager } from '../../services/SoundManager';

export const AdminDashboard = () => {
    const { showAdmin, toggleAdmin, serverStats, graphicPacks, uploadGraphicPack } = useStore();
    const [paypalKey, setPaypalKey] = useState("sk_test_123456789");
    const [newPackName, setNewPackName] = useState("");

    if (!showAdmin) return null;

    return (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center font-sans">
            <div className="w-[800px] bg-[#111] border border-axiom-purple rounded-lg shadow-[0_0_50px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-axiom-purple to-black p-4 flex justify-between items-center">
                    <h2 className="text-xl font-serif font-bold text-white tracking-widest">SERVER ADMIN CONSOLE</h2>
                    <button onClick={() => toggleAdmin(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex p-6 gap-6 h-[500px]">
                    {/* Left: Stats */}
                    <div className="w-1/3 space-y-4">
                        <div className="bg-black/40 border border-white/10 p-4 rounded">
                            <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-2">Real-Time Metrics</h3>
                            <div className="space-y-2 text-sm text-gray-300">
                                <div className="flex justify-between"><span>Uptime:</span> <span className="text-white">{(serverStats.uptime / 60).toFixed(1)}m</span></div>
                                <div className="flex justify-between"><span>Active Agents:</span> <span className="text-green-400">{useStore.getState().agents.length}</span></div>
                                <div className="flex justify-between"><span>Tick Rate:</span> <span className="text-white">{serverStats.tickRate} Hz</span></div>
                                <div className="flex justify-between"><span>Memory:</span> <span className="text-yellow-400">{serverStats.memoryUsage} MB</span></div>
                            </div>
                        </div>

                        <div className="bg-black/40 border border-white/10 p-4 rounded">
                             <h3 className="text-axiom-gold text-xs font-bold uppercase mb-2">PayPal Integration</h3>
                             <input 
                                type="password" 
                                value={paypalKey} 
                                onChange={(e) => setPaypalKey(e.target.value)}
                                className="w-full bg-black border border-white/20 p-2 text-xs text-gray-300 rounded mb-2"
                             />
                             <div className="flex items-center space-x-2">
                                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                 <span className="text-xs text-gray-400">Gateway Active (Sandbox)</span>
                             </div>
                        </div>
                    </div>

                    {/* Right: Controls & Assets */}
                    <div className="w-2/3 space-y-4">
                        <div className="bg-black/40 border border-white/10 p-4 rounded h-full flex flex-col">
                            <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-white/10 pb-2">Graphic Pack Manager</h3>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                {graphicPacks.map((pack, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                                        <span className="text-sm text-gray-300">{pack}</span>
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
                                        value={newPackName}
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