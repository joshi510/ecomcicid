import type { Request, Response } from 'express';
import type { z } from 'zod';
import { cacheDeletePrefix, cacheGet, cacheSet } from '../lib/cache.js';
import { uploadedProductImagePaths } from '../middleware/upload.js';
import {
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
} from '../schemas/product.schema.js';
import {
  createProduct,
  getProductBySlug,
  listProducts,
  softDeleteProduct,
  updateProduct,
} from '../services/product.service.js';
import { parsedQuery, routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type ListQuery = z.infer<typeof listProductsSchema>['query'];
type CreateBody = z.infer<typeof createProductSchema>['body'];
type UpdateBody = z.infer<typeof updateProductSchema>['body'];

export async function list(req: Request, res: Response) {
  const query = parsedQuery<ListQuery>(req);
  const isAdmin = req.user?.role === 'ADMIN';
  const skipCache = Boolean(isAdmin && query.includeInactive);
  const cacheKey = `products:list:${JSON.stringify({
    page: query.page,
    limit: query.limit,
    category: query.category ?? null,
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    search: query.search ?? null,
    sort: query.sort,
    order: query.order,
    minRating: query.minRating ?? null,
  })}`;

  if (!skipCache) {
    const hit = await cacheGet(cacheKey);
    if (hit) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=30');
      sendSuccess(res, JSON.parse(hit) as Awaited<ReturnType<typeof listProducts>>, 'Products fetched');
      return;
    }
  }

  const data = await listProducts({ ...query, isAdmin });
  if (!skipCache) {
    await cacheSet(cacheKey, JSON.stringify(data), 60);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=30');
  }
  sendSuccess(res, data, 'Products fetched');
}

export async function getBySlug(req: Request, res: Response) {
  const data = await getProductBySlug(routeParam(req, 'slug'), req.user?.role === 'ADMIN');
  sendSuccess(res, data, 'Product fetched');
}

export async function create(req: Request, res: Response) {
  const data = await createProduct({
    ...(req.body as CreateBody),
    uploadedImages: uploadedProductImagePaths(req),
  });
  await cacheDeletePrefix('products:');
  sendSuccess(res, data, 'Product created', 201);
}

export async function update(req: Request, res: Response) {
  const data = await updateProduct(routeParam(req, 'id'), {
    ...(req.body as UpdateBody),
    uploadedImages: uploadedProductImagePaths(req),
  });
  await cacheDeletePrefix('products:');
  sendSuccess(res, data, 'Product updated');
}

export async function remove(req: Request, res: Response) {
  const data = await softDeleteProduct(routeParam(req, 'id'));
  await cacheDeletePrefix('products:');
  sendSuccess(res, data, 'Product deleted');
}
