import request from 'supertest';
import app from '../src/app.js';
import { it, expect } from 'vitest';

it('healthz ok', async () => {
  const res = await request(app).get('/healthz');
  expect(res.status).toBe(200);
  expect(res.text).toBe('ok');
});
it('GET / returns service info', async () => {
  const res = await request(app).get('/');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, name: 'zono-api' });
});
it('blocks /admin without auth', async () => {
  const res = await request(app).get('/admin/tenants');
  expect([401, 403]).toContain(res.status);
});
