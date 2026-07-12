const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

let partnerCookie, managerCookie, adminCookie;
let partnerUser, managerUser, adminUser;

beforeAll(async () => {
  try {
    const p = await seedTestUser({ role: 'PARTNER' });
    partnerUser = p.user; partnerCookie = p.cookie;
    const m = await seedTestUser({ role: 'MANAGER' });
    managerUser = m.user; managerCookie = m.cookie;
    const a = await seedTestUser({ role: 'SUPER_ADMIN' });
    adminUser = a.user; adminCookie = a.cookie;
  } catch (err) {
    console.error('[reports-users-audit-settings.beforeAll] error:', err);
    throw err;
  }
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('GET /api/reports/dashboard', () => {
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/reports/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('returns 403 for PARTNER token', async () => {
    const res = await request(app).get('/api/reports/dashboard').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for MANAGER token', async () => {
    const res = await request(app).get('/api/reports/dashboard').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('response has success: true', async () => {
    const res = await request(app).get('/api/reports/dashboard').set('Cookie', managerCookie);
    expect(res.body.success).toBe(true);
  });

  it('accepts ?year and ?month query params without error', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard?year=2024&month=6')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/summary', () => {
  it('returns 200 for MANAGER', async () => {
    const res = await request(app).get('/api/reports/summary').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('PARTNER returns 403', async () => {
    const res = await request(app).get('/api/reports/summary').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/reports/breakdown', () => {
  it('returns 200 for MANAGER', async () => {
    const res = await request(app).get('/api/reports/breakdown').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/trend', () => {
  it('returns 200 for MANAGER', async () => {
    const res = await request(app).get('/api/reports/trend').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/financial-summary', () => {
  it('returns 200 for MANAGER', async () => {
    const res = await request(app).get('/api/reports/financial-summary').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/monthly/:year/:month', () => {
  it('returns 200 for valid year/month (e.g. /2024/6)', async () => {
    const res = await request(app).get('/api/reports/monthly/2024/6').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/users', () => {
  it('returns 403 for MANAGER token', async () => {
    const res = await request(app).get('/api/users').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for SUPER_ADMIN with a list', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });

  it('no user object in the list contains "passwordHash"', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('POST /api/users', () => {
  it('returns 403 for MANAGER token', async () => {
    const res = await request(app).post('/api/users').set('Cookie', managerCookie).send({
      email: `x_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'X',
      lastName: 'Y',
      role: 'PARTNER',
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 409 EMAIL_EXISTS when email already registered', async () => {
    const existing = await prisma.user.create({
      data: {
        email: `exists_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'E',
        lastName: 'X',
        role: 'PARTNER',
      },
    });
    const res = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      email: existing.email,
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
      role: 'PARTNER',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookie).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 with the created user at the specified role (e.g. "MANAGER")', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      email: `newmgr_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'New',
      lastName: 'Mgr',
      role: 'MANAGER',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('MANAGER');
  });
});

describe('PUT /api/users/:id', () => {
  let targetUser;
  beforeAll(async () => {
    targetUser = await prisma.user.create({
      data: {
        email: `updatee_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Up',
        lastName: 'Datee',
        role: 'PARTNER',
        isActive: true,
      },
    });
  });

  it('returns 200 with updated user for SUPER_ADMIN', async () => {
    const res = await request(app)
      .put(`/api/users/${targetUser.id}`)
      .set('Cookie', adminCookie)
      .send({ firstName: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('Updated');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/users/nonexistent-id')
      .set('Cookie', adminCookie)
      .send({ firstName: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('can set isActive to false', async () => {
    const res = await request(app)
      .put(`/api/users/${targetUser.id}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.user.isActive).toBe(false);
  });
});

describe('GET /api/audit/logs', () => {
  beforeAll(async () => {
    // Seed an audit log with module=tithes action=CREATE
    await prisma.auditLog.create({
      data: {
        userId: managerUser.id,
        action: 'CREATE',
        module: 'tithes',
        details: 'Test audit entry',
        ipAddress: '127.0.0.1',
      },
    });
  });

  it('returns 403 for MANAGER token', async () => {
    const res = await request(app).get('/api/audit/logs').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for SUPER_ADMIN with paginated logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  it('supports filter by ?module=tithes', async () => {
    const res = await request(app)
      .get('/api/audit/logs?module=tithes')
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    for (const log of res.body.data.logs) {
      expect(log.module).toBe('tithes');
    }
  });

  it('supports filter by ?action=CREATE', async () => {
    const res = await request(app)
      .get('/api/audit/logs?action=CREATE')
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    for (const log of res.body.data.logs) {
      expect(log.action).toBe('CREATE');
    }
  });
});

describe('GET /api/audit/login-history', () => {
  it('returns 403 for MANAGER token', async () => {
    const res = await request(app).get('/api/audit/login-history').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for SUPER_ADMIN', async () => {
    const res = await request(app).get('/api/audit/login-history').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/settings', () => {
  it('returns 200 for PARTNER (any authenticated user can read)', async () => {
    const res = await request(app).get('/api/settings').set('Cookie', partnerCookie);
    expect(res.status).toBe(200);
  });

  it('returns 200 for MANAGER', async () => {
    const res = await request(app).get('/api/settings').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('returns 200 for SUPER_ADMIN', async () => {
    const res = await request(app).get('/api/settings').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/settings', () => {
  it('returns 403 for MANAGER', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', managerCookie)
      .send({ someKey: 'someValue' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 403 for PARTNER', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', partnerCookie)
      .send({ someKey: 'someValue' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for SUPER_ADMIN', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', adminCookie)
      .send({ churchName: 'Test Church' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/settings/mpesa', () => {
  it('returns 403 for MANAGER', async () => {
    const res = await request(app).get('/api/settings/mpesa').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 403 for PARTNER', async () => {
    const res = await request(app).get('/api/settings/mpesa').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for SUPER_ADMIN', async () => {
    const res = await request(app).get('/api/settings/mpesa').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/settings/backup', () => {
  it('returns 403 for MANAGER', async () => {
    const res = await request(app).post('/api/settings/backup').set('Cookie', managerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 403 for PARTNER', async () => {
    const res = await request(app).post('/api/settings/backup').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns non-5xx (200 or 202) for SUPER_ADMIN', async () => {
    const res = await request(app).post('/api/settings/backup').set('Cookie', adminCookie);
    expect(res.status).toBeLessThan(500);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
