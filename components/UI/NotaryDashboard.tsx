import React from 'react';
import { useStore } from '../../store';
import { LandParcel } from '../../types';

export const NotaryDashboard = () => {
  const { notaryBalance, landParcels, purchaseLand, logs } = useStore();

  const ownedLandCount = landParcels.filter(l => l.ownerId === 'NOTARY').length;

  return (
    <div className="flex flex-col h-full bg-axiom-dark/90 backdrop-blur-md border-l border-white/10 w-80 font-sans shadow-2xl z-10 pointer-events-auto">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-axiom-purple/20 to-transparent">
        <h2 className="text-xl font-serif text-white tracking-widest">NOTARY STATUS</h2>
        <div className="mt-2 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Balance</span>
            <span className="text-axiom-gold font-bold text-lg">${notaryBalance.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Land Owned</span>
            <span className="text-axiom-cyan font-bold">{ownedLandCount} / {landParcels.length}</span>
        </div>
      </div>

      {/* Land Map / List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-2">Available Parcels</h3>
        <div className="grid grid-cols-1 gap-2">
            {landParcels.map((parcel) => (
                <LandCard key={parcel.id} parcel={parcel} onPurchase={() => purchaseLand(parcel.id)} balance={notaryBalance} />
            ))}
        </div>
      </div>

      {/* Mini Log */}
      <div className="h-1/3 border-t border-white/10 p-2 bg-black/40 overflow-hidden flex flex-col">
        <h3 className="text-[10px] uppercase text-gray-500 font-bold mb-1">Duden Register Log</h3>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {logs.map((log) => (
                <div key={log.id} className="text-[10px] font-mono text-gray-300 break-words border-l-2 border-axiom-purple pl-2 py-1 bg-white/5">
                    <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={log.type === 'COMBAT' ? 'text-red-400' : 'text-gray-300'}>
                        {log.message}
                    </span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const LandCard: React.FC<{ parcel: LandParcel; onPurchase: () => void; balance: number }> = ({ parcel, onPurchase, balance }) => {
    const isOwned = parcel.ownerId === 'NOTARY';
    const canAfford = balance >= parcel.value;

    return (
        <div className={`p-3 rounded border ${isOwned ? 'border-axiom-cyan bg-axiom-cyan/10' : 'border-white/10 bg-white/5'} transition-all hover:bg-white/10`}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-serif text-sm text-white">{parcel.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">
                        Entropy: {(parcel.entropy * 100).toFixed(1)}% | Grid: [{parcel.coordinates[0]}, {parcel.coordinates[1]}]
                    </p>
                </div>
                {!isOwned && (
                    <button 
                        onClick={onPurchase}
                        disabled={!canAfford}
                        className={`text-xs px-2 py-1 rounded border ${canAfford ? 'border-axiom-gold text-axiom-gold hover:bg-axiom-gold hover:text-black' : 'border-gray-700 text-gray-700 cursor-not-allowed'}`}
                    >
                        ${parcel.value}
                    </button>
                )}
                {isOwned && (
                    <span className="text-[10px] bg-axiom-cyan text-black px-1 rounded font-bold">OWNED</span>
                )}
            </div>
        </div>
    );
}