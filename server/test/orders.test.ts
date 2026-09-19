import request from 'supertest';
import {
  cleanupTestData,
  getApp,
  isDatabaseAvailable,
  itDb,
  registerUser,
  seedCatalog,
} from './helpers.js';

const shippingAddress = {
  line1: '100 Market Street',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
};

describe('orders API', () => {
  afterAll(async () => {
    if (await isDatabaseAvailable()) {
      await cleanupTestData();
    }
  });

  itDb('creates an order from a cart and returns it to the owner', async () => {
    const { product } = await seedCatalog();
    const { accessToken } = await registerUser();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const cart = await request(getApp())
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: product.id, quantity: 1 });
    expect(cart.status).toBe(200);

    const created = await request(getApp())
      .post('/api/orders')
      .set(auth)
      .send({ shippingAddress, sameBillingAsShipping: true });

    expect(created.status).toBe(201);
    expect(created.body.data.orderNumber).toMatch(/^ORD-/);
    expect(created.body.data.items).toHaveLength(1);
    expect(Number(created.body.data.total)).toBeGreaterThan(0);

    const fetched = await request(getApp())
      .get(`/api/orders/${created.body.data.id}`)
      .set(auth);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(created.body.data.id);

    const emptied = await request(getApp()).get('/api/cart').set(auth);
    expect(emptied.body.data.items).toHaveLength(0);
  });

  itDb('rejects checkout without auth, with an empty cart, or with a bad address', async () => {
    const anon = await request(getApp())
      .post('/api/orders')
      .send({ shippingAddress, sameBillingAsShipping: true });
    expect(anon.status).toBe(401);

    const { accessToken } = await registerUser();
    const empty = await request(getApp())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ shippingAddress, sameBillingAsShipping: true });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('CART_EMPTY');

    const invalid = await request(getApp())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sameBillingAsShipping: true });
    expect(invalid.status).toBe(400);
  });

  itDb('does not let another customer read an order', async () => {
    const { product } = await seedCatalog();
    const owner = await registerUser();
    const stranger = await registerUser();

    await request(getApp())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantity: 1 });

    const created = await request(getApp())
      .post('/api/orders')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ shippingAddress, sameBillingAsShipping: true });

    const blocked = await request(getApp())
      .get(`/api/orders/${created.body.data.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(blocked.status).toBe(404);
  });
});
