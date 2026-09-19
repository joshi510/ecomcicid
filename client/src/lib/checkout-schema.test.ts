import { describe, expect, it } from 'vitest';
import { shippingSchema } from './checkout-schema';

describe('shippingSchema', () => {
  it('accepts a complete shipping address', () => {
    const parsed = shippingSchema.safeParse({
      line1: '100 Market Street',
      city: 'Austin',
      postalCode: '78701',
      country: 'US',
    });
    expect(parsed.success).toBe(true);
  });

  it('requires street, city, postal code, and a 2-letter country', () => {
    const parsed = shippingSchema.safeParse({
      line1: '',
      city: '',
      postalCode: '1',
      country: 'USA',
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const messages = parsed.error.issues.map((issue) => issue.message);
    expect(messages).toContain('Street address is required');
    expect(messages).toContain('City is required');
    expect(messages).toContain('Postal code is required');
    expect(messages).toContain('Use a 2-letter country code');
  });
});
