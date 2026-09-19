import type { User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { clearRefreshCookie, setRefreshCookie } from '../utils/cookies.js';
import { generateOpaqueToken, hashToken } from '../utils/crypto.js';
import { durationToMs } from '../utils/duration.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from './email.service.js';

const BCRYPT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};

function toPublicUser(
  user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>,
): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function persistRefreshToken(userId: string, refreshToken: string) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });
}

async function issueSession(
  user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>,
  res: Response,
) {
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await persistRefreshToken(user.id, refreshToken);
  setRefreshCookie(res, refreshToken);

  return {
    user: toPublicUser(user),
    accessToken,
  } satisfies AuthResult;
}

async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function registerUser(
  input: { name: string; email: string; password: string },
  res: Response,
): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'CUSTOMER',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return issueSession(user, res);
}

export async function loginUser(
  input: { email: string; password: string },
  res: Response,
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return issueSession(user, res);
}

export async function refreshSession(
  refreshToken: string | undefined,
  res: Response,
): Promise<AuthResult> {
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token missing', 'INVALID_REFRESH_TOKEN');
  }

  const userId = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      },
    },
  });

  if (
    !stored ||
    stored.userId !== userId ||
    stored.revokedAt ||
    stored.expiresAt.getTime() <= Date.now()
  ) {
    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }
    clearRefreshCookie(res);
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(stored.user, res);
}

export async function logoutUser(refreshToken: string | undefined, res: Response) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearRefreshCookie(res);
}

export async function updateProfile(
  userId: string,
  input: { name?: string; email?: string },
): Promise<PublicUser> {
  if (input.email) {
    const taken = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      throw new AppError(409, 'Email is already in use', 'EMAIL_TAKEN');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return toPublicUser(user);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
  }

  return toPublicUser(user);
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    return;
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token: string, password: string) {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
