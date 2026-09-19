import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPasswordHandler,
  updateMe,
} from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), asyncHandler(register));
authRouter.post('/login', loginRateLimiter, validate(loginSchema), asyncHandler(login));
authRouter.post('/refresh', asyncHandler(refresh));
authRouter.post('/logout', asyncHandler(logout));
authRouter.get('/me', authenticate, asyncHandler(me));
authRouter.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(updateMe));
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(forgotPassword),
);
authRouter.post(
  '/reset-password',
  passwordResetRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);
