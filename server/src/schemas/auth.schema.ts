import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required').max(72),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.preprocess(
        (value) => (value === '' || value === null ? undefined : value),
        z.string().trim().min(2).max(80).optional(),
      ),
      email: z.preprocess(
        (value) => (value === '' || value === null ? undefined : value),
        z.string().trim().toLowerCase().email().optional(),
      ),
    })
    .refine((body) => body.name !== undefined || body.email !== undefined, {
      message: 'Provide a name or email to update',
    }),
});
