import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Skeleton } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/media';
import { formatDate, orderBadgeVariant } from '@/lib/status';
import type { Order, Pagination } from '@/lib/types';

export default function AccountOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGet<{ orders: Order[]; pagination: Pagination }>('/orders?limit=20')
      .then((data) => {
        if (active) setOrders(data.orders);
      })
      .catch(() => {
        if (active) setOrders([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-neutral-500">Track shipments and revisit past purchases.</p>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No orders yet.{' '}
          <Link to="/products" className="font-medium underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/account/orders/${order.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(order.createdAt)} · {order.items.length} item
                    {order.items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={orderBadgeVariant(order.status)}>{order.status}</Badge>
                  <p className="text-sm font-medium">{formatPrice(order.total)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
