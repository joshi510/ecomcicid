import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, Skeleton } from '@/components/ui';
import { apiGet, getApiError } from '@/lib/api';
import { formatPrice } from '@/lib/media';
import { formatDate, orderBadgeVariant } from '@/lib/status';

type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  orderCount: number;
  addressCount: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    createdAt: string;
  }>;
};

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<CustomerDetail>(`/admin/customers/${id}`)
      .then(setCustomer)
      .catch((err: unknown) => setError(getApiError(err, 'Customer not found')));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">{error}</p>
        <Link to="/admin/customers" className="text-sm underline">
          Back to customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/customers" className="text-sm text-neutral-500">
          ← Customers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{customer.name}</h1>
        <p className="text-sm text-neutral-500">
          {customer.email} · Joined {formatDate(customer.createdAt)}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Orders</p>
          <p className="mt-1 text-2xl font-semibold">{customer.orderCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Saved addresses</p>
          <p className="mt-1 text-2xl font-semibold">{customer.addressCount}</p>
        </Card>
      </div>
      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.length === 0 ? (
              <tr>
                <td className="px-5 py-4 text-neutral-500" colSpan={4}>
                  No orders yet.
                </td>
              </tr>
            ) : (
              customer.orders.map((order) => (
                <tr key={order.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-5 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={orderBadgeVariant(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-5 py-3">{formatPrice(order.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
