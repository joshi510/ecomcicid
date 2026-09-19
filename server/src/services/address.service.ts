import { AddressType } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';

type AddressInput = {
  type?: AddressType;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault?: boolean;
};

function serializeAddress(address: {
  id: string;
  type: AddressType;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return address;
}

async function clearDefault(userId: string, type: AddressType, exceptId?: string) {
  await prisma.address.updateMany({
    where: {
      userId,
      type,
      isDefault: true,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}

export async function listAddresses(userId: string) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return { addresses: addresses.map(serializeAddress) };
}

export async function createAddress(userId: string, input: AddressInput) {
  const type = input.type ?? AddressType.SHIPPING;
  const count = await prisma.address.count({ where: { userId } });
  const isDefault = input.isDefault ?? count === 0;

  if (isDefault) {
    await clearDefault(userId, type);
  }

  const address = await prisma.address.create({
    data: {
      userId,
      type,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      phone: input.phone,
      isDefault,
    },
  });

  return serializeAddress(address);
}

export async function updateAddress(userId: string, id: string, input: Partial<AddressInput>) {
  const existing = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new AppError(404, 'Address not found', 'NOT_FOUND');
  }

  const type = input.type ?? existing.type;
  if (input.isDefault) {
    await clearDefault(userId, type, id);
  }

  const address = await prisma.address.update({
    where: { id },
    data: {
      type: input.type,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      phone: input.phone,
      isDefault: input.isDefault,
    },
  });

  return serializeAddress(address);
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { shippingOrders: true, billingOrders: true } },
    },
  });

  if (!existing) {
    throw new AppError(404, 'Address not found', 'NOT_FOUND');
  }

  if (existing._count.shippingOrders > 0 || existing._count.billingOrders > 0) {
    throw new AppError(
      409,
      'This address is used by an existing order and cannot be deleted',
      'ADDRESS_IN_USE',
    );
  }

  await prisma.address.delete({ where: { id } });
  return { id };
}
