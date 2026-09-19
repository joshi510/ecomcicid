import type { Request, Response } from 'express';
import type { z } from 'zod';
import { createPaymentIntentSchema, refundOrderSchema } from '../schemas/payment.schema.js';
import {
  confirmMockPayment,
  createPaymentIntent,
  handleStripeWebhook,
  refundOrder,
} from '../services/payment.service.js';
import { AppError } from '../utils/ApiError.js';
import { routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type IntentBody = z.infer<typeof createPaymentIntentSchema>['body'];
type RefundBody = z.infer<typeof refundOrderSchema>['body'];

export async function createIntent(req: Request, res: Response) {
  const body = req.body as IntentBody;
  const data = await createPaymentIntent(req.user!.id, body.orderId);
  sendSuccess(res, data, 'Payment intent created');
}

export async function confirmLocalIntent(req: Request, res: Response) {
  const body = req.body as IntentBody;
  const data = await confirmMockPayment(req.user!.id, body.orderId);
  sendSuccess(res, data, 'Test payment confirmed');
}

export async function webhook(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(400, 'Webhook body must be raw', 'INVALID_BODY');
  }

  const signature = req.headers['stripe-signature'];
  const data = await handleStripeWebhook(
    req.body,
    Array.isArray(signature) ? signature[0] : signature,
  );
  sendSuccess(res, data, 'Webhook received');
}

export async function refund(req: Request, res: Response) {
  const data = await refundOrder(routeParam(req, 'id'), req.body as RefundBody);
  sendSuccess(res, data, 'Refund created');
}
