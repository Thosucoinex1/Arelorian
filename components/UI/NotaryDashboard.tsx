
import React, { useState } from 'react';
import { useStore } from '../../store';
import { LandParcel, StoreProduct, ProductType, Structure, StructureType } from '../../types';
import { soundManager } from '../../services/SoundManager';
import { PayPalModal } from './PayPalModal';
import { ShoppingBag, Zap, Key, Activity, Home, Database } from 'lucide-react';

const storeProducts: StoreProduct[] = [
    { id: 'MATRIX_ENERGY_REFILL', name: 'Neural Energy Refill', description: 'Refill 500 Matrix Energy.', priceEUR: 5.00 },
    { id: 'DATA_HUB_UPGRADE', name: 'Advanced AI Grant', description: 'Permanent Advanced Intel for agent.', priceEUR: 20.00 }
];

export const NotaryDashboard = () => {
  const agents = useStore(state => state.agents);
  const device = useStore(state => state.device);
  const serverStats = useStore(state => state.serverStats);
  const landParcels = useStore(state => state.landParcels);
  const user = useStore(state => state.user);
  const matrixEnergy = useStore(state => state.matrixEnergy);
  const userApiKey = useStore(state => state.userApiKey);
  const setUserApiKey = useStore(state => state.setUserApiKey);
  const toggleMarket = useStore(state => state.toggleMarket);
  const buildStructure = useStore(state => state.buildStructureOnParcel);

  const [isMinimized, setIsMinimized] = useState(device.isMobile);
  const [activeTab, setActiveTab] = useState<'STATUS' | 'ASSETS' | 'CONFIG'>('STATUS');
  const [showPayPal, setShowPayPal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  const widthClass = isMinimized ? 'w-12' : (device.isMobile ? 'w-64' : 'w-80');

  const handleRefill = () => {
      setSelectedProduct(storeProducts[0]);
      setShowPayPal(true);
  };

  const handleUpgrade = () => {
      setSelectedProduct(storeProducts[1]);
      setShowPayPal(true);
  };

  return (
    <div className={`flex flex-col h-[95%] max-h-[800px] bg-axiom-dark/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 shadow-2xl z-20 pointer-events-auto ${widthClass}`}>
      <div className={`border-b border-white/10 bg-gradient-to-r from-axiom-purple/20 to-transparent flex ${isMinimized ? 'flex-col-reverse justify-center py-4 gap-4' : 'flex-row justify-between p-4'} items-center transition-all`}>
        {!isMinimized && <h2 className="text-lg md:text-xl font-serif text-white tracking-widest whitespace-nowrap">DUDEN REGISTER</h2>}
        <button onClick={() => setIsMinimized(!isMinimized)} className="text-axiom-gold hover:text-white transition-colors focus:outline-none p-2">
             {isMinimized ? '◀' : '▶'}
        </button>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-white/10">
                <TabButton label="Status" isActive={activeTab === 'STATUS'} onClick={() => setActiveTab('STATUS')} />
                <TabButton label="Assets" isActive={activeTab === 'ASSETS'} onClick={() => setActiveTab('ASSETS')} />
                <TabButton label="Config" isActive={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {activeTab === 'STATUS' && (
                    <>
                        {/* Energy Display */}
                        <div className="bg-black/40 border border-white/10 p-5 rounded-2xl">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-[10px] text-axiom-cyan font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Zap className="w-3 h-3" /> Matrix Energy
                                </h3>
                                <button onClick={handleRefill} className="text-[9px] bg-axiom-cyan/10 hover:bg-axiom-cyan text-axiom-cyan hover:text-black border border-axiom-cyan/30 px-2 py-1 rounded-md transition-all font-black uppercase">Refill</button>
                            </div>
                            <div className="text-3xl font-serif text-white font-bold flex items-baseline gap-2">
                                {String(matrixEnergy)}
                                <span className="text-xs text-gray-500 font-sans font-normal uppercase">Units</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${matrixEnergy < 20 ? 'bg-red-500 animate-pulse' : 'bg-axiom-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`}
                                    style={{ width: `${Math.min(100, (matrixEnergy / 200) * 100).toFixed(0)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => toggleMarket(true)}
                                className="bg-axiom-gold/10 border border-axiom-gold/30 text-axiom-gold py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex flex-col items-center justify-center gap-1 hover:bg-axiom-gold hover:text-black transition-all"
                            >
                                <ShoppingBag className="w-4 h-4" /> Market
                            </button>
                            <button 
                                onClick={handleUpgrade}
                                className="bg-axiom-purple/10 border border-axiom-purple/30 text-axiom-purple py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex flex-col items-center justify-center gap-1 hover:bg-axiom-purple hover:text-black transition-all"
                            >
                                <Database className="w-4 h-4" /> AI Boost
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'ASSETS' && (
                    <div className="space-y-3">
                         {landParcels.map(p => (
                            <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-white text-xs font-bold font-serif">{String(p.name)}</span>
                                    <span className="text-[9px] text-axiom-cyan bg-axiom-cyan/10 px-2 rounded uppercase font-black">Owned</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => buildStructure(p.id, 'HOUSE')}
                                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded text-[9px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1"
                                    >
                                        <Home className="w-3 h-3" /> House
                                    </button>
                                    <button 
                                        onClick={() => buildStructure(p.id, 'DATA_HUB')}
                                        className="flex-1 bg-axiom-purple/10 hover:bg-axiom-purple border border-axiom-purple/30 py-2 rounded text-[9px] uppercase font-bold text-axiom-purple hover:text-white flex items-center justify-center gap-1"
                                    >
                                        <Database className="w-3 h-3" /> DataHub
                                    </button>
                                </div>
                            </div>
                         ))}
                    </div>
                )}

                {activeTab === 'CONFIG' && (
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h3 className="text-xs text-white font-bold uppercase mb-3 flex items-center gap-2">
                                <Key className="w-3 h-3 text-axiom-cyan" /> Gemini API Key
                            </h3>
                            <p className="text-[10px] text-gray-500 italic mb-4">Erlaube deinen Agenten den vollen Zugriff auf die Gemini-Matrix mit deinem eigenen Key.</p>
                            <input 
                                type="password" 
                                placeholder="Paste Key here..." 
                                value={String(userApiKey || '')} 
                                onChange={(e) => setUserApiKey(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 p-3 text-xs text-axiom-cyan rounded-lg font-mono focus:border-axiom-cyan/50 outline-none transition-all"
                            />
                            {userApiKey && (
                                <button onClick={() => setUserApiKey(null)} className="text-[8px] text-red-500 uppercase font-bold mt-2 hover:underline">Revoke Key Access</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/20 text-[9px] text-gray-600 font-mono flex justify-between uppercase">
                <span>Threat: {String((serverStats.threatLevel * 100).toFixed(1))}%</span>
                <span>Entities: {String(agents.length)}</span>
            </div>
        </div>
      )}

      {showPayPal && (
          <PayPalModal 
            isOpen={showPayPal} 
            onClose={() => setShowPayPal(false)} 
            product={selectedProduct} 
          />
      )}
    </div>
  );
};

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'bg-white/10 text-axiom-cyan border-b-2 border-axiom-cyan' : 'text-gray-500 hover:bg-white/5'}`}>
        {String(label)}
    </button>
);
