
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { StoreProduct } from '../../types';

declare global {
  interface Window {
    paypal?: any;
  }
}

function loadPayPalScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }
    const existing = document.getElementById('paypal-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&intent=capture`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
}

export const PayPalModal = ({ isOpen, onClose, product, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProduct | null;
  onSuccess?: (product: StoreProduct) => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);
  const purchaseProduct = useStore(state => state.purchaseProduct);

  useEffect(() => {
    if (!isOpen || !product) return;
    setLoading(true);
    setError('');
    setPaymentComplete(false);
    buttonsRendered.current = false;

    fetch('/api/paypal/client-id')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        return loadPayPalScript(data.clientId);
      })
      .then(() => {
        setSdkReady(true);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to initialize PayPal');
        setLoading(false);
      });
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!sdkReady || !isOpen || !product || !buttonContainerRef.current || !window.paypal || buttonsRendered.current) return;

    buttonsRendered.current = true;
    buttonContainerRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
        height: 45,
      },
      createOrder: async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.orderID;
      },
      onApprove: async (data: any) => {
        setLoading(true);
        try {
          const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID }),
          });
          const captureData = await res.json();
          if (captureData.error) throw new Error(captureData.error);

          if (captureData.success) {
            setPaymentComplete(true);
            if (onSuccess) {
              onSuccess(product);
            } else {
              purchaseProduct(product.id);
            }
            setTimeout(() => onClose(), 2500);
          }
        } catch (err: any) {
          setError(err.message || 'Payment capture failed');
        }
        setLoading(false);
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        setError('PayPal encountered an error. Please try again.');
      },
      onCancel: () => {
        setError('');
      },
    }).render(buttonContainerRef.current);
  }, [sdkReady, isOpen, product?.id]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center pointer-events-auto backdrop-blur-sm p-4">
      <div className="bg-white text-black p-8 rounded-[2rem] w-full max-w-sm shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors">✕</button>

        <div className="flex items-center justify-center mb-8">
          <span className="text-blue-900 font-bold italic text-3xl">Pay</span>
          <span className="text-blue-500 font-bold italic text-3xl">Pal</span>
        </div>

        {paymentComplete ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✓</div>
            <h3 className="font-serif font-black text-xl mb-2 text-green-700 uppercase tracking-tight">Payment Complete</h3>
            <p className="text-sm text-gray-500">
              {String(product.name)} has been credited to your account.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="font-serif font-black text-xl mb-2 uppercase tracking-tight">Confirm Neural Grant</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                You are authorizing a transfer to the Ouroboros Collective for:
                <br /><span className="font-bold text-black">"{String(product.name)}"</span>
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between p-5 border-2 border-blue-50 bg-blue-50/30 rounded-2xl items-center">
                <div>
                  <span className="text-[10px] text-blue-600 font-black uppercase block tracking-widest">Order Summary</span>
                  <span className="font-bold text-sm">{String(product.name)}</span>
                </div>
                <span className="font-black text-xl">€{String(product.priceEUR.toFixed(2))}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-center">
                {error}
              </div>
            )}

            {loading && !error ? (
              <div className="flex justify-center items-center py-6">
                <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <div ref={buttonContainerRef} className="min-h-[50px]" />
            )}

            <p className="text-[9px] text-gray-400 text-center mt-6 uppercase font-bold tracking-widest opacity-60">
              Secured by PayPal • Ouroboros Collective
            </p>
          </>
        )}
      </div>
    </div>
  );
};
