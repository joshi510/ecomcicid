import { AddressType } from '@prisma/client';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

export const addressIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const addressFields = {
  type: z.nativeEnum(AddressType).optional(),
  line1: z.string().trim().min(1).max(160),
  line2: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
  city: z.string().trim().min(1).max(80),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().length(2).toUpperCase(),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object({
  body: z.object(addressFields),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    type: z.nativeEnum(AddressType).optional(),
    line1: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(160).optional()),
    line2: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional().nullable()),
    city: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    state: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional().nullable()),
    postalCode: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(20).optional()),
    country: z.preprocess(emptyToUndefined, z.string().trim().length(2).toUpperCase().optional()),
    phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional().nullable()),
    isDefault: z.boolean().optional(),
  }),
});
