import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, Skeleton } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/media';

type Stats = {
  revenue: string;
  orders: number;
  customers: number;
  lowStockCount: number;
  lowStock: Array<{ id: string; name: string; sku: string; stockQuantity: number }>;
  salesOverTime: Array<{ date: string; revenue: number; orders: number }>;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Stats>('/admin/stats')
      .then(setStats)
      .catch(() => setError('Could not load dashboard metrics.'));
  }, []);

  if (error) {
    return <p className="text-danger-600 text-sm">{error}</p>;
  }

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Revenue', value: formatPrice(stats.revenue) },
    { label: 'Orders', value: String(stats.orders) },
    { label: 'Customers', value: String(stats.customers) },
    { label: 'Low stock', value: String(stats.lowStockCount) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Store performance for the last 30 days.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <p className="mb-4 text-sm font-medium">Sales over time</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.salesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'revenue' ? formatPrice(Number(value)) : String(value)
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#635BFF"
                fill="#635BFF"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Low-stock alerts</p>
          <Link to="/admin/products" className="text-xs text-neutral-500 underline">
            Manage products
          </Link>
        </div>
        {stats.lowStock.length === 0 ? (
          <p className="text-sm text-neutral-500">All active products are above the threshold.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">SKU</th>
                <th className="pb-2 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStock.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-2">{product.name}</td>
                  <td className="py-2 text-neutral-500">{product.sku}</td>
                  <td className="py-2">{product.stockQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
