import { Router, Request, Response } from 'express';

const router = Router();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';

const PAYPAL_API_BASE = PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const PRODUCTS: Record<string, { name: string; amount: string; energy: number }> = {
  'ENERGY_100': { name: '100 Matrix Energy', amount: '0.99', energy: 100 },
  'ENERGY_500': { name: '500 Matrix Energy', amount: '3.99', energy: 500 },
  'ENERGY_2000': { name: '2000 Matrix Energy', amount: '9.99', energy: 2000 },
};

async function getAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = await res.json() as any;
  return data.access_token;
}

router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: productId,
          description: product.name,
          amount: {
            currency_code: 'EUR',
            value: product.amount,
          },
        }],
        application_context: {
          brand_name: 'Ouroboros: Neural Emergence',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      console.error('PayPal create order failed:', text);
      return res.status(500).json({ error: 'Failed to create PayPal order' });
    }

    const orderData = await orderRes.json() as any;
    return res.json({ orderID: orderData.id });
  } catch (err: any) {
    console.error('PayPal create-order error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/capture-order', async (req: Request, res: Response) => {
  try {
    const { orderID } = req.body;
    if (!orderID) {
      return res.status(400).json({ error: 'Missing orderID' });
    }

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const text = await captureRes.text();
      console.error('PayPal capture failed:', text);
      return res.status(500).json({ error: 'Failed to capture PayPal order' });
    }

    const captureData = await captureRes.json() as any;

    if (captureData.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed', status: captureData.status });
    }

    const refId = captureData.purchase_units?.[0]?.reference_id;
    const product = PRODUCTS[refId];
    const energy = product?.energy || 0;
    const capturedAmount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount;

    console.log(`PayPal payment captured: Order ${orderID}, Product ${refId}, Energy ${energy}, Amount ${capturedAmount?.value} ${capturedAmount?.currency_code}`);

    return res.json({
      success: true,
      productId: refId,
      energy,
      orderID: captureData.id,
      payerEmail: captureData.payer?.email_address,
    });
  } catch (err: any) {
    console.error('PayPal capture-order error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/client-id', (_req: Request, res: Response) => {
  if (!PAYPAL_CLIENT_ID) {
    return res.status(500).json({ error: 'PayPal not configured' });
  }
  return res.json({ clientId: PAYPAL_CLIENT_ID, mode: PAYPAL_MODE });
});

export default router;
