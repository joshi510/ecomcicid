import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { generateOpaqueToken } from '../utils/crypto.js';
import { money, moneyString } from '../utils/money.js';
import { applySystemOrderStatus } from './order.service.js';

function serializePayment(payment: {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId: string | null;
  amount: { toString(): string } | number | string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    transactionId: payment.transactionId,
    amount: moneyString(payment.amount.toString()),
    currency: payment.currency,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export async function createPaymentIntent(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  });

  if (!order || order.userId !== userId) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new AppError(409, 'Cancelled orders cannot be paid', 'ORDER_CANCELLED');
  }

  if (order.status === OrderStatus.PAID || order.payments.some((p) => p.status === 'SUCCEEDED')) {
    throw new AppError(409, 'Order is already paid', 'ALREADY_PAID');
  }

  const existing = order.payments.find(
    (payment) =>
      payment.provider === 'MANUAL' && payment.status === 'PENDING' && payment.transactionId,
  );

  if (existing?.transactionId?.startsWith('pay_local_')) {
    return {
      mock: true,
      payment: serializePayment(existing),
    };
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: PaymentProvider.MANUAL,
      status: PaymentStatus.PENDING,
      transactionId: `pay_local_${generateOpaqueToken()}`,
      amount: order.total,
      currency: order.currency,
    },
  });

  return {
    mock: true,
    payment: serializePayment(payment),
  };
}

export async function confirmMockPayment(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  });

  if (!order || order.userId !== userId) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  if (order.status === OrderStatus.PAID || order.payments.some((p) => p.status === 'SUCCEEDED')) {
    throw new AppError(409, 'Order is already paid', 'ALREADY_PAID');
  }

  const payment = order.payments.find(
    (row) =>
      row.provider === 'MANUAL' &&
      row.status === 'PENDING' &&
      row.transactionId?.startsWith('pay_local_'),
  );

  if (!payment?.transactionId) {
    throw new AppError(409, 'No local payment to confirm', 'NO_PAYMENT');
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.SUCCEEDED },
  });

  await applySystemOrderStatus(order.id, OrderStatus.PAID, 'Payment succeeded (local checkout)');

  return serializePayment(updated);
}

export async function refundOrder(orderId: string, input: { amount?: number; reason?: string }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  });

  if (!order) {
    throw new AppError(404, 'Order not found', 'NOT_FOUND');
  }

  const payment = order.payments.find((row) => row.status === 'SUCCEEDED' && row.transactionId);

  if (!payment?.transactionId) {
    throw new AppError(409, 'No successful payment to refund', 'NO_PAYMENT');
  }

  const fullRefund =
    input.amount === undefined || money(input.amount).equals(money(payment.amount.toString()));
  const updated = fullRefund
    ? await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      })
    : payment;

  return {
    refundId: `rf_local_${generateOpaqueToken()}`,
    payment: serializePayment(updated),
    reason: input.reason ?? null,
  };
}
