import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

export const createPaymentIntentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
  }),
});

export const refundOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    amount: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
    reason: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  }),
});
