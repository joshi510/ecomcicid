import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const booleanish = z.preprocess((value) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return emptyToUndefined(value);
}, z.boolean().optional());

const parentId = z.preprocess((value) => {
  if (value === '' || value === null) return null;
  return value;
}, z.string().uuid().nullable().optional());

export const listCategoriesSchema = z.object({
  query: z.object({
    flat: booleanish,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

export const categoryIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    parentId,
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
    slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    parentId,
  }),
});
