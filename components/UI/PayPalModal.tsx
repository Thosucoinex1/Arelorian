import React, { useState } from 'react';
import { useStore } from '../../store';

export const PayPalModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [loading, setLoading] = useState(false);
    const { addLog } = useStore();

    if (!isOpen) return null;

    const handleMockPayment = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            useStore.setState((state) => ({
                notaryBalance: state.notaryBalance + 500
            }));
            addLog("Funds secured via PayPal (Sandbox). +500 Credits.", 'TRADE');
            onClose();
        }, 1500);
    };

    return (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center pointer-events-auto">
            <div className="bg-white text-black p-6 rounded-lg w-96 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-black">✕</button>
                
                <div className="flex items-center justify-center mb-6">
                    <span className="text-blue-700 font-bold italic text-2xl">Pay</span>
                    <span className="text-blue-400 font-bold italic text-2xl">Pal</span>
                </div>

                <h3 className="text-center font-bold text-lg mb-2">Purchase Credits</h3>
                <p className="text-center text-sm text-gray-600 mb-6">Secure your holdings in Ouroboros.</p>

                <div className="space-y-3">
                    <div className="flex justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer">
                        <span>500 Credits</span>
                        <span className="font-bold">$4.99</span>
                    </div>
                </div>

                <button 
                    onClick={handleMockPayment}
                    disabled={loading}
                    className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors flex justify-center items-center"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Pay Now'}
                </button>
                
                <p className="text-[10px] text-gray-400 text-center mt-4">
                    This is a simulation. No real money is processed.
                </p>
            </div>
        </div>
    );
};