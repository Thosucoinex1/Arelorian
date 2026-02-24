
import React, { useState } from 'react';
import { useStore } from '../../store';
import { X, Gavel, Timer, TrendingUp, Package } from 'lucide-react';

export const AuctionHouseOverlay = () => {
  const isOpen = useStore(state => state.showAuctionHouse);
  const toggleAuctionHouse = useStore(state => state.toggleAuctionHouse);
  const auctionHouse = useStore(state => state.auctionHouse);
  const bidOnAuction = useStore(state => state.bidOnAuction);
  const user = useStore(state => state.user);
  const agents = useStore(state => state.agents);
  const currentUserAgent = agents.find(a => a.faction === 'PLAYER');

  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const handleBid = (auctionId: string) => {
    const amount = bidAmounts[auctionId];
    if (amount && currentUserAgent) {
      bidOnAuction(auctionId, currentUserAgent.id, amount);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => toggleAuctionHouse(false)} />
      
      <div className="w-full max-w-4xl bg-axiom-dark/95 border border-axiom-cyan/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-axiom-cyan/20 to-transparent p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-axiom-cyan/10 rounded-lg border border-axiom-cyan/30">
              <Gavel className="w-6 h-6 text-axiom-cyan" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-black text-white tracking-widest uppercase">Axiomatic Auction House</h2>
              <p className="text-[10px] text-axiom-cyan font-mono tracking-widest uppercase opacity-60">Economic Layer: Active Listings</p>
            </div>
          </div>
          <button 
            onClick={() => toggleAuctionHouse(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {auctionHouse.filter(a => a.status === 'ACTIVE').map((auc) => (
            <div key={auc.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-axiom-cyan/40 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black/40 rounded-lg border border-white/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-axiom-gold" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{auc.item.name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Seller: {auc.sellerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-axiom-gold font-mono font-bold">
                    <TrendingUp size={12} />
                    <span>{auc.currentBid}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 uppercase">Current Bid</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                  <Timer size={12} className="text-axiom-cyan" />
                  <span>Ends in: {Math.max(0, Math.floor((auc.endTime - Date.now()) / 60000))}m</span>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="number"
                    placeholder="Bid amount..."
                    value={bidAmounts[auc.id] || ''}
                    onChange={(e) => setBidAmounts({ ...bidAmounts, [auc.id]: parseInt(e.target.value) })}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-axiom-cyan/50 outline-none transition-all"
                  />
                  <button 
                    onClick={() => handleBid(auc.id)}
                    className="bg-axiom-cyan/20 hover:bg-axiom-cyan/40 border border-axiom-cyan/50 text-axiom-cyan px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            </div>
          ))}

          {auctionHouse.filter(a => a.status === 'ACTIVE').length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Gavel className="w-12 h-12 text-gray-800 mx-auto mb-4" />
              <p className="text-gray-600 font-mono uppercase tracking-widest text-sm">No active listings in the Matrix.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Market Synchronized</span>
          </div>
          <div className="text-[9px] text-axiom-cyan font-mono uppercase tracking-widest">
            Your Balance: <span className="text-white">{currentUserAgent?.gold || 0} Gold</span>
          </div>
        </div>
      </div>
    </div>
  );
};
