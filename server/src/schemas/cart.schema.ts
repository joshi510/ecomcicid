import { z } from 'zod';

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(99).default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    itemId: z.string().uuid(),
  }),
  body: z.object({
    quantity: z.coerce.number().int().min(0).max(99),
  }),
});

export const cartItemIdSchema = z.object({
  params: z.object({
    itemId: z.string().uuid(),
  }),
});

export const syncCartSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(99),
        }),
      )
      .max(50),
  }),
});
