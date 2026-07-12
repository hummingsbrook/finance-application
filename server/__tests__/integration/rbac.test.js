const request = require('supertest');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

// We need to seed one of each role once and reuse the cookies.
let partnerCookie, managerCookie, adminCookie;
let partnerUser, managerUser, adminUser;

beforeAll(async () => {
  const p = await seedTestUser({ role: 'PARTNER' });
  partnerUser = p.user; partnerCookie = p.cookie;
  const m = await seedTestUser({ role: 'MANAGER' });
  managerUser = m.user; managerCookie = m.cookie;
  const a = await seedTestUser({ role: 'SUPER_ADMIN' });
  adminUser = a.user; adminCookie = a.cookie;
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('PARTNER blocked endpoints — expect 403 FORBIDDEN', () => {
  it('GET /api/tithes', async () => {
    const res = await request(app).get('/api/tithes').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/tithes', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', partnerCookie)
      .send({ contributorName: 'X', amount: 100, date: '2024-01-01' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/offerings', async () => {
    const res = await request(app).get('/api/offerings').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/offerings', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', partnerCookie)
      .send({ contributorName: 'X', amount: 100, date: '2024-01-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/expenses', async () => {
    const res = await request(app).get('/api/expenses').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/expenses', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Cookie', partnerCookie)
      .send({ description: 'X', amount: 100, date: '2024-01-01', category: 'UTILITIES' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/reports/dashboard', async () => {
    const res = await request(app).get('/api/reports/dashboard').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/reports/summary', async () => {
    const res = await request(app).get('/api/reports/summary').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/payments/:id/confirm (use id="nonexistent-id")', async () => {
    const res = await request(app)
      .put('/api/payments/nonexistent-id/confirm')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/payments/:id/reject (use id="nonexistent-id")', async () => {
    const res = await request(app)
      .put('/api/payments/nonexistent-id/reject')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('MANAGER blocked endpoints — expect 403 FORBIDDEN', () => {
  it('GET /api/users', async () => {
    const res = await request(app).get('/api/users').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/users', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', managerCookie)
      .send({
        email: `mgr_create_${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'M',
        lastName: 'C',
        role: 'PARTNER',
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/audit/logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/audit/login-history', async () => {
    const res = await request(app).get('/api/audit/login-history').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/expenses/oversight', async () => {
    const res = await request(app).get('/api/expenses/oversight').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/expenses/nonexistent-id/approve', async () => {
    const res = await request(app)
      .put('/api/expenses/nonexistent-id/approve')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/expenses/nonexistent-id/reject', async () => {
    const res = await request(app)
      .put('/api/expenses/nonexistent-id/reject')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', managerCookie)
      .send({ someKey: 'someValue' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/settings/mpesa', async () => {
    const res = await request(app).get('/api/settings/mpesa').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/settings/backup', async () => {
    const res = await request(app).post('/api/settings/backup').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('Unauthenticated requests — expect 401 AUTH_MISSING', () => {
  it('GET /api/tithes', async () => {
    const res = await request(app).get('/api/tithes');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/offerings', async () => {
    const res = await request(app).get('/api/offerings');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/expenses', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/reports/dashboard', async () => {
    const res = await request(app).get('/api/reports/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/audit/logs', async () => {
    const res = await request(app).get('/api/audit/logs');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /api/settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });
});

describe('PARTNER can access own payment endpoints', () => {
  it('POST /api/payments returns 201 (not 403) for PARTNER', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 100, paymentType: 'TITHE' });
    expect(res.status).toBe(201);
  });

  it('GET /api/payments/my returns 200 (not 403) for PARTNER', async () => {
    const res = await request(app).get('/api/payments/my').set('Cookie', partnerCookie);
    expect(res.status).toBe(200);
  });
});
