import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { clearCartCookie, readCartToken, setCartCookie } from '../utils/cookies.js';
import { generateOpaqueToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { money, moneyString } from '../utils/money.js';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stockQuantity: true,
          isActive: true,
          sku: true,
        },
      },
    },
  },
};

function serializeCart(
  cart: Awaited<ReturnType<typeof prisma.cart.findFirstOrThrow>> & {
    guestToken?: string | null;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        slug: string;
        price: { toString(): string };
        images: string[];
        stockQuantity: number;
        isActive: boolean;
        sku: string;
      };
    }>;
  },
) {
  const items = cart.items.map((item) => {
    const unitPrice = money(item.product.price.toString());
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: moneyString(unitPrice),
      lineTotal: moneyString(unitPrice.mul(item.quantity)),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku,
        price: moneyString(item.product.price.toString()),
        images: item.product.images,
        stockQuantity: item.product.stockQuantity,
        isActive: item.product.isActive,
      },
    };
  });

  const subtotal = items.reduce((sum, item) => sum.add(money(item.lineTotal)), money(0));

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: moneyString(subtotal),
    ...(cart.guestToken ? { cartToken: cart.guestToken } : {}),
  };
}

async function loadCart(cartId: string) {
  return prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: cartInclude,
  });
}

export async function resolveCart(req: Request, res: Response) {
  const userId = req.user?.id;
  const guestToken = readCartToken(req);

  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: cartInclude,
      });
    }

    if (guestToken) {
      await mergeGuestCartIntoUser(userId, guestToken);
      clearCartCookie(res);
      cart = await loadCart(cart.id);
    }

    return cart;
  }

  if (guestToken) {
    const existing = await prisma.cart.findUnique({
      where: { guestToken },
      include: cartInclude,
    });
    if (existing) {
      setCartCookie(res, guestToken);
      return existing;
    }
  }

  const token = guestToken ?? generateOpaqueToken();
  const cart = await prisma.cart.create({
    data: { guestToken: token },
    include: cartInclude,
  });
  setCartCookie(res, token);
  return cart;
}

export async function mergeGuestCartIntoUser(userId: string, guestToken: string) {
  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });

  if (!guestCart || guestCart.userId === userId) {
    return;
  }

  let userCart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }

  if (guestCart.id === userCart.id) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of guestCart.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stockQuantity: true, isActive: true },
      });
      if (!product?.isActive) {
        continue;
      }

      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      });
      const nextQty = Math.min(
        (existing?.quantity ?? 0) + item.quantity,
        product.stockQuantity,
        99,
      );

      if (nextQty <= 0) {
        continue;
      }

      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        create: { cartId: userCart.id, productId: item.productId, quantity: nextQty },
        update: { quantity: nextQty },
      });
    }

    await tx.cart.delete({ where: { id: guestCart.id } });
  });
}

export async function mergeGuestCartFromRequest(userId: string, req: Request, res: Response) {
  const guestToken = readCartToken(req);
  if (!guestToken) {
    return;
  }

  try {
    await mergeGuestCartIntoUser(userId, guestToken);
    clearCartCookie(res);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to merge guest cart after authentication');
  }
}

export async function getCart(req: Request, res: Response) {
  const cart = await resolveCart(req, res);
  return serializeCart(await loadCart(cart.id));
}

export async function addCartItem(
  req: Request,
  res: Response,
  input: { productId: string; quantity: number },
) {
  const cart = await resolveCart(req, res);
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, isActive: true, stockQuantity: true, name: true },
  });

  if (!product || !product.isActive) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
  });
  const nextQty = (existing?.quantity ?? 0) + input.quantity;

  if (nextQty > product.stockQuantity) {
    throw new AppError(
      409,
      `Only ${product.stockQuantity} of ${product.name} in stock`,
      'OUT_OF_STOCK',
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
    create: { cartId: cart.id, productId: input.productId, quantity: nextQty },
    update: { quantity: nextQty },
  });

  return serializeCart(await loadCart(cart.id));
}

export async function updateCartItem(
  req: Request,
  res: Response,
  itemId: string,
  quantity: number,
) {
  const cart = await resolveCart(req, res);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: { select: { name: true, stockQuantity: true, isActive: true } } },
  });

  if (!item) {
    throw new AppError(404, 'Cart item not found', 'NOT_FOUND');
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return serializeCart(await loadCart(cart.id));
  }

  if (!item.product.isActive || quantity > item.product.stockQuantity) {
    throw new AppError(
      409,
      `Only ${item.product.stockQuantity} of ${item.product.name} in stock`,
      'OUT_OF_STOCK',
    );
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return serializeCart(await loadCart(cart.id));
}

export async function removeCartItem(req: Request, res: Response, itemId: string) {
  const cart = await resolveCart(req, res);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: { id: true },
  });

  if (!item) {
    throw new AppError(404, 'Cart item not found', 'NOT_FOUND');
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  return serializeCart(await loadCart(cart.id));
}

export async function syncCart(
  req: Request,
  res: Response,
  items: Array<{ productId: string; quantity: number }>,
) {
  const cart = await resolveCart(req, res);

  await prisma.$transaction(async (tx) => {
    for (const incoming of items) {
      const product = await tx.product.findUnique({
        where: { id: incoming.productId },
        select: { isActive: true, stockQuantity: true },
      });
      if (!product?.isActive) {
        continue;
      }

      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: incoming.productId } },
      });
      const nextQty = Math.min(
        (existing?.quantity ?? 0) + incoming.quantity,
        product.stockQuantity,
        99,
      );
      if (nextQty <= 0) {
        continue;
      }

      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: incoming.productId } },
        create: { cartId: cart.id, productId: incoming.productId, quantity: nextQty },
        update: { quantity: nextQty },
      });
    }
  });

  return serializeCart(await loadCart(cart.id));
}

export async function clearCartById(
  cartId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  await tx.cartItem.deleteMany({ where: { cartId } });
}
