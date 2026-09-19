import { Router } from 'express';
import { create, getBySlug, list, remove, update } from '../controllers/product.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate.js';
import { acceptProductImages } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  productSlugSchema,
  updateProductSchema,
} from '../schemas/product.schema.js';

export const productRouter = Router();

const adminOnly = [authenticate, authorize('ADMIN')] as const;

productRouter.get('/', optionalAuthenticate, validate(listProductsSchema), asyncHandler(list));
productRouter.post(
  '/',
  ...adminOnly,
  acceptProductImages,
  validate(createProductSchema),
  asyncHandler(create),
);
productRouter.get(
  '/:slug',
  optionalAuthenticate,
  validate(productSlugSchema),
  asyncHandler(getBySlug),
);
productRouter.put(
  '/:id',
  ...adminOnly,
  acceptProductImages,
  validate(updateProductSchema),
  asyncHandler(update),
);
productRouter.delete('/:id', ...adminOnly, validate(productIdSchema), asyncHandler(remove));
