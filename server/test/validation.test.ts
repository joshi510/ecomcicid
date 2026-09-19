import { addCartItemSchema } from '../src/schemas/cart.schema.js';
import { registerSchema } from '../src/schemas/auth.schema.js';
import { createOrderSchema } from '../src/schemas/order.schema.js';
import { moneyString } from '../src/utils/money.js';

describe('request validation (no database)', () => {
  it('rejects a weak registration password', () => {
    const parsed = registerSchema.safeParse({
      body: { name: 'Ada', email: 'ada@example.com', password: 'password' },
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a strong registration payload', () => {
    const parsed = registerSchema.safeParse({
      body: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Testpass1!' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a non-uuid product id in the cart', () => {
    const parsed = addCartItemSchema.safeParse({
      body: { productId: 'not-a-uuid', quantity: 1 },
    });
    expect(parsed.success).toBe(false);
  });

  it('requires a shipping address when creating an order', () => {
    const parsed = createOrderSchema.safeParse({
      body: { sameBillingAsShipping: true },
    });
    expect(parsed.success).toBe(false);
  });

  it('formats money to two decimal places', () => {
    expect(moneyString('19.9')).toBe('19.90');
  });
});
