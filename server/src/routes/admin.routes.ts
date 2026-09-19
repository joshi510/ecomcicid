import { Router } from 'express';
import { customer, customers, settings, stats } from '../controllers/admin.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { customerIdSchema, listCustomersSchema } from '../schemas/admin.schema.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/stats', asyncHandler(stats));
adminRouter.get('/settings', asyncHandler(settings));
adminRouter.get('/customers', validate(listCustomersSchema), asyncHandler(customers));
adminRouter.get('/customers/:id', validate(customerIdSchema), asyncHandler(customer));
