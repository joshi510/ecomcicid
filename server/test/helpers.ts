import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma/client.js';

export const TEST_PASSWORD = 'Testpass1!';
export const TEST_PREFIX = 'e2e-';

let app: Express | null = null;
let dbAvailable: boolean | null = null;
let warned = false;

export function getApp() {
  if (!app) {
    app = createApp();
  }
  return app;
}

export async function isDatabaseAvailable() {
  if (dbAvailable !== null) {
    return dbAvailable;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

export function itDb(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (!(await isDatabaseAvailable())) {
      if (!warned) {
        warned = true;
        process.stderr.write(
          'Skipping API integration tests — PostgreSQL is not reachable. Schema tests still run.\n',
        );
      }
      return;
    }
    await fn();
  });
}

export function uniqueLabel(label: string) {
  return `${TEST_PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function registerUser(overrides?: { name?: string; email?: string; password?: string }) {
  const email = overrides?.email ?? `${uniqueLabel('user')}@example.com`;
  const response = await request(getApp())
    .post('/api/auth/register')
    .send({
      name: overrides?.name ?? 'Test Buyer',
      email,
      password: overrides?.password ?? TEST_PASSWORD,
    });

  return {
    response,
    email,
    accessToken: response.body.data?.accessToken as string | undefined,
    userId: response.body.data?.user?.id as string | undefined,
    cookies: response.headers['set-cookie'] as string[] | undefined,
  };
}

export async function seedCatalog() {
  const slug = uniqueLabel('cat');
  const sku = `E2E${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const category = await prisma.category.create({
    data: { name: 'Test Category', slug },
  });
  const product = await prisma.product.create({
    data: {
      name: 'Test Lounge Chair',
      slug: uniqueLabel('product'),
      description: 'A chair used only in automated tests.',
      price: 120,
      sku,
      stockQuantity: 8,
      images: ['https://example.com/chair.jpg'],
      categoryId: category.id,
      isActive: true,
    },
  });

  return { category, product };
}

export async function cleanupTestData() {
  await prisma.payment.deleteMany({
    where: { order: { user: { email: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.order.deleteMany({
    where: { user: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.product.deleteMany({
    where: { OR: [{ sku: { startsWith: 'E2E' } }, { slug: { startsWith: TEST_PREFIX } }] },
  });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX } },
  });
}
