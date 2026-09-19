import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { env } from '../config/env.js';
import { isStripeConfigured, stripe } from '../lib/stripe.js';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { generateOpaqueToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { money, moneyString } from '../utils/money.js';
import { applySystemOrderStatus } from './order.service.js';

const STRIPE_SETUP_MESSAGE =
  'Stripe is not configured. Add test keys from https://dashboard.stripe.com/test/apikeys to server/.env (STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY), then restart the API.';

function toCents(amount: number | string): number {
  return money(amount).mul(100).toDecimalPlaces(0).toNumber();
}

function fromCents(cents: number) {
  return money(cents).div(100);
}

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

  const amountCents = toCents(order.total.toString());
  const existing = order.payments.find(
    (payment) =>
      payment.provider === 'STRIPE' && payment.status === 'PENDING' && payment.transactionId,
  );

  if (!isStripeConfigured()) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(503, STRIPE_SETUP_MESSAGE, 'STRIPE_NOT_CONFIGURED');
    }

    if (existing?.transactionId?.startsWith('pi_local_')) {
      return {
        mock: true,
        clientSecret: null,
        publishableKey: '',
        payment: serializePayment(existing),
      };
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        transactionId: `pi_local_${generateOpaqueToken()}`,
        amount: order.total,
        currency: order.currency,
      },
    });

    return {
      mock: true,
      clientSecret: null,
      publishableKey: '',
      payment: serializePayment(payment),
    };
  }

  if (existing?.transactionId) {
    const intent = await stripe.paymentIntents.retrieve(existing.transactionId);
    if (intent.status === 'requires_payment_method' || intent.status === 'requires_confirmation') {
      return {
        clientSecret: intent.client_secret,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        payment: serializePayment(existing),
      };
    }
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: order.currency.toLowerCase(),
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
    automatic_payment_methods: { enabled: true },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.PENDING,
      transactionId: intent.id,
      amount: order.total,
      currency: order.currency,
    },
  });

  return {
    clientSecret: intent.client_secret,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    payment: serializePayment(payment),
  };
}

async function markPayment(transactionId: string, status: PaymentStatus, amount?: number) {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment) {
    logger.warn({ transactionId, status }, 'Stripe webhook for unknown payment');
    return null;
  }

  if (payment.status === status) {
    return payment;
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      ...(amount !== undefined ? { amount: fromCents(amount) } : {}),
    },
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!signature) {
    throw new AppError(400, 'Missing Stripe signature', 'STRIPE_SIGNATURE');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    throw new AppError(400, 'Invalid Stripe webhook signature', 'STRIPE_SIGNATURE');
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const payment = await markPayment(intent.id, PaymentStatus.SUCCEEDED, intent.amount_received);
      const orderId = intent.metadata.orderId ?? payment?.orderId;
      if (orderId) {
        await applySystemOrderStatus(
          orderId,
          OrderStatus.PAID,
          'Payment succeeded (Stripe webhook)',
        );
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      await markPayment(intent.id, PaymentStatus.FAILED);
      logger.warn(
        {
          paymentIntentId: intent.id,
          orderId: intent.metadata.orderId,
          error: intent.last_payment_error?.message,
        },
        'Stripe payment failed',
      );
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntentId && charge.refunded) {
        await markPayment(paymentIntentId, PaymentStatus.REFUNDED);
      }
      break;
    }
    default:
      logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
  }

  return { received: true, type: event.type };
}

export async function confirmMockPayment(userId: string, orderId: string) {
  if (isStripeConfigured() || env.NODE_ENV === 'production') {
    throw new AppError(403, 'Local test payments are disabled', 'STRIPE_CONFIGURED');
  }

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
      row.provider === 'STRIPE' &&
      row.status === 'PENDING' &&
      row.transactionId?.startsWith('pi_local_'),
  );

  if (!payment?.transactionId) {
    throw new AppError(409, 'No local test payment to confirm', 'NO_PAYMENT');
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.SUCCEEDED },
  });

  await applySystemOrderStatus(order.id, OrderStatus.PAID, 'Payment succeeded (local test checkout)');

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

  const payment = order.payments.find(
    (row) => row.provider === 'STRIPE' && row.status === 'SUCCEEDED' && row.transactionId,
  );

  if (!payment?.transactionId) {
    throw new AppError(409, 'No successful Stripe payment to refund', 'NO_PAYMENT');
  }

  const refund = await stripe.refunds.create({
    payment_intent: payment.transactionId,
    ...(input.amount !== undefined ? { amount: toCents(input.amount) } : {}),
    reason: 'requested_by_customer',
    metadata: { orderId: order.id, note: input.reason ?? '' },
  });

  const fullRefund =
    input.amount === undefined || money(input.amount).equals(money(payment.amount.toString()));
  const updated = fullRefund
    ? await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      })
    : payment;

  return {
    refundId: refund.id,
    payment: serializePayment(updated),
  };
}
