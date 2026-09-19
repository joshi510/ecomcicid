import { Router } from 'express';
import { getOne, listAll, updateStatus } from '../controllers/order.controller.js';
import { refund } from '../controllers/payment.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listAdminOrdersSchema,
  orderIdSchema,
  updateOrderStatusSchema,
} from '../schemas/order.schema.js';
import { refundOrderSchema } from '../schemas/payment.schema.js';

export const adminOrderRouter = Router();

adminOrderRouter.use(authenticate, authorize('ADMIN'));

adminOrderRouter.get('/', validate(listAdminOrdersSchema), asyncHandler(listAll));
adminOrderRouter.get('/:id', validate(orderIdSchema), asyncHandler(getOne));
adminOrderRouter.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  asyncHandler(updateStatus),
);
adminOrderRouter.post('/:id/refund', validate(refundOrderSchema), asyncHandler(refund));
