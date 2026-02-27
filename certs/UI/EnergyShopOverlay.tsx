import { useState } from 'react';
import { useStore } from '../../store';
import { MATRIX_ENERGY_PRODUCTS, STRUCTURE_COSTS, StoreProduct } from '../../types';
import { PayPalModal } from './PayPalModal';
import { soundManager } from '../../services/SoundManager';
import { X, Minus, Zap, Building2, ShoppingBag } from 'lucide-react';

export const EnergyShopOverlay = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const minimizeWindow = useStore(state => state.minimizeWindow);
  const matrixEnergy = useStore(state => state.matrixEnergy);
  const purchaseEnergy = useStore(state => state.purchaseEnergy);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [showPayPal, setShowPayPal] = useState(false);

  const handleBuy = (product: StoreProduct) => {
    setSelectedProduct(product);
    setShowPayPal(true);
    soundManager.playUI('CLICK');
  };

  const handlePayPalSuccess = (product: StoreProduct) => {
    purchaseEnergy(product);
  };

  const handlePayPalClose = () => {
    setShowPayPal(false);
    setSelectedProduct(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
        <div className="bg-gradient-to-br from-gray-900/98 via-gray-950/98 to-black/98 border border-yellow-500/20 rounded-2xl w-full max-w-lg shadow-2xl shadow-yellow-900/20 pointer-events-auto backdrop-blur-xl max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-white font-black text-sm uppercase tracking-[0.3em]">Matrix Energy</h2>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30 font-bold flex items-center gap-1">
                <Zap size={10} /> {matrixEnergy} ME
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => minimizeWindow('ENERGY_SHOP')} className="text-gray-500 hover:text-white transition-colors"><Minus size={14} /></button>
              <button onClick={() => toggleWindow('ENERGY_SHOP', false)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={14} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            <div>
              <h3 className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShoppingBag size={12} /> Energy Packs
              </h3>
              <div className="space-y-2">
                {MATRIX_ENERGY_PRODUCTS.map(product => (
                  <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-yellow-500/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/20">
                        <Zap className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{product.name}</p>
                        <p className="text-[10px] text-gray-500">{product.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuy(product)}
                      className="bg-yellow-600 hover:bg-yellow-500 text-black font-black text-[10px] px-4 py-2 rounded-lg uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-yellow-900/30"
                    >
                      €{product.priceEUR.toFixed(2)}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Building2 size={12} /> Building Costs
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(STRUCTURE_COSTS) as [string, number][]).map(([type, cost]) => (
                  <div key={type} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-[10px] font-bold">{type.replace('_', ' ')}</p>
                      <p className="text-[8px] text-gray-500">Structure</p>
                    </div>
                    <span className="text-yellow-400 text-[10px] font-bold flex items-center gap-1">
                      <Zap size={10} /> {cost} ME
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider mb-2">How Matrix Energy Works</p>
              <ul className="space-y-1 text-[10px] text-gray-400">
                <li>• Matrix Energy (ME) is the universal currency for building structures</li>
                <li>• Each structure type has a fixed ME cost to construct</li>
                <li>• ME is also consumed by advanced AI actions and world interactions</li>
                <li>• Purchase energy packs via PayPal to refill your reserves</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <PayPalModal isOpen={showPayPal} onClose={handlePayPalClose} product={selectedProduct} onSuccess={handlePayPalSuccess} />
    </>
  );
};
