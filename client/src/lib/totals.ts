const TAX_RATE = 0.08;
const SHIPPING_FLAT = 9.99;
const FREE_SHIPPING_AT = 75;

export function estimateTotals(subtotalValue: string | number, discount = 0) {
  const subtotal = typeof subtotalValue === 'number' ? subtotalValue : Number(subtotalValue) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  const shipping = taxable >= FREE_SHIPPING_AT ? 0 : SHIPPING_FLAT;
  const tax = taxable * TAX_RATE;
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: taxable + shipping + tax,
    freeShippingAt: FREE_SHIPPING_AT,
  };
}
