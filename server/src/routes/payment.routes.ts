import { Router } from 'express';
import { confirmLocalIntent, createIntent } from '../controllers/payment.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createPaymentIntentSchema } from '../schemas/payment.schema.js';

export const paymentRouter = Router();

paymentRouter.post(
  '/intents/mock-confirm',
  authenticate,
  validate(createPaymentIntentSchema),
  asyncHandler(confirmLocalIntent),
);
paymentRouter.post(
  '/intents',
  authenticate,
  validate(createPaymentIntentSchema),
  asyncHandler(createIntent),
);
