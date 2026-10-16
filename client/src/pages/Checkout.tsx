import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { apiSend, getApiError } from '@/lib/api';
import { shippingSchema, type ShippingValues } from '@/lib/checkout-schema';
import { createLocalOrder, isApiOffline, isLocalOrder, saveLocalOrder } from '@/lib/offline';
import { formatPrice } from '@/lib/media';
import type { Order } from '@/lib/types';
import { estimateTotals } from '@/lib/totals';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/store/ui.store';

const STEPS = ['Shipping', 'Review'] as const;

export default function Checkout() {
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const promoCode = useCartStore((state) => state.promoCode);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const form = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
    },
  });

  useEffect(() => {
    closeDrawer();
  }, [closeDrawer]);

  const items = cart?.items ?? [];
  const estimate = estimateTotals(cart?.subtotal ?? 0);
  const empty = items.length === 0 && !order;

  const startCheckout = form.handleSubmit(async (values) => {
    if (order) {
      setStep(1);
      return;
    }
    setCreating(true);
    setFlowError(null);
    try {
      const created = await apiSend<Order>('/orders', {
        shippingAddress: {
          ...values,
          country: values.country.toUpperCase(),
          line2: values.line2 || undefined,
          state: values.state || undefined,
          phone: values.phone || undefined,
        },
        sameBillingAsShipping: true,
        couponCode: promoCode || undefined,
      });
      await apiSend('/payments/intents', { orderId: created.id });
      setOrder(created);
      await fetchCart();
      setStep(1);
    } catch (error) {
      if (isApiOffline(error) && cart && cart.items.length > 0) {
        const local = createLocalOrder(cart, values, promoCode);
        saveLocalOrder(local);
        setOrder(local);
        setStep(1);
      } else {
        setFlowError(getApiError(error, 'Could not start checkout'));
      }
    } finally {
      setCreating(false);
    }
  });

  if (empty) {
    return (
      <div className="space-y-3">
        <Seo title="Checkout" description="Complete your Northline order." path="/checkout" noindex />
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-neutral-500">
          Your cart is empty.{' '}
          <Link to="/products" className="font-medium underline">
            Add something first
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Seo title="Checkout" description="Complete your Northline order." path="/checkout" noindex />
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <ol className="mt-6 flex items-center gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-medium',
                index <= step
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-900',
              )}
            >
              {index + 1}
            </span>
            <span className={index === step ? 'font-medium' : 'text-neutral-500'}>{label}</span>
            {index < STEPS.length - 1 ? <span className="text-neutral-300">/</span> : null}
          </li>
        ))}
      </ol>

      {flowError ? <p className="text-danger-600 mt-4 text-sm">{flowError}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 0 ? (
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={startCheckout}>
              <div className="sm:col-span-2">
                <Input label="Address" error={form.formState.errors.line1?.message} {...form.register('line1')} />
              </div>
              <div className="sm:col-span-2">
                <Input label="Apartment, suite (optional)" {...form.register('line2')} />
              </div>
              <Input label="City" error={form.formState.errors.city?.message} {...form.register('city')} />
              <Input label="State" {...form.register('state')} />
              <Input
                label="Postal code"
                error={form.formState.errors.postalCode?.message}
                {...form.register('postalCode')}
              />
              <Input
                label="Country"
                hint="ISO code, e.g. US"
                error={form.formState.errors.country?.message}
                {...form.register('country')}
              />
              <div className="sm:col-span-2">
                <Input label="Phone (optional)" {...form.register('phone')} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Preparing order…' : 'Continue to review'}
                </Button>
              </div>
            </form>
          ) : null}

          {step > 0 && order ? (
            <PlaceOrder
              order={order}
              onBack={() => setStep(0)}
              onPaid={() => {
                if (isLocalOrder(order)) clearCart();
                else void fetchCart();
                navigate(`/orders/${order.id}/confirmed`);
              }}
            />
          ) : null}
        </div>

        <Card className="h-fit space-y-4">
          <h2 className="font-semibold">Summary</h2>
          {(order
            ? order.items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                lineTotal: item.lineTotal,
              }))
            : items.map((item) => ({
                id: item.id,
                name: item.product.name,
                quantity: item.quantity,
                lineTotal: item.lineTotal,
              }))
          ).map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-neutral-600">
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.lineTotal)}</span>
            </div>
          ))}
          {order ? (
            <OrderTotals
              subtotal={order.subtotal}
              discount={order.discountAmount}
              shipping={order.shippingAmount}
              tax={order.taxAmount}
              total={order.total}
            />
          ) : (
            <OrderTotals
              subtotal={estimate.subtotal}
              shipping={estimate.shipping}
              tax={estimate.tax}
              total={estimate.total}
            />
          )}
          {promoCode && !order ? (
            <p className="text-xs text-neutral-500">Promo {promoCode} will be applied on this order.</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function PlaceOrder({
  order,
  onBack,
  onPaid,
}: {
  order: Order;
  onBack: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shipping = useMemo(() => order.shippingSnapshot, [order.shippingSnapshot]);

  const place = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!isLocalOrder(order)) {
        await apiSend('/payments/intents/mock-confirm', { orderId: order.id });
      } else {
        saveLocalOrder({ ...order, status: 'PAID' });
      }
      toast({ variant: 'success', title: 'Order placed' });
      onPaid();
    } catch (err) {
      const message = getApiError(err, 'Could not place order');
      setError(message);
      toast({ variant: 'error', title: 'Checkout failed', message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-600">
        Card checkout is not enabled. Confirm the address and place the order — nothing will be charged.
      </p>
      <Card className="p-4">
        <p className="text-sm font-medium">Shipping to</p>
        <p className="mt-1 text-sm text-neutral-600">
          {shipping.line1}
          {shipping.line2 ? `, ${shipping.line2}` : ''}
          <br />
          {shipping.city}
          {shipping.state ? `, ${shipping.state}` : ''} {shipping.postalCode}
          <br />
          {shipping.country}
        </p>
      </Card>
      {error ? <p className="text-danger-600 text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button onClick={() => void place()} disabled={busy}>
          {busy ? 'Placing order…' : `Place order · ${formatPrice(order.total)}`}
        </Button>
      </div>
    </div>
  );
}
