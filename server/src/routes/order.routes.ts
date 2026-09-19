import { Router } from 'express';
import { create, getOne, listMine } from '../controllers/order.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, listOrdersSchema, orderIdSchema } from '../schemas/order.schema.js';

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get('/', validate(listOrdersSchema), asyncHandler(listMine));
orderRouter.post('/', validate(createOrderSchema), asyncHandler(create));
orderRouter.get('/:id', validate(orderIdSchema), asyncHandler(getOne));
