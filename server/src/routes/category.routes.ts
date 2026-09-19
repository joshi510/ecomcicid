import { Router } from 'express';
import { create, list, remove, update } from '../controllers/category.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  categoryIdSchema,
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from '../schemas/category.schema.js';

export const categoryRouter = Router();

const adminOnly = [authenticate, authorize('ADMIN')] as const;

categoryRouter.get('/', validate(listCategoriesSchema), asyncHandler(list));
categoryRouter.post('/', ...adminOnly, validate(createCategorySchema), asyncHandler(create));
categoryRouter.put('/:id', ...adminOnly, validate(updateCategorySchema), asyncHandler(update));
categoryRouter.delete('/:id', ...adminOnly, validate(categoryIdSchema), asyncHandler(remove));
