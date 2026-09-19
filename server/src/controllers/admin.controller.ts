import type { Request, Response } from 'express';
import type { z } from 'zod';
import { listCustomersSchema } from '../schemas/admin.schema.js';
import {
  getCustomer,
  getDashboardStats,
  getStoreSettings,
  listCustomers,
} from '../services/admin.service.js';
import { parsedQuery, routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type ListQuery = z.infer<typeof listCustomersSchema>['query'];

export async function stats(_req: Request, res: Response) {
  const data = await getDashboardStats();
  sendSuccess(res, data, 'Dashboard stats fetched');
}

export async function customers(req: Request, res: Response) {
  const data = await listCustomers(parsedQuery<ListQuery>(req));
  sendSuccess(res, data, 'Customers fetched');
}

export async function customer(req: Request, res: Response) {
  const data = await getCustomer(routeParam(req, 'id'));
  sendSuccess(res, data, 'Customer fetched');
}

export async function settings(_req: Request, res: Response) {
  sendSuccess(res, getStoreSettings(), 'Settings fetched');
}
