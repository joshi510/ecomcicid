import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Skeleton } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { apiGet, getApiError } from '@/lib/api';
import { loadLocalOrder } from '@/lib/offline';
import { formatPrice } from '@/lib/media';
import type { Order } from '@/lib/types';

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    apiGet<Order>(`/orders/${id}`)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err: unknown) => {
        const local = loadLocalOrder(id);
        if (local) {
          if (active) setOrder({ ...local, status: 'PAID' });
          return;
        }
        if (active) setError(getApiError(err, 'Order not found'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  const deliveryWindow = useMemo(() => {
    if (!order) return null;
    return `${addDays(order.createdAt, 5)} – ${addDays(order.createdAt, 8)}`;
  }, [order]);

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">We could not load this order</h1>
        <p className="text-sm text-neutral-500">{error}</p>
        <Link to="/account/orders" className="text-sm font-medium underline">
          View your orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-primary-600 text-sm font-medium">Order confirmed</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Thank you</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Order <span className="font-medium text-neutral-800 dark:text-neutral-200">{order.orderNumber}</span>{' '}
          is {order.status.toLowerCase()}. Estimated delivery {deliveryWindow}.
        </p>
      </div>
      <Card className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.lineTotal)}</span>
          </div>
        ))}
        <OrderTotals
          subtotal={order.subtotal}
          discount={order.discountAmount}
          shipping={order.shippingAmount}
          tax={order.taxAmount}
          total={order.total}
        />
        <div className="text-sm text-neutral-500">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">Ships to</p>
          <p className="mt-1">
            {order.shippingSnapshot.line1}
            {order.shippingSnapshot.line2 ? `, ${order.shippingSnapshot.line2}` : ''}
            <br />
            {order.shippingSnapshot.city}
            {order.shippingSnapshot.state ? `, ${order.shippingSnapshot.state}` : ''}{' '}
            {order.shippingSnapshot.postalCode}
          </p>
        </div>
      </Card>
      <div className="flex gap-2">
        <Link to="/account/orders">
          <Button variant="outline">View orders</Button>
        </Link>
        <Link to="/products">
          <Button>Keep shopping</Button>
        </Link>
      </div>
    </div>
  );
}
