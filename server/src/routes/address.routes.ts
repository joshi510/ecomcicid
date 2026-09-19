import { Router } from 'express';
import { create, list, remove, update } from '../controllers/address.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  addressIdSchema,
  createAddressSchema,
  updateAddressSchema,
} from '../schemas/address.schema.js';

export const addressRouter = Router();

addressRouter.use(authenticate);

addressRouter.get('/', asyncHandler(list));
addressRouter.post('/', validate(createAddressSchema), asyncHandler(create));
addressRouter.put('/:id', validate(updateAddressSchema), asyncHandler(update));
addressRouter.delete('/:id', validate(addressIdSchema), asyncHandler(remove));
