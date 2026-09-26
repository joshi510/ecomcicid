import type { Order } from '@/lib/types';

export type StripeIntent = {
  clientSecret: string;
  publishableKey: string;
  mock: false;
};

const PUBLISHABLE =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

export async function createStripePaymentIntent(order: Order): Promise<StripeIntent> {
  const response = await fetch('/.netlify/functions/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: order.total,
      currency: order.currency || 'usd',
      orderId: order.id,
      orderNumber: order.orderNumber,
    }),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: { clientSecret?: string; publishableKey?: string };
    message?: string;
  };

  const clientSecret = payload.data?.clientSecret;
  const publishableKey = payload.data?.publishableKey || PUBLISHABLE;

  if (!response.ok || !clientSecret || !publishableKey) {
    throw new Error(payload.message ?? 'Could not start Stripe payment');
  }

  return { clientSecret, publishableKey, mock: false };
}
