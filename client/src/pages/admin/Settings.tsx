import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/media';

type Settings = {
  storeName: string;
  clientUrl: string;
  currency: string;
  taxRate: number;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  stripeConfigured: boolean;
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    apiGet<Settings>('/admin/settings').then(setSettings).catch(() => setSettings(null));
  }, []);

  if (!settings) {
    return <Skeleton className="h-48 w-full" />;
  }

  const rows = [
    ['Store name', settings.storeName],
    ['Storefront URL', settings.clientUrl],
    ['Currency', settings.currency],
    ['Tax rate', `${(settings.taxRate * 100).toFixed(1)}%`],
    ['Flat shipping', formatPrice(settings.shippingFlatRate)],
    ['Free shipping over', formatPrice(settings.freeShippingThreshold)],
    ['Stripe', settings.stripeConfigured ? 'Configured' : 'Placeholder keys — payments will fail'],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500">
          Checkout and store values come from the server environment.
        </p>
      </div>
      <Card className="p-0">
        <dl>
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-2 gap-4 border-b border-neutral-100 px-5 py-3 text-sm last:border-0 dark:border-neutral-800"
            >
              <dt className="text-neutral-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
