import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

export const listCustomersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
  }),
});

export const customerIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
