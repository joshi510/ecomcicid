import { AddressType, OrderStatus } from '@prisma/client';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

export const addressBodySchema = z.object({
  type: z.nativeEnum(AddressType).optional(),
  line1: z.string().trim().min(1).max(160),
  line2: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
  city: z.string().trim().min(1).max(80),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().length(2).toUpperCase(),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
});

export const createOrderSchema = z
  .object({
    body: z.object({
      shippingAddressId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
      billingAddressId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
      shippingAddress: addressBodySchema.optional(),
      billingAddress: addressBodySchema.optional(),
      sameBillingAsShipping: z.boolean().optional(),
      couponCode: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(40).optional()),
    }),
  })
  .refine((value) => Boolean(value.body.shippingAddressId || value.body.shippingAddress), {
    message: 'Provide shippingAddressId or shippingAddress',
    path: ['body', 'shippingAddress'],
  })
  .refine(
    (value) =>
      Boolean(
        value.body.billingAddressId ||
        value.body.billingAddress ||
        value.body.sameBillingAsShipping ||
        value.body.shippingAddressId ||
        value.body.shippingAddress,
      ),
    {
      message: 'Provide billing address details or sameBillingAsShipping',
      path: ['body', 'billingAddress'],
    },
  );

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    status: z.nativeEnum(OrderStatus).optional(),
  }),
});

export const orderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listAdminOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(OrderStatus).optional(),
    userId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.nativeEnum(OrderStatus),
    note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  }),
});
