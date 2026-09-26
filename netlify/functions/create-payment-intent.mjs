const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: cors, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, message: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY ?? '';
  const publishable =
    process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

  if (!/^sk_(test|live)_/.test(secret) || /replace/i.test(secret)) {
    return json(503, { success: false, message: 'Stripe secret key is not configured' });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { success: false, message: 'Invalid JSON body' });
  }

  const amountCents = Math.round(Number(payload.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return json(400, { success: false, message: 'Invalid payment amount' });
  }

  const params = new URLSearchParams();
  params.set('amount', String(amountCents));
  params.set('currency', String(payload.currency || 'usd').toLowerCase());
  params.set('automatic_payment_methods[enabled]', 'true');
  if (payload.orderId) params.set('metadata[orderId]', String(payload.orderId));
  if (payload.orderNumber) params.set('metadata[orderNumber]', String(payload.orderNumber));

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const intent = await stripeRes.json();

  if (!stripeRes.ok || !intent.client_secret) {
    return json(502, {
      success: false,
      message: intent.error?.message ?? 'Could not create Stripe payment',
    });
  }

  return json(200, {
    success: true,
    data: {
      clientSecret: intent.client_secret,
      publishableKey: publishable,
      mock: false,
    },
  });
}
