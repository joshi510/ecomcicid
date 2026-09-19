import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const userId = verifyAccessToken(header.slice(7).trim());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
