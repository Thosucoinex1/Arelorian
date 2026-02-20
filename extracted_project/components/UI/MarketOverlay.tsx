
import React from 'react';
import { useStore } from '../../store';
import { ResourceType } from '../../types';
import { TrendingUp, ShoppingCart, Package, Hammer } from 'lucide-react';

export const MarketOverlay = () => {
    const showMarket = useStore(state => state.showMarket);
    const toggleMarket = useStore(state => state.toggleMarket);
    const market = useStore(state => state.market);
    const orders = useStore(state => state.craftingOrders);

    if (!showMarket) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md pointer-events-auto">
            <div className="w-full max-w-4xl bg-axiom-dark border-2 border-axiom-cyan/40 rounded-[2rem] shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
                <div className="bg-axiom-cyan/10 p-6 border-b border-axiom-cyan/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-serif font-black text-white tracking-widest uppercase flex items-center gap-3">
                            <ShoppingCart className="text-axiom-cyan" /> Central Market Registry
                        </h2>
                        <p className="text-[10px] text-axiom-cyan font-mono opacity-60 uppercase tracking-tighter">Axiomatic Trade Terminal v1.0</p>
                    </div>
                    <button onClick={() => toggleMarket(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                    {/* Resource Prices */}
                    <section>
                        <h3 className="text-axiom-gold text-xs font-black uppercase mb-4 tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Commodity Index
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.entries(market.prices).map(([res, price]) => (
                                <div key={res} className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-bold text-gray-200">{String(res)}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] text-gray-500 font-mono">STOCK: {String(market.inventory[res as ResourceType] || 0)}</span>
                                        <span className="text-axiom-gold font-mono font-bold">{String(price)}g</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Crafting Orders */}
                    <section>
                        <h3 className="text-axiom-cyan text-xs font-black uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Hammer className="w-4 h-4" /> Global Crafting Orders
                        </h3>
                        <div className="space-y-3">
                            {orders.length === 0 ? (
                                <div className="text-center py-12 bg-black/40 rounded-2xl border border-white/5 italic text-gray-600 text-xs">
                                    No pending orders. The matrix is silent.
                                </div>
                            ) : (
                                orders.map(order => (
                                    <div key={order.id} className="bg-axiom-purple/5 border border-axiom-purple/20 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white font-bold">{String(order.targetItemType)}</span>
                                            <span className="text-axiom-gold font-black">{String(order.goldOffered)}g</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-gray-500 uppercase tracking-widest">Issuer: {String(order.requesterId)}</span>
                                            <button className="bg-axiom-cyan text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest hover:bg-white transition-all">Claim Order</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-6 p-4 bg-axiom-gold/5 border border-axiom-gold/20 rounded-xl italic text-[10px] text-axiom-gold/70 leading-relaxed">
                            MARKET LOGIC: Prices shift by 2% per transaction. High demand increases value. Specialists earn premium rates for axiomatic tier crafting.
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
