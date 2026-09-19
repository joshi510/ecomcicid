import request from 'supertest';
import { cleanupTestData, getApp, isDatabaseAvailable, itDb, seedCatalog } from './helpers.js';

describe('products API', () => {
  afterAll(async () => {
    if (await isDatabaseAvailable()) {
      await cleanupTestData();
    }
  });

  itDb('lists seeded products and fetches a product by slug', async () => {
    const { product } = await seedCatalog();

    const list = await request(getApp()).get('/api/products?limit=50');
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data.products.some((item: { id: string }) => item.id === product.id)).toBe(
      true,
    );

    const detail = await request(getApp()).get(`/api/products/${product.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.name).toBe(product.name);
    expect(detail.body.data.reviewSummary).toEqual({ average: 0, count: 0 });
  });

  itDb('returns 404 for an unknown product slug', async () => {
    const missing = await request(getApp()).get('/api/products/does-not-exist-e2e');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  itDb('rejects invalid list query params', async () => {
    const response = await request(getApp()).get('/api/products?minPrice=99&maxPrice=1');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
