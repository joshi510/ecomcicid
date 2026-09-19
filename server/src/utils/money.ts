import { Prisma } from '@prisma/client';

export function money(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function moneyString(value: Prisma.Decimal | number | string): string {
  return money(value).toFixed(2);
}
