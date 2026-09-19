import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const booleanish = z.preprocess((value) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return emptyToUndefined(value);
}, z.boolean().optional());

const imageRef = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value), {
    message: 'Image must be an uploaded path or http(s) URL',
  });

const imagesField = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  }
  return value;
}, z.array(imageRef).max(8).optional());

const money = z.preprocess(
  emptyToUndefined,
  z.coerce.number({ invalid_type_error: 'Must be a number' }).finite().positive(),
);

export const listProductsSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(12),
      category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
      minPrice: z.preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional()),
      maxPrice: z.preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional()),
      search: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional()),
      sort: z.enum(['price', 'name', 'createdAt', 'created_at', 'popularity']).default('createdAt'),
      order: z.enum(['asc', 'desc']).default('desc'),
      minRating: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int().min(1).max(5).optional(),
      ),
      includeInactive: booleanish,
    })
    .refine(
      (query) =>
        query.minPrice === undefined ||
        query.maxPrice === undefined ||
        query.minPrice <= query.maxPrice,
      { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
    ),
});

export const productSlugSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const productFields = {
  name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(160).optional()),
  slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(10_000).optional()),
  price: z.preprocess(emptyToUndefined, money.optional()),
  compareAtPrice: z.preprocess(emptyToUndefined, money.optional()),
  stockQuantity: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  sku: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(64).optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  isActive: booleanish,
  images: imagesField,
  replaceImages: booleanish,
};

export const createProductSchema = z.object({
  body: z
    .object({
      ...productFields,
      name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(160)),
      description: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(10_000)),
      price: money,
      sku: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(64)),
      categoryId: z.preprocess(emptyToUndefined, z.string().uuid()),
    })
    .refine((body) => body.compareAtPrice === undefined || body.compareAtPrice > body.price, {
      message: 'compareAtPrice must be greater than price',
      path: ['compareAtPrice'],
    }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object(productFields)
    .refine(
      (body) =>
        body.price === undefined ||
        body.compareAtPrice === undefined ||
        body.compareAtPrice > body.price,
      { message: 'compareAtPrice must be greater than price', path: ['compareAtPrice'] },
    ),
});
