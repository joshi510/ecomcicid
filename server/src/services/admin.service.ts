import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { checkoutConfig } from '../config/checkout.js';
import { env } from '../config/env.js';
import { isStripeConfigured } from '../lib/stripe.js';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { moneyString } from '../utils/money.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const LOW_STOCK_THRESHOLD = 5;
const SALES_DAYS = 30;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardStats() {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (SALES_DAYS - 1));

  const [revenueAgg, orderCount, customerCount, lowStockProducts, recentOrders] = await Promise.all(
    [
      prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.product.findMany({
        where: { isActive: true, stockQuantity: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stockQuantity: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          slug: true,
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: from }, status: { in: REVENUE_STATUSES } },
        select: { createdAt: true, total: true },
      }),
    ],
  );

  const byDay = new Map<string, { revenue: Prisma.Decimal; orders: number }>();
  for (let i = 0; i < SALES_DAYS; i += 1) {
    const day = new Date(from);
    day.setDate(from.getDate() + i);
    byDay.set(dayKey(day), { revenue: new Prisma.Decimal(0), orders: 0 });
  }

  for (const order of recentOrders) {
    const key = dayKey(order.createdAt);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.revenue = bucket.revenue.add(order.total);
    bucket.orders += 1;
  }

  return {
    revenue: moneyString(revenueAgg._sum.total ?? 0),
    orders: orderCount,
    customers: customerCount,
    lowStockCount: await prisma.product.count({
      where: { isActive: true, stockQuantity: { lte: LOW_STOCK_THRESHOLD } },
    }),
    lowStock: lowStockProducts,
    salesOverTime: [...byDay.entries()].map(([date, value]) => ({
      date,
      revenue: Number(moneyString(value.revenue)),
      orders: value.orders,
    })),
  };
}

export async function listCustomers(query: { page: number; limit: number; q?: string }) {
  const where: Prisma.UserWhereInput = {
    role: UserRole.CUSTOMER,
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      ...paginationArgs(query),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const spent = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      userId: { in: rows.map((user) => user.id) },
      status: { in: REVENUE_STATUSES },
    },
    _sum: { total: true },
  });
  const spentByUser = new Map(spent.map((row) => [row.userId, row._sum.total]));

  return {
    customers: rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      orderCount: user._count.orders,
      totalSpent: moneyString(spentByUser.get(user.id) ?? 0),
    })),
    pagination: paginationMeta(total, query.page, query.limit),
  };
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, addresses: true } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'Customer not found', 'NOT_FOUND');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    orderCount: user._count.orders,
    addressCount: user._count.addresses,
    orders: user.orders.map((order) => ({
      ...order,
      total: moneyString(order.total),
    })),
  };
}

export function getStoreSettings() {
  return {
    storeName: 'Northline',
    clientUrl: env.CLIENT_URL,
    currency: checkoutConfig.currency,
    taxRate: checkoutConfig.taxRate,
    shippingFlatRate: checkoutConfig.shippingFlatRate,
    freeShippingThreshold: checkoutConfig.freeShippingThreshold,
    stripeConfigured: isStripeConfigured(),
  };
}
