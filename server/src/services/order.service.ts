import { AddressType, OrderStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { checkoutConfig } from '../config/checkout.js';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { money, moneyString } from '../utils/money.js';
import { paginationArgs, paginationMeta, type PaginationMeta } from '../utils/pagination.js';
import { clearCartById } from './cart.service.js';

type AddressInput = {
  type?: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

type LockedProductRow = {
  id: string;
  name: string;
  sku: string;
  price: Prisma.Decimal;
  stockQuantity: number;
  isActive: boolean;
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

const orderDetailInclude = {
  items: true,
  coupon: { select: { id: true, code: true, type: true, value: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    include: { changedBy: { select: { id: true, name: true } } },
  },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

function snapshotAddress(address: {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
}) {
  return {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };
}

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: moneyString(order.subtotal),
    discountAmount: moneyString(order.discountAmount),
    shippingAmount: moneyString(order.shippingAmount),
    taxAmount: moneyString(order.taxAmount),
    total: moneyString(order.total),
    currency: order.currency,
    coupon: order.coupon,
    shippingSnapshot: order.shippingSnapshot,
    billingSnapshot: order.billingSnapshot,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      unitPrice: moneyString(item.unitPrice),
      quantity: item.quantity,
      lineTotal: moneyString(item.lineTotal),
    })),
    statusHistory: order.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt,
    })),
    user: order.user,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function generateOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}

async function loadUserAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) {
    throw new AppError(400, 'Address not found', 'INVALID_ADDRESS');
  }
  return address;
}

function applyCoupon(
  subtotal: Prisma.Decimal,
  coupon: {
    type: 'PERCENTAGE' | 'FIXED';
    value: Prisma.Decimal;
    minOrderAmount: Prisma.Decimal | null;
    maxDiscount: Prisma.Decimal | null;
    maxUses: number | null;
    usedCount: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  },
) {
  const now = Date.now();
  if (!coupon.isActive) {
    throw new AppError(400, 'Coupon is not active', 'INVALID_COUPON');
  }
  if (coupon.startsAt && coupon.startsAt.getTime() > now) {
    throw new AppError(400, 'Coupon is not active yet', 'INVALID_COUPON');
  }
  if (coupon.endsAt && coupon.endsAt.getTime() < now) {
    throw new AppError(400, 'Coupon has expired', 'INVALID_COUPON');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError(400, 'Coupon has no remaining uses', 'INVALID_COUPON');
  }
  if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
    throw new AppError(400, 'Order does not meet the coupon minimum', 'INVALID_COUPON');
  }

  let discount =
    coupon.type === 'PERCENTAGE' ? subtotal.mul(coupon.value).div(100) : money(coupon.value);

  if (coupon.maxDiscount && discount.greaterThan(coupon.maxDiscount)) {
    discount = money(coupon.maxDiscount);
  }
  if (discount.greaterThan(subtotal)) {
    discount = subtotal;
  }

  return money(discount);
}

