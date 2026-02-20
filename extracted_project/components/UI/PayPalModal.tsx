
import React, { useState } from 'react';
import { useStore } from '../../store';
import { StoreProduct } from '../../types';

export const PayPalModal = ({ isOpen, onClose, product }: { isOpen: boolean; onClose: () => void; product: StoreProduct | null }) => {
    const [loading, setLoading] = useState(false);
    const purchaseProduct = useStore(state => state.purchaseProduct);

    if (!isOpen || !product) return null;

    const handleMockPayment = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (product) {
                purchaseProduct(product.id);
            }
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center pointer-events-auto backdrop-blur-sm p-4">
            <div className="bg-white text-black p-8 rounded-[2rem] w-full max-w-sm shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors">✕</button>
                
                <div className="flex items-center justify-center mb-8">
                    <span className="text-blue-900 font-bold italic text-3xl">Pay</span>
                    <span className="text-blue-500 font-bold italic text-3xl">Pal</span>
                </div>

                <div className="text-center mb-8">
                    <h3 className="font-serif font-black text-xl mb-2 uppercase tracking-tight">Confirm Neural Grant</h3>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                        You are authorizing a transfer to the Ouroboros Collective for:
                        <br/><span className="font-bold text-black">"{String(product.name)}"</span>
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between p-5 border-2 border-blue-50 bg-blue-50/30 rounded-2xl items-center">
                        <div>
                            <span className="text-[10px] text-blue-600 font-black uppercase block tracking-widest">Order Summary</span>
                            <span className="font-bold text-sm">{String(product.name)}</span>
                        </div>
                        <span className="font-black text-xl">€{String(product.priceEUR.toFixed(2))}</span>
                    </div>
                </div>

                <button 
                    onClick={handleMockPayment}
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl font-black text-xs transition-all flex justify-center items-center gap-3 uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] ${
                        loading ? 'bg-gray-100 text-gray-400' : 'bg-[#0070ba] hover:bg-[#005ea6] text-white shadow-blue-900/20'
                    }`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Verifying...
                        </>
                    ) : `Complete Payment`}
                </button>
                
                <p className="text-[9px] text-gray-400 text-center mt-6 uppercase font-bold tracking-widest opacity-60">
                    Axiomatic Sandbox Environment • No Charge
                </p>
            </div>
        </div>
    );
};
