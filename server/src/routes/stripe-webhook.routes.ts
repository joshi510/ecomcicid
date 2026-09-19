import { Router } from 'express';
import { webhook } from '../controllers/payment.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post('/', asyncHandler(webhook));
