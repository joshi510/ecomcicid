import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, Skeleton } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { apiGet, getApiError } from '@/lib/api';
import { loadLocalOrder } from '@/lib/offline';
import { formatPrice } from '@/lib/media';
import { formatDate, orderBadgeVariant } from '@/lib/status';
import type { Order } from '@/lib/types';

export default function AccountOrderDetail() {
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
        if (local && active) {
          setOrder(local);
          return;
        }
        if (active) setError(getApiError(err, 'Order not found'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">{error}</p>
        <Link to="/account/orders" className="text-sm font-medium underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/account/orders" className="text-sm text-neutral-500">
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <Badge variant={orderBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-neutral-500">Placed {formatDate(order.createdAt)}</p>
      </div>
      <Card className="space-y-3">
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
      </Card>
      <Card>
        <p className="text-sm font-medium">Shipping to</p>
        <p className="mt-2 text-sm text-neutral-600">
          {order.shippingSnapshot.line1}
          {order.shippingSnapshot.line2 ? `, ${order.shippingSnapshot.line2}` : ''}
          <br />
          {order.shippingSnapshot.city}
          {order.shippingSnapshot.state ? `, ${order.shippingSnapshot.state}` : ''}{' '}
          {order.shippingSnapshot.postalCode}
        </p>
      </Card>
    </div>
  );
}
