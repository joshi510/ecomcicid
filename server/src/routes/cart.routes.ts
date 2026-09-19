import { Router } from 'express';
import {
  addItem,
  getCurrentCart,
  removeItem,
  syncItems,
  updateItem,
} from '../controllers/cart.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate.js';
import { validate } from '../middleware/validate.js';
import {
  addCartItemSchema,
  cartItemIdSchema,
  syncCartSchema,
  updateCartItemSchema,
} from '../schemas/cart.schema.js';

export const cartRouter = Router();

cartRouter.use(optionalAuthenticate);

cartRouter.get('/', asyncHandler(getCurrentCart));
cartRouter.post('/items', validate(addCartItemSchema), asyncHandler(addItem));
cartRouter.patch('/items/:itemId', validate(updateCartItemSchema), asyncHandler(updateItem));
cartRouter.delete('/items/:itemId', validate(cartItemIdSchema), asyncHandler(removeItem));
cartRouter.post('/sync', validate(syncCartSchema), asyncHandler(syncItems));
