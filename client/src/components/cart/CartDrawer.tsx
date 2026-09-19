import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatPrice, mediaUrl } from '@/lib/media';
import { useCartStore } from '@/store/cart.store';
import { QuantityStepper } from '@/components/product/QuantityStepper';

export function CartDrawer() {
  const cart = useCartStore((state) => state.cart);
  const open = useCartStore((state) => state.drawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDrawer]);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);

  if (!open) return null;

  const items = cart?.items ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/40"
        aria-label="Close cart"
        onClick={closeDrawer}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-popover dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="font-semibold">Your cart</h2>
          <button type="button" onClick={closeDrawer} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={mediaUrl(item.product.images[0])}
                  alt={item.product.name}
                  className="size-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-neutral-500">{formatPrice(item.unitPrice)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.product.stockQuantity}
                      onChange={(qty) => void updateQty(item.id, qty)}
                    />
                    <button
                      type="button"
                      className="text-xs text-danger-600"
                      onClick={() => void removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-3 border-t border-neutral-200 p-5 dark:border-neutral-800">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">{formatPrice(cart?.subtotal ?? 0)}</span>
          </div>
          <Link to="/cart" onClick={closeDrawer}>
            <Button variant="outline" className="w-full">
              View cart
            </Button>
          </Link>
          <Link to="/checkout" onClick={closeDrawer}>
            <Button className="w-full">Checkout</Button>
          </Link>
        </div>
      </aside>
    </div>
  );
}
