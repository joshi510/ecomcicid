import type { Request, Response } from 'express';
import type { z } from 'zod';
import { createPaymentIntentSchema, refundOrderSchema } from '../schemas/payment.schema.js';
import { confirmMockPayment, createPaymentIntent, refundOrder } from '../services/payment.service.js';
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
  sendSuccess(res, data, 'Payment confirmed');
}

export async function refund(req: Request, res: Response) {
  const data = await refundOrder(routeParam(req, 'id'), req.body as RefundBody);
  sendSuccess(res, data, 'Refund created');
}
