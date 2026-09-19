import request from 'supertest';
import {
  cleanupTestData,
  getApp,
  isDatabaseAvailable,
  itDb,
  registerUser,
  TEST_PASSWORD,
  uniqueLabel,
} from './helpers.js';

describe('auth API', () => {
  afterAll(async () => {
    if (await isDatabaseAvailable()) {
      await cleanupTestData();
    }
  });

  itDb('registers a customer and returns an access token', async () => {
    const { response, email } = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe('CUSTOMER');
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie']?.join(';')).toContain('refresh_token=');
  });

  itDb('rejects a duplicate email', async () => {
    const email = `${uniqueLabel('dup')}@example.com`;
    await registerUser({ email });
    const second = await registerUser({ email });

    expect(second.response.status).toBe(409);
    expect(second.response.body.error.code).toBe('EMAIL_TAKEN');
  });

  itDb('logs in with valid credentials and rejects a bad password', async () => {
    const { email } = await registerUser();

    const ok = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));

    const bad = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'Wrongpass1!' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  itDb('returns the current user from /me and rejects a missing token', async () => {
    const { accessToken } = await registerUser();

    const me = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toEqual(expect.any(String));

    const anon = await request(getApp()).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });
});
