import type { Request, Response } from 'express';
import type { z } from 'zod';
import {
  createOrderSchema,
  listAdminOrdersSchema,
  listOrdersSchema,
  updateOrderStatusSchema,
} from '../schemas/order.schema.js';
import {
  createOrder,
  getOrder,
  listAdminOrders,
  listUserOrders,
  updateOrderStatus,
} from '../services/order.service.js';
import { parsedQuery, routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type CreateBody = z.infer<typeof createOrderSchema>['body'];
type ListQuery = z.infer<typeof listOrdersSchema>['query'];
type AdminListQuery = z.infer<typeof listAdminOrdersSchema>['query'];
type StatusBody = z.infer<typeof updateOrderStatusSchema>['body'];

export async function create(req: Request, res: Response) {
  const data = await createOrder(req.user!.id, req.body as CreateBody);
  sendSuccess(res, data, 'Order created', 201);
}

export async function listMine(req: Request, res: Response) {
  const data = await listUserOrders(req.user!.id, parsedQuery<ListQuery>(req));
  sendSuccess(res, data, 'Orders fetched');
}

export async function getOne(req: Request, res: Response) {
  const data = await getOrder(routeParam(req, 'id'), req.user!);
  sendSuccess(res, data, 'Order fetched');
}

export async function listAll(req: Request, res: Response) {
  const data = await listAdminOrders(parsedQuery<AdminListQuery>(req));
  sendSuccess(res, data, 'Orders fetched');
}

export async function updateStatus(req: Request, res: Response) {
  const body = req.body as StatusBody;
  const data = await updateOrderStatus(routeParam(req, 'id'), req.user!.id, body);
  sendSuccess(res, data, 'Order status updated');
}
