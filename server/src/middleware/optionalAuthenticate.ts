import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const userId = verifyAccessToken(header.slice(7).trim());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (user) {
      req.user = user;
    }
  } catch {
    // Public catalog routes ignore invalid tokens instead of failing the request.
  }

  next();
}
