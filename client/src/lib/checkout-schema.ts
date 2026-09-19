import { z } from 'zod';

export const shippingSchema = z.object({
  line1: z.string().trim().min(1, 'Street address is required').max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().min(2, 'Postal code is required').max(20),
  country: z.string().trim().length(2, 'Use a 2-letter country code'),
  phone: z.string().trim().max(30).optional(),
});

export type ShippingValues = z.infer<typeof shippingSchema>;
