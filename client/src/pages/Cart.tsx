import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { formatPrice, mediaUrl } from '@/lib/media';
import { estimateTotals } from '@/lib/totals';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/store/ui.store';

export default function CartPage() {
  const cart = useCartStore((state) => state.cart);
  const promoCode = useCartStore((state) => state.promoCode);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const [draft, setDraft] = useState(promoCode);
  const items = cart?.items ?? [];
  const totals = estimateTotals(cart?.subtotal ?? 0);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  return (
    <div>
      <Seo title="Cart" description="Review items in your Northline cart." path="/cart" noindex />
      <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Your cart is empty.{' '}
          <Link to="/products" className="font-medium underline">
            Continue shopping
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="flex gap-4 p-4">
                <img
                  src={mediaUrl(item.product.images[0])}
                  alt={item.product.name}
                  className="size-24 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${item.product.slug}`} className="font-medium">
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-neutral-500">{formatPrice(item.unitPrice)}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.product.stockQuantity}
                      onChange={(qty) => void updateQty(item.id, qty)}
                    />
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-medium">{formatPrice(item.lineTotal)}</p>
                      <button
                        type="button"
                        className="text-danger-600 text-sm"
                        onClick={() => void removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="h-fit space-y-5">
            <h2 className="font-semibold">Order summary</h2>
            <OrderTotals
              subtotal={totals.subtotal}
              shipping={totals.shipping}
              tax={totals.tax}
              total={totals.total}
            />
            <p className="text-xs text-neutral-500">
              Free shipping over {formatPrice(totals.freeShippingAt)}. Promo codes apply at checkout.
            </p>
            <div className="flex gap-2">
              <Input
                name="promo"
                placeholder="Promo code"
                value={draft}
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                onClick={() => {
                  setPromoCode(draft.trim());
                  toast({
                    variant: 'info',
                    title: draft.trim() ? 'Code saved' : 'Promo cleared',
                    message: draft.trim()
                      ? 'We’ll apply this when you place the order.'
                      : undefined,
                  });
                }}
              >
                Apply
              </Button>
            </div>
            {promoCode ? <p className="text-xs text-neutral-500">Saved code: {promoCode}</p> : null}
            <Link to="/checkout">
              <Button className="w-full">Checkout</Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