export async function createOrder(
  userId: string,
  input: {
    shippingAddressId?: string;
    billingAddressId?: string;
    shippingAddress?: AddressInput;
    billingAddress?: AddressInput;
    sameBillingAsShipping?: boolean;
    couponCode?: string;
  },
) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'Cart is empty', 'CART_EMPTY');
  }

  const shipping =
    input.shippingAddressId != null
      ? await loadUserAddress(userId, input.shippingAddressId)
      : await prisma.address.create({
          data: {
            userId,
            type: input.shippingAddress?.type ?? AddressType.SHIPPING,
            line1: input.shippingAddress!.line1,
            line2: input.shippingAddress?.line2,
            city: input.shippingAddress!.city,
            state: input.shippingAddress?.state,
            postalCode: input.shippingAddress!.postalCode,
            country: input.shippingAddress!.country,
            phone: input.shippingAddress?.phone,
          },
        });

  let billing = shipping;
  if (input.billingAddressId && input.billingAddressId !== shipping.id) {
    billing = await loadUserAddress(userId, input.billingAddressId);
  } else if (input.billingAddress && !input.sameBillingAsShipping) {
    billing = await prisma.address.create({
      data: {
        userId,
        type: input.billingAddress.type ?? AddressType.BILLING,
        line1: input.billingAddress.line1,
        line2: input.billingAddress.line2,
        city: input.billingAddress.city,
        state: input.billingAddress.state,
        postalCode: input.billingAddress.postalCode,
        country: input.billingAddress.country,
        phone: input.billingAddress.phone,
      },
    });
  }

  const coupon = input.couponCode
    ? await prisma.coupon.findFirst({
        where: { code: { equals: input.couponCode, mode: 'insensitive' } },
      })
    : null;

  if (input.couponCode && !coupon) {
    throw new AppError(400, 'Coupon not found', 'INVALID_COUPON');
  }

  const productIds = [...new Set(cart.items.map((item) => item.productId))];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (productIds.some((id) => !UUID_RE.test(id))) {
    throw new AppError(400, 'Cart contains an invalid product', 'INVALID_PRODUCT');
  }

  const order = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<LockedProductRow[]>`
      SELECT id, name, sku, price, stock_quantity AS "stockQuantity", is_active AS "isActive"
      FROM products
      WHERE id IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const lockedById = new Map(locked.map((row) => [row.id, row]));

    const lineItems = cart.items.map((item) => {
      const product = lockedById.get(item.productId);
      if (!product || !product.isActive) {
        throw new AppError(
          409,
          'A product in your cart is no longer available',
          'PRODUCT_UNAVAILABLE',
        );
      }
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          409,
          `Only ${product.stockQuantity} of ${product.name} in stock`,
          'OUT_OF_STOCK',
        );
      }

      const unitPrice = money(product.price);
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice,
        quantity: item.quantity,
        lineTotal: money(unitPrice.mul(item.quantity)),
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum.add(item.lineTotal), money(0));
    const discountAmount = coupon ? applyCoupon(subtotal, coupon) : money(0);
    const taxable = subtotal.sub(discountAmount);
    const shippingAmount = taxable.greaterThanOrEqualTo(checkoutConfig.freeShippingThreshold)
      ? money(0)
      : money(checkoutConfig.shippingFlatRate);
    const taxAmount = money(taxable.mul(checkoutConfig.taxRate));
    const total = money(taxable.add(shippingAmount).add(taxAmount));

    for (const item of lineItems) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new AppError(409, `Insufficient stock for ${item.name}`, 'OUT_OF_STOCK');
      }
    }

    if (coupon) {
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          OR: [{ maxUses: null }, { usedCount: { lt: coupon.maxUses ?? 0 } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) {
        throw new AppError(409, 'Coupon is no longer available', 'INVALID_COUPON');
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: OrderStatus.PENDING,
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        total,
        currency: checkoutConfig.currency,
        couponId: coupon?.id,
        shippingAddressId: shipping.id,
        billingAddressId: billing.id,
        shippingSnapshot: snapshotAddress(shipping),
        billingSnapshot: snapshotAddress(billing),
        items: {
          create: lineItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
        },
        statusHistory: {
          create: {
            toStatus: OrderStatus.PENDING,
            note: 'Order created',
            changedById: userId,
          },
        },
      },
      include: orderDetailInclude,
    });

    await clearCartById(cart.id, tx);
    return created;
  });

  return serializeOrder(order);
}

export async function listUserOrders(
  userId: string,
  query: { page: number; limit: number; status?: OrderStatus },
): Promise<{ orders: ReturnType<typeof serializeOrder>[]; pagination: PaginationMeta }> {
  const where: Prisma.OrderWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      ...paginationArgs(query),
      orderBy: { createdAt: 'desc' },
      include: orderDetailInclude,
    }),
  ]);

  return {
    orders: rows.map(serializeOrder),
    pagination: paginationMeta(total, query.page, query.limit),
  };
}

export async function getOrder(orderId: string, actor: { id: string; role: string }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderDetailInclude,
  });

  if (!order) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  if (actor.role !== 'ADMIN' && order.userId !== actor.id) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  return serializeOrder(order);
}

export async function listAdminOrders(query: {
  page: number;
  limit: number;
  status?: OrderStatus;
  userId?: string;
  q?: string;
  from?: Date;
  to?: Date;
}) {
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.q ? { orderNumber: { contains: query.q, mode: 'insensitive' } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      ...paginationArgs(query),
      orderBy: { createdAt: 'desc' },
      include: orderDetailInclude,
    }),
  ]);

  return {
    orders: rows.map(serializeOrder),
    pagination: paginationMeta(total, query.page, query.limit),
  };
}

export async function updateOrderStatus(
  orderId: string,
  adminId: string,
  input: { status: OrderStatus; note?: string },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  if (order.status === input.status) {
    const current = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: orderDetailInclude,
    });
    return serializeOrder(current);
  }

  if (!ALLOWED_TRANSITIONS[order.status].includes(input.status)) {
    throw new AppError(
      409,
      `Cannot change order status from ${order.status} to ${input.status}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.status === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        if (!item.productId) {
          continue;
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: input.status,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: input.status,
            note: input.note,
            changedById: adminId,
          },
        },
      },
      include: orderDetailInclude,
    });
  });

  return serializeOrder(updated);
}

export async function applySystemOrderStatus(orderId: string, toStatus: OrderStatus, note: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  if (order.status === toStatus) {
    return;
  }

  if (!ALLOWED_TRANSITIONS[order.status].includes(toStatus)) {
    throw new AppError(
      409,
      `Cannot change order status from ${order.status} to ${toStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: toStatus,
      statusHistory: {
        create: {
          fromStatus: order.status,
          toStatus,
          note,
        },
      },
    },
  });
}
