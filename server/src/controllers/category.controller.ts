import type { Request, Response } from 'express';
import type { z } from 'zod';
import { listCategoriesSchema } from '../schemas/category.schema.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/category.service.js';
import { parsedQuery, routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type ListQuery = z.infer<typeof listCategoriesSchema>['query'];

export async function list(req: Request, res: Response) {
  const data = await listCategories(parsedQuery<ListQuery>(req));
  sendSuccess(res, data, 'Categories fetched');
}

export async function create(req: Request, res: Response) {
  const data = await createCategory(req.body);
  sendSuccess(res, data, 'Category created', 201);
}

export async function update(req: Request, res: Response) {
  const data = await updateCategory(routeParam(req, 'id'), req.body);
  sendSuccess(res, data, 'Category updated');
}

export async function remove(req: Request, res: Response) {
  const data = await deleteCategory(routeParam(req, 'id'));
  sendSuccess(res, data, 'Category deleted');
}
