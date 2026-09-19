import { formatPrice } from '@/lib/media';

export function OrderTotals({
  subtotal,
  discount = 0,
  shipping,
  tax,
  total,
}: {
  subtotal: string | number;
  discount?: string | number;
  shipping: string | number;
  tax: string | number;
  total: string | number;
}) {
  const discountValue = Number(discount) || 0;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-neutral-500">Subtotal</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      {discountValue > 0 ? (
        <div className="flex justify-between text-success-700">
          <dt>Discount</dt>
          <dd>−{formatPrice(discountValue)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-neutral-500">Shipping</dt>
        <dd>{Number(shipping) === 0 ? 'Free' : formatPrice(shipping)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-neutral-500">Tax</dt>
        <dd>{formatPrice(tax)}</dd>
      </div>
      <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-800">
        <dt>Total</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
