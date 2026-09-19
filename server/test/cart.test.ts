import request from 'supertest';
import { cleanupTestData, getApp, isDatabaseAvailable, itDb, seedCatalog } from './helpers.js';

describe('cart API', () => {
  afterAll(async () => {
    if (await isDatabaseAvailable()) {
      await cleanupTestData();
    }
  });

  itDb('adds a product as a guest, then rejects overselling', async () => {
    const { product } = await seedCatalog();
    const agent = request.agent(getApp());

    const added = await agent.post('/api/cart/items').send({ productId: product.id, quantity: 2 });
    expect(added.status).toBe(200);
    expect(added.body.data.itemCount).toBe(2);
    expect(added.body.data.items[0].productId).toBe(product.id);
    expect(added.headers['set-cookie']?.join(';')).toContain('cart_token=');

    const cart = await agent.get('/api/cart');
    expect(cart.status).toBe(200);
    expect(cart.body.data.items).toHaveLength(1);

    const oversell = await agent
      .post('/api/cart/items')
      .send({ productId: product.id, quantity: 20 });
    expect(oversell.status).toBe(409);
    expect(oversell.body.error.code).toBe('OUT_OF_STOCK');
  });

  itDb('reuses a guest cart from X-Cart-Token when the cookie is missing', async () => {
    const { product } = await seedCatalog();

    const added = await request(getApp())
      .post('/api/cart/items')
      .send({ productId: product.id, quantity: 1 });
    expect(added.status).toBe(200);
    expect(added.body.data.cartToken).toEqual(expect.any(String));

    const cart = await request(getApp())
      .get('/api/cart')
      .set('X-Cart-Token', added.body.data.cartToken);
    expect(cart.status).toBe(200);
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.items[0].productId).toBe(product.id);
  });

  itDb('rejects an unknown product and invalid payloads', async () => {
    const missing = await request(getApp())
      .post('/api/cart/items')
      .send({ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 });
    expect(missing.status).toBe(404);

    const invalid = await request(getApp())
      .post('/api/cart/items')
      .send({ productId: 'not-valid', quantity: 1 });
    expect(invalid.status).toBe(400);
  });
});
