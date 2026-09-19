import Stripe from 'stripe';
import { env } from '../config/env.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function looksLikePlaceholder(value: string) {
  return /replace/i.test(value) || value.length < 20;
}

export function isStripeConfigured(
  secret = env.STRIPE_SECRET_KEY,
  publishable = env.STRIPE_PUBLISHABLE_KEY,
) {
  const secretOk = /^sk_(test|live)_/.test(secret) && !looksLikePlaceholder(secret);
  const publishableOk = /^pk_(test|live)_/.test(publishable) && !looksLikePlaceholder(publishable);
  return secretOk && publishableOk;
}
