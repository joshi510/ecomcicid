import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { OrderTotals } from '@/components/cart/OrderTotals';
import { apiGet, apiSend, getApiError } from '@/lib/api';
import { formatPrice } from '@/lib/media';
import { formatDate, ORDER_STATUSES, orderBadgeVariant } from '@/lib/status';
import type { Order, Pagination } from '@/lib/types';
import { toast } from '@/store/ui.store';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (nextPage = page) => {
    const params = new URLSearchParams({ page: String(nextPage), limit: '20' });
    if (status) params.set('status', status);
    if (query) params.set('q', query);
    setLoading(true);
    apiGet<{ orders: Order[]; pagination: Pagination }>(`/admin/orders?${params}`)
      .then((data) => {
        setOrders(data.orders);
        setPagination(data.pagination);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function changeStatus(orderId: string, next: string) {
    try {
      const updated = await apiSend<Order>(`/admin/orders/${orderId}/status`, { status: next }, 'patch');
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setSelected(updated);
      toast({ variant: 'success', title: 'Order updated' });
    } catch (error) {
      toast({ variant: 'error', title: 'Could not update status', message: getApiError(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-neutral-500">{pagination?.total ?? 0} total</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          name="order-search"
          placeholder="Order number"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            load(1);
          }}
        >
          Search
        </Button>
        <select
          className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={5}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => setSelected(order)}
                >
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.user?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={orderBadgeVariant(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatPrice(order.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-950/40"
            aria-label="Close order"
            onClick={() => setSelected(null)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-popover dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div>
                <p className="font-semibold">{selected.orderNumber}</p>
                <p className="text-xs text-neutral-500">{selected.user?.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Status</span>
                <select
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                  value={selected.status}
                  onChange={(event) => void changeStatus(selected.id, event.target.value)}
                >
                  {ORDER_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <Card className="space-y-2 p-4">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
                <OrderTotals
                  subtotal={selected.subtotal}
                  discount={selected.discountAmount}
                  shipping={selected.shippingAmount}
                  tax={selected.taxAmount}
                  total={selected.total}
                />
              </Card>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
