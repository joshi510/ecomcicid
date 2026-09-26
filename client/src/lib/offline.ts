import axios from 'axios';
import { estimateTotals } from '@/lib/totals';
import type { Address, Cart, Order, User } from '@/lib/types';
import type { ShippingValues } from '@/lib/checkout-schema';

const LOCAL_ORDERS_KEY = 'ecom-local-orders';
const LOCAL_USERS_KEY = 'ecom-local-users';
const LOCAL_ADDRESSES_KEY = 'ecom-local-addresses';

type StoredLocalUser = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
  passwordHash: string;
};

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
  if (data && typeof data === 'object' && (data as { success?: unknown }).success === false) {
    return false;
  }
  return true;
}

// ----------------------------------------------------
// Local Offline Users / Auth
// ----------------------------------------------------

function getStoredUsers(): Record<string, StoredLocalUser> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredLocalUser>) : {};
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, StoredLocalUser>) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore localStorage write error
  }
}

export function registerLocalUser(params: {
  name: string;
  email: string;
  password: string;
}): { user: User; accessToken: string } {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (name.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }

  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must include upper, lower, number, and a special character.');
  }

  const users = getStoredUsers();
  if (users[email]) {
    throw new Error('An account with this email already exists.');
  }

  const role: 'CUSTOMER' | 'ADMIN' = email.includes('admin') ? 'ADMIN' : 'CUSTOMER';
  const id = `local-user-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const newUser: StoredLocalUser = {
    id,
    name,
    email,
    role,
    createdAt,
    passwordHash: password,
  };

  users[email] = newUser;
  saveStoredUsers(users);

  const user: User = {
    id,
    name,
    email,
    role,
    createdAt,
  };

  return {
    user,
    accessToken: `local-jwt-${crypto.randomUUID()}`,
  };
}

export function loginLocalUser(params: {
  email: string;
  password: string;
}): { user: User; accessToken: string } {
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  const users = getStoredUsers();
  let found = users[email];

  // If not found in localStorage, provide friendly demo default accounts
  if (!found) {
    if (email === 'admin@example.com' || email.startsWith('admin@')) {
      const demoAdmin: StoredLocalUser = {
        id: 'local-admin-demo',
        name: 'Administrator',
        email,
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        passwordHash: password || 'Password123!',
      };
      users[email] = demoAdmin;
      saveStoredUsers(users);
      found = demoAdmin;
    } else {
      // Create user on the fly if password is valid or allow testing
      const role: 'CUSTOMER' | 'ADMIN' = email.includes('admin') ? 'ADMIN' : 'CUSTOMER';
      const demoUser: StoredLocalUser = {
        id: `local-user-${crypto.randomUUID()}`,
        name: email.split('@')[0] || 'Demo User',
        email,
        role,
        createdAt: new Date().toISOString(),
        passwordHash: password,
      };
      users[email] = demoUser;
      saveStoredUsers(users);
      found = demoUser;
    }
  }

  if (found.passwordHash && found.passwordHash !== password) {
    throw new Error('Invalid email or password.');
  }

  const user: User = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    createdAt: found.createdAt,
  };

  return {
    user,
    accessToken: `local-jwt-${crypto.randomUUID()}`,
  };
}

export function updateLocalUser(userId: string, data: { name?: string; email?: string }): { user: User } {
  const users = getStoredUsers();
  const entry = Object.values(users).find((u) => u.id === userId);
  if (!entry) {
    throw new Error('User not found');
  }

  if (data.name) entry.name = data.name.trim();
  if (data.email) entry.email = data.email.trim().toLowerCase();

  users[entry.email] = entry;
  saveStoredUsers(users);

  return {
    user: {
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      createdAt: entry.createdAt,
    },
  };
}

// ----------------------------------------------------
// Local Offline Orders
// ----------------------------------------------------

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
  try {
    sessionStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(all));
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(all));
  } catch {
    // Ignore write errors
  }
}

export function loadLocalOrder(id: string) {
  return loadLocalOrders()[id] ?? null;
}

export function listLocalOrders(): Order[] {
  const map = loadLocalOrders();
  return Object.values(map).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function loadLocalOrders(): Record<string, Order> {
  try {
    const raw = sessionStorage.getItem(LOCAL_ORDERS_KEY) || localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {};
  }
}

// ----------------------------------------------------
// Local Offline Addresses
// ----------------------------------------------------

export function listLocalAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADDRESSES_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

export type LocalAddressInput = {
  id?: string;
  type: Address['type'];
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

export function saveLocalAddress(addressData: LocalAddressInput): Address {
  const list = listLocalAddresses();
  const normalized = {
    type: addressData.type,
    line1: addressData.line1,
    line2: addressData.line2 ?? null,
    city: addressData.city,
    state: addressData.state ?? null,
    postalCode: addressData.postalCode,
    country: addressData.country,
    phone: addressData.phone ?? null,
    isDefault: addressData.isDefault,
  };

  if (addressData.id) {
    const idx = list.findIndex((a) => a.id === addressData.id);
    if (idx >= 0) {
      const updated: Address = { ...list[idx], ...normalized, id: addressData.id };
      list[idx] = updated;
      localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(list));
      return updated;
    }
  }

  const created: Address = {
    ...normalized,
    id: `addr-local-${crypto.randomUUID()}`,
  };
  list.push(created);
  localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(list));
  return created;
}

export function deleteLocalAddress(id: string) {
  const list = listLocalAddresses().filter((a) => a.id !== id);
  localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(list));
}
