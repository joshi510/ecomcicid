import axios from 'axios';
import { estimateTotals } from '@/lib/totals';
import type { Cart, Order } from '@/lib/types';
import type { ShippingValues } from '@/lib/checkout-schema';

const LOCAL_ORDERS_KEY = 'ecom-local-orders';

export function isApiOffline(error: unknown) {
  if (error instanceof Error && error.message === 'Invalid API response') {
    return true;
  }
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (!status) return true;
  const data = error.response?.data;
  if (typeof data === 'string') return true;
  if (data && typeof data === 'object' && 'success' in data) {
    return false;
  }
  return status === 404 || status === 405 || status >= 500;
}

export function isLocalOrder(order: Pick<Order, 'id' | 'orderNumber'>) {
  return order.id.startsWith('local-') || order.orderNumber.startsWith('ORD-LOCAL-');
}

export function createLocalOrder(cart: Cart, shipping: ShippingValues, promoCode?: string): Order {
  const totals = estimateTotals(cart.subtotal);
  const createdAt = new Date().toISOString();
  const stamp = createdAt.slice(0, 10).replaceAll('-', '');
  const id = `local-${crypto.randomUUID()}`;
  const snapshot = {
    line1: shipping.line1,
    line2: shipping.line2 ?? null,
    city: shipping.city,
    state: shipping.state ?? null,
    postalCode: shipping.postalCode,
    country: shipping.country.toUpperCase(),
    phone: shipping.phone ?? null,
  };

  return {
    id,
    orderNumber: `ORD-LOCAL-${stamp}-${id.slice(-6).toUpperCase()}`,
    status: 'PENDING',
    subtotal: totals.subtotal.toFixed(2),
    discountAmount: totals.discount.toFixed(2),
    shippingAmount: totals.shipping.toFixed(2),
    taxAmount: totals.tax.toFixed(2),
    total: totals.total.toFixed(2),
    currency: 'USD',
    coupon: promoCode ? { id: 'local-coupon', code: promoCode } : null,
    shippingSnapshot: snapshot,
    billingSnapshot: snapshot,
    items: cart.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      sku: item.product.sku ?? item.product.slug,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    createdAt,
  };
}

export function saveLocalOrder(order: Order) {
  const all = loadLocalOrders();
  all[order.id] = order;
  sessionStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(all));
}

export function loadLocalOrder(id: string) {
  return loadLocalOrders()[id] ?? null;
}

function loadLocalOrders() {
  try {
    const raw = sessionStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return {} as Record<string, Order>;
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {} as Record<string, Order>;
  }
}
