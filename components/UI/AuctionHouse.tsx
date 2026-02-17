
import React from 'react';
import { useStore } from '../../store';

export const AuctionHouse = () => {
    const listings = useStore(state => state.auctionHouse);
    const isMobile = useStore(state => state.device.isMobile);

    return (
        <div className={`absolute left-4 top-1/4 ${isMobile ? 'w-64' : 'w-80'} bg-black/80 border border-axiom-gold/30 rounded-lg p-3 backdrop-blur-xl pointer-events-auto z-20`}>
            <div className="flex justify-between items-center mb-3 border-b border-axiom-gold/20 pb-2">
                <h3 className="text-axiom-gold font-serif text-sm tracking-widest uppercase">Global Market</h3>
                <span className="text-[10px] text-gray-500">{listings.length} Active</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {listings.length === 0 ? (
                    <div className="text-[10px] text-gray-600 italic text-center py-4">No assets listed in the Axiom...</div>
                ) : (
                    listings.map(item => (
                        <div key={item.id} className="bg-white/5 border border-white/10 p-2 rounded flex justify-between items-center hover:bg-white/10 transition-colors">
                            <div>
                                <div className="text-xs text-white font-bold">{item.item.name}</div>
                                <div className="text-[9px] text-gray-400">Seller: {item.sellerId.slice(0,5)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-axiom-gold text-xs font-mono font-bold">{item.price}g</div>
                                <button className="text-[8px] bg-axiom-gold/20 text-axiom-gold px-2 py-0.5 rounded border border-axiom-gold/30">BUY</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-[8px] text-gray-500">
                <span>Market Fee: 2%</span>
                <span>Notary Secured</span>
            </div>
        </div>
    );
};
