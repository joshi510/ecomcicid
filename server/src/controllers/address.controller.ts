import type { Request, Response } from 'express';
import type { z } from 'zod';
import { createAddressSchema, updateAddressSchema } from '../schemas/address.schema.js';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../services/address.service.js';
import { routeParam } from '../utils/request.js';
import { sendSuccess } from '../utils/response.js';

type CreateBody = z.infer<typeof createAddressSchema>['body'];
type UpdateBody = z.infer<typeof updateAddressSchema>['body'];

export async function list(req: Request, res: Response) {
  const data = await listAddresses(req.user!.id);
  sendSuccess(res, data, 'Addresses fetched');
}

export async function create(req: Request, res: Response) {
  const data = await createAddress(req.user!.id, req.body as CreateBody);
  sendSuccess(res, data, 'Address created', 201);
}

export async function update(req: Request, res: Response) {
  const data = await updateAddress(req.user!.id, routeParam(req, 'id'), req.body as UpdateBody);
  sendSuccess(res, data, 'Address updated');
}

export async function remove(req: Request, res: Response) {
  const data = await deleteAddress(req.user!.id, routeParam(req, 'id'));
  sendSuccess(res, data, 'Address deleted');
}
