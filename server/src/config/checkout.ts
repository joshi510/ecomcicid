import { env } from './env.js';

export const checkoutConfig = {
  taxRate: env.TAX_RATE,
  shippingFlatRate: env.SHIPPING_FLAT_RATE,
  freeShippingThreshold: env.FREE_SHIPPING_THRESHOLD,
  currency: 'USD',
} as const;
