import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useForm } from 'react-hook-form';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { apiSend, getApiError } from '@/lib/api';
import { shippingSchema, type ShippingValues } from '@/lib/checkout-schema';
import { formatPrice } from '@/lib/media';
import type { Order } from '@/lib/types';
import { estimateTotals } from '@/lib/totals';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/store/ui.store';

const STEPS = ['Shipping', 'Payment', 'Review'] as const;

type IntentPayload = {
  clientSecret?: string | null;
  publishableKey?: string;
  mock?: boolean;
};

const stripeCache = new Map<string, Promise<Stripe | null>>();

function stripePromise(key: string) {
  const existing = stripeCache.get(key);
  if (existing) return existing;
  const promise = loadStripe(key);
  stripeCache.set(key, promise);
  return promise;
}

export default function Checkout() {
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const promoCode = useCartStore((state) => state.promoCode);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [intent, setIntent] = useState<IntentPayload | null>(null);
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

  const startPayment = form.handleSubmit(async (values) => {
    if (order && intent) {
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
      const payment = await apiSend<IntentPayload>('/payments/intents', { orderId: created.id });
      setOrder(created);
      setIntent(payment);
      await fetchCart();
      setStep(1);
    } catch (error) {
      setFlowError(getApiError(error, 'Could not start checkout'));
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
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={startPayment}>
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
                  {creating ? 'Preparing payment…' : 'Continue to payment'}
                </Button>
              </div>
            </form>
          ) : null}

          {step > 0 && intent?.mock && order ? (
            <LocalTestPayment
              step={step}
              order={order}
              onBack={() => setStep((value) => Math.max(0, value - 1))}
              onContinue={() => setStep(2)}
              onPaid={() => {
                void fetchCart();
                navigate(`/orders/${order.id}/confirmed`);
              }}
            />
          ) : null}

          {step > 0 && intent && !intent.mock && intent.clientSecret && intent.publishableKey ? (
            <Elements
              stripe={stripePromise(intent.publishableKey)}
              options={{
                clientSecret: intent.clientSecret,
                appearance: {
                  theme: document.documentElement.classList.contains('dark') ? 'night' : 'stripe',
                },
              }}
            >
              <StripeSteps
                step={step}
                order={order!}
                onBack={() => setStep((value) => Math.max(0, value - 1))}
                onContinue={() => setStep(2)}
                onPaid={() => {
                  void fetchCart();
                  navigate(`/orders/${order!.id}/confirmed`);
                }}
              />
            </Elements>
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

function LocalTestPayment({
  step,
  order,
  onBack,
  onContinue,
  onPaid,
}: {
  step: number;
  order: Order;
  onBack: () => void;
  onContinue: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shipping = useMemo(() => order.shippingSnapshot, [order.shippingSnapshot]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend('/payments/intents/mock-confirm', { orderId: order.id });
      toast({ variant: 'success', title: 'Test payment received' });
      onPaid();
    } catch (err) {
      const message = getApiError(err, 'Could not complete test payment');
      setError(message);
      toast({ variant: 'error', title: 'Payment failed', message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-600">
        Stripe test keys are not configured, so this is a local test checkout. No card will be
        charged.
      </p>
      {step === 2 ? (
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
      ) : null}
      {error ? <p className="text-danger-600 text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Back
        </Button>
        {step === 1 ? (
          <Button onClick={onContinue} disabled={busy}>
            Continue to review
          </Button>
        ) : (
          <Button onClick={() => void pay()} disabled={busy}>
            {busy ? 'Confirming payment…' : `Pay ${formatPrice(order.total)}`}
          </Button>
        )}
      </div>
    </div>
  );
}

function StripeSteps({
  step,
  order,
  onBack,
  onContinue,
  onPaid,
}: {
  step: number;
  order: Order;
  onBack: () => void;
  onContinue: () => void;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shipping = useMemo(() => order.shippingSnapshot, [order.shippingSnapshot]);

  const goReview = async () => {
    if (!elements) return;
    setBusy(true);
    setError(null);
    const result = await elements.submit();
    if (result.error) {
      setError(result.error.message ?? 'Check your card details');
      setBusy(false);
      return;
    }
    setBusy(false);
    onContinue();
  };

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${order.id}/confirmed`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setBusy(false);
      toast({ variant: 'error', title: 'Payment failed', message: result.error.message });
      return;
    }
    toast({ variant: 'success', title: 'Payment received' });
    onPaid();
  };

  return (
    <div className="space-y-5">
      {step === 2 ? (
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
      ) : null}
      <PaymentElement />
      {error ? <p className="text-danger-600 text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Back
        </Button>
        {step === 1 ? (
          <Button onClick={() => void goReview()} disabled={!stripe || busy}>
            {busy ? 'Checking card…' : 'Continue to review'}
          </Button>
        ) : (
          <Button onClick={() => void pay()} disabled={!stripe || busy}>
            {busy ? 'Confirming payment…' : `Pay ${formatPrice(order.total)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
