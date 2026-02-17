
import React, { useState } from 'react';
import { useStore, User } from '../../store';
import { LandParcel, StoreProduct, ProductType, Structure, StructureType } from '../../types';
import { soundManager } from '../../services/SoundManager';
import { PayPalModal } from './PayPalModal';

const storeProducts: StoreProduct[] = [
    { id: 'LAND_PARCEL', name: 'Land Parcel Grant', description: 'Acquire unowned territory.', priceEUR: 15.00 },
    { id: 'NOTARY_LICENSE', name: 'Notary License (T3)', description: 'Allows Guild & City foundation.', priceEUR: 30.00 }
];

const Developments: React.FC<{ parcels: LandParcel[]; user: User | null; build: (pId: string, sType: StructureType) => void; certify: (pId: string) => void; }> = ({ parcels, user, build, certify }) => {
    const owned = parcels.filter(p => p.ownerId === user?.id);
    if (owned.length === 0) {
        return <div className="p-4 text-xs text-gray-500 italic">You do not own any land to develop. Acquire parcels via the Status tab.</div>
    }
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 touch-scroll">
            {owned.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded p-2 text-xs">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white">{p.name}</h4>
                        {p.isCertified ? 
                            <span className="text-axiom-cyan text-[10px] font-bold bg-axiom-cyan/10 px-2 rounded">CERTIFIED</span> :
                            <button onClick={() => certify(p.id)} className="text-[9px] border border-axiom-cyan text-axiom-cyan px-2 rounded hover:bg-axiom-cyan/20">Certify Settlement</button>
                        }
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2">Structures: {p.structures?.length || 0}</div>
                    <div className="flex space-x-2 mt-2">
                        <button onClick={() => build(p.id, 'HOUSE')} className="flex-1 text-[10px] bg-gray-500/20 hover:bg-gray-400/30 py-1 rounded">Build House</button>
                        <button onClick={() => build(p.id, 'BANK')} className="flex-1 text-[10px] bg-axiom-gold/20 hover:bg-axiom-gold/30 py-1 rounded">Build Bank</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const NotaryDashboard = () => {
  const { user, agents, hasNotaryLicense, agentSlots, device, serverStats, landParcels, buildStructure, certifyParcel } = useStore();
  const [isMinimized, setIsMinimized] = useState(device.isMobile);
  const [isPayPalOpen, setPayPalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [activeTab, setActiveTab] = useState<'STATUS' | 'REGISTRY' | 'DEVELOP'>('STATUS');

  const awakenedCount = agents.filter(a => a.isAwakened).length;
  const widthClass = isMinimized ? 'w-12' : (device.isMobile ? 'w-64' : 'w-80');

  const handlePurchaseClick = (product: StoreProduct) => {
    setSelectedProduct(product);
    setPayPalOpen(true);
    soundManager.playUI('CLICK');
  };

  return (
    <>
      <PayPalModal isOpen={isPayPalOpen} onClose={() => setPayPalOpen(false)} product={selectedProduct} />
      <div className={`flex flex-col h-[95%] max-h-[800px] bg-axiom-dark/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 shadow-2xl z-20 pointer-events-auto ${widthClass}`}>
        <div className={`border-b border-white/10 bg-gradient-to-r from-axiom-purple/20 to-transparent flex ${isMinimized ? 'flex-col-reverse justify-center py-4 gap-4' : 'flex-row justify-between p-4'} items-center transition-all`}>
          {!isMinimized && <h2 className="text-lg md:text-xl font-serif text-white tracking-widest whitespace-nowrap">DUDEN REGISTER</h2>}
          <button onClick={() => { setIsMinimized(!isMinimized); soundManager.playUI('CLICK'); }} className="text-axiom-gold hover:text-white transition-colors focus:outline-none p-2" title={isMinimized ? "Expand" : "Minimize"}>
               {isMinimized ? '◀' : '▶'}
          </button>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex border-b border-white/10">
                  <TabButton label="Status" isActive={activeTab === 'STATUS'} onClick={() => setActiveTab('STATUS')} />
                  <TabButton label="Grundbuch" isActive={activeTab === 'REGISTRY'} onClick={() => setActiveTab('REGISTRY')} />
                  <TabButton label="Develop" isActive={activeTab === 'DEVELOP'} onClick={() => setActiveTab('DEVELOP')} />
              </div>
              
              {activeTab === 'STATUS' && (
                  <div className="p-4 space-y-4">
                    <div className="bg-black/20 p-3 rounded">
                      <h3 className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-2">World Stability</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between"><span>Status:</span><span className="text-green-400">Stable</span></div>
                          <div className="flex justify-between"><span>Tick Rate:</span><span className="text-white">{serverStats.tickRate} Hz</span></div>
                          <div className="flex justify-between"><span>Souls:</span><span className="text-white">{agents.length} / {agentSlots}</span></div>
                          <div className="flex justify-between"><span>Awakened:</span><span className="text-axiom-cyan">{awakenedCount}</span></div>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-xs uppercase text-axiom-gold font-bold tracking-wider mb-3">Acquisitions</h3>
                      <div className="space-y-2">
                        <ProductCard product={storeProducts[0]} onClick={() => handlePurchaseClick(storeProducts[0])} />
                        <ProductCard product={storeProducts[1]} onClick={() => handlePurchaseClick(storeProducts[1])} isDisabled={hasNotaryLicense} />
                      </div>
                    </div>
                  </div>
              )}
              {activeTab === 'REGISTRY' && <LandRegistry parcels={landParcels} user={user} />}
              {activeTab === 'DEVELOP' && <Developments parcels={landParcels} user={user} build={buildStructure} certify={certifyParcel} />}
          </div>
        )}
      </div>
    </>
  );
};

const LandRegistry: React.FC<{ parcels: LandParcel[]; user: User | null; }> = ({ parcels, user }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 touch-scroll">
        {parcels.map(p => {
            const isOwner = p.ownerId === user?.id;
            return (
                <div key={p.id} className={`p-2 rounded border text-xs transition-all ${isOwner ? 'bg-axiom-gold/10 border-axiom-gold/50' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex justify-between items-center">
                        <span className={isOwner ? 'text-axiom-gold font-bold' : 'text-white'}>{p.name}</span>
                        <span className="text-[10px] text-gray-500">[{p.coordinates.join(', ')}]</span>
                    </div>
                    <div className="text-[10px] mt-1">
                        Owner: <span className="font-mono text-gray-400">{p.ownerId ? p.ownerId.slice(0,12) : 'UNCLAIMED'}</span>
                    </div>
                </div>
            )
        })}
    </div>
);

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'bg-white/10 text-axiom-cyan' : 'text-gray-500 hover:bg-white/5'}`}>
        {label}
    </button>
);

const ProductCard: React.FC<{ product: StoreProduct; onClick: () => void; isDisabled?: boolean }> = ({ product, onClick, isDisabled }) => (
    <div className={`p-2 rounded border transition-all ${isDisabled ? 'bg-green-800/20 border-green-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
        <div className="flex justify-between items-center">
            <div>
                <h4 className={`font-serif text-xs ${isDisabled ? 'text-green-400' : 'text-white'}`}>{product.name}</h4>
                <p className="text-[10px] text-gray-400">{product.description}</p>
            </div>
            <button onClick={onClick} disabled={isDisabled} className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${isDisabled ? 'border-green-500/50 text-green-500 cursor-default' : 'border-axiom-gold text-axiom-gold hover:bg-axiom-gold hover:text-black'}`}>
                {isDisabled ? 'ACQUIRED' : `€${product.priceEUR.toFixed(2)}`}
            </button>
        </div>
    </div>
);