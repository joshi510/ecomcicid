import type { Request, Response } from 'express';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from '../services/auth.service.js';
import { mergeGuestCartFromRequest } from '../services/cart.service.js';
import { readRefreshCookie } from '../utils/cookies.js';
import { sendSuccess } from '../utils/response.js';

export async function register(req: Request, res: Response) {
  const data = await registerUser(req.body, res);
  await mergeGuestCartFromRequest(data.user.id, req, res);
  sendSuccess(res, data, 'Account created', 201);
}

export async function login(req: Request, res: Response) {
  const data = await loginUser(req.body, res);
  await mergeGuestCartFromRequest(data.user.id, req, res);
  sendSuccess(res, data, 'Logged in');
}

export async function refresh(req: Request, res: Response) {
  const data = await refreshSession(readRefreshCookie(req), res);
  sendSuccess(res, data, 'Session refreshed');
}

export async function logout(req: Request, res: Response) {
  await logoutUser(readRefreshCookie(req), res);
  sendSuccess(res, null, 'Logged out');
}

export async function me(req: Request, res: Response) {
  const data = await getCurrentUser(req.user!.id);
  sendSuccess(res, { user: data }, 'Authenticated');
}

export async function updateMe(req: Request, res: Response) {
  const data = await updateProfile(req.user!.id, req.body);
  sendSuccess(res, { user: data }, 'Profile updated');
}

export async function forgotPassword(req: Request, res: Response) {
  await requestPasswordReset(req.body.email);
  sendSuccess(
    res,
    null,
    'If an account exists for that email, password reset instructions have been sent',
  );
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await resetPassword(req.body.token, req.body.password);
  sendSuccess(res, null, 'Password updated');
}
