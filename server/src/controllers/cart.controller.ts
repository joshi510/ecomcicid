import type { Request, Response } from 'express';
import type { z } from 'zod';
import { addCartItemSchema, syncCartSchema, updateCartItemSchema } from '../schemas/cart.schema.js';
import {
  addCartItem,
  getCart,
  removeCartItem,
  syncCart,
  updateCartItem,
} from '../services/cart.service.js';
import { routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type AddBody = z.infer<typeof addCartItemSchema>['body'];
type UpdateBody = z.infer<typeof updateCartItemSchema>['body'];
type SyncBody = z.infer<typeof syncCartSchema>['body'];

export async function getCurrentCart(req: Request, res: Response) {
  const data = await getCart(req, res);
  sendSuccess(res, data, 'Cart fetched');
}

export async function addItem(req: Request, res: Response) {
  const data = await addCartItem(req, res, req.body as AddBody);
  sendSuccess(res, data, 'Item added to cart');
}

export async function updateItem(req: Request, res: Response) {
  const body = req.body as UpdateBody;
  const data = await updateCartItem(req, res, routeParam(req, 'itemId'), body.quantity);
  sendSuccess(res, data, 'Cart updated');
}

export async function removeItem(req: Request, res: Response) {
  const data = await removeCartItem(req, res, routeParam(req, 'itemId'));
  sendSuccess(res, data, 'Item removed from cart');
}

export async function syncItems(req: Request, res: Response) {
  const body = req.body as SyncBody;
  const data = await syncCart(req, res, body.items);
  sendSuccess(res, data, 'Cart synced');
}
