const request = require('supertest');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let managerCookie, adminCookie, partnerCookie;
let managerUser, adminUser;

beforeAll(async () => {
  try {
    const p = await seedTestUser({ role: 'PARTNER' });
    partnerCookie = p.cookie;
    const m = await seedTestUser({ role: 'MANAGER' });
    managerUser = m.user; managerCookie = m.cookie;
    const a = await seedTestUser({ role: 'SUPER_ADMIN' });
    adminUser = a.user; adminCookie = a.cookie;
  } catch (err) {
    console.error('[dataIntegrity.beforeAll] error:', err);
    throw err;
  }
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('Financial calculation consistency', () => {
  it('sum of byCategory[].totalAmount equals response totalAmount (within ±0.01)', async () => {
    // Seed 3 expenses with amounts: UTILITIES=1000, SALARIES=2000, EVENTS=500 (total 3500)
    const now = new Date();
    await prisma.expense.deleteMany({ where: { status: 'CONFIRMED' } });
    await prisma.expense.createMany({
      data: [
        {
          description: 'Utilities',
          amount: 1000,
          date: new Date(now.getFullYear(), now.getMonth(), 5),
          category: 'UTILITIES',
          status: 'CONFIRMED',
          recordedBy: managerUser.id,
        },
        {
          description: 'Salaries',
          amount: 2000,
          date: new Date(now.getFullYear(), now.getMonth(), 10),
          category: 'SALARIES',
          status: 'CONFIRMED',
          recordedBy: managerUser.id,
        },
        {
          description: 'Events',
          amount: 500,
          date: new Date(now.getFullYear(), now.getMonth(), 15),
          category: 'EVENTS',
          status: 'CONFIRMED',
          recordedBy: managerUser.id,
        },
      ],
    });

    const res = await request(app).get('/api/expenses/summary').set('Cookie', managerCookie);
    const total = Number(res.body.data.totalAmount);
    const sumByCategory = res.body.data.byCategory.reduce(
      (acc, item) => acc + Number(item.totalAmount),
      0
    );
    expect(Math.abs(sumByCategory - total)).toBeLessThanOrEqual(0.01);
  });

  it('sum of byCategory[].pct equals 100 (within ±0.1)', async () => {
    const res = await request(app).get('/api/expenses/summary').set('Cookie', managerCookie);
    const sumPct = res.body.data.byCategory.reduce(
      (acc, item) => acc + Number(item.pct),
      0
    );
    expect(Math.abs(sumPct - 100)).toBeLessThanOrEqual(0.1);
  });
});

describe('Audit log creation', () => {
  // Use MANAGER cookie for tithe operations

  it('POST /api/tithes creates exactly one audit log with action="CREATE" and module="tithes"', async () => {
    const before = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'CREATE' },
    });
    await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'AuditTest1', amount: 100, date: '2024-05-01' });
    await wait(200);
    const after = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'CREATE' },
    });
    expect(after).toBe(before + 1);
  });

  it('PUT /api/tithes/:id creates exactly one audit log with action="UPDATE" and module="tithes"', async () => {
    // Create a tithe first
    const createRes = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'AuditTestUpdate', amount: 100, date: '2024-05-02' });
    const id = createRes.body.data.tithe.id;
    await wait(200);

    const before = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'UPDATE' },
    });
    await request(app).put(`/api/tithes/${id}`).set('Cookie', managerCookie).send({ amount: 200 });
    await wait(200);
    const after = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'UPDATE' },
    });
    expect(after).toBe(before + 1);
  });

  it('DELETE /api/tithes/:id creates exactly one audit log with action="DELETE" and module="tithes"', async () => {
    const createRes = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'AuditTestDelete', amount: 100, date: '2024-05-03' });
    const id = createRes.body.data.tithe.id;
    await wait(200);

    const before = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'DELETE' },
    });
    await request(app).delete(`/api/tithes/${id}`).set('Cookie', managerCookie);
    await wait(200);
    const after = await prisma.auditLog.count({
      where: { module: 'tithes', action: 'DELETE' },
    });
    expect(after).toBe(before + 1);
  });

  it('POST /api/auth/signin creates an audit log with action="LOGIN" and module="auth"', async () => {
    // Create a user with a known password
    const { user } = await seedTestUser({ password: 'Password123!' });
    const before = await prisma.auditLog.count({
      where: { module: 'auth', action: 'LOGIN' },
    });
    await request(app)
      .post('/api/auth/signin')
      .send({ email: user.email, password: 'Password123!' });
    // signin audit entry is created synchronously — but allow a small wait
    // to be safe.
    await wait(50);
    const after = await prisma.auditLog.count({
      where: { module: 'auth', action: 'LOGIN' },
    });
    expect(after).toBe(before + 1);
  });

  it('POST /api/auth/logout creates an audit log with action="LOGOUT" and module="auth"', async () => {
    const { cookie } = await seedTestUser();
    const before = await prisma.auditLog.count({
      where: { module: 'auth', action: 'LOGOUT' },
    });
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    await wait(50);
    const after = await prisma.auditLog.count({
      where: { module: 'auth', action: 'LOGOUT' },
    });
    expect(after).toBe(before + 1);
  });

  it('GET /api/tithes does NOT create any new audit log entries', async () => {
    const before = await prisma.auditLog.count({});
    await request(app).get('/api/tithes').set('Cookie', managerCookie);
    await wait(200);
    const after = await prisma.auditLog.count({});
    expect(after).toBe(before);
  });
});

describe('Pagination correctness', () => {
  beforeAll(async () => {
    // Clear and seed exactly 12 tithe records
    await prisma.tithe.deleteMany({});
    const records = Array.from({ length: 12 }, (_, i) => ({
      contributorName: `PageContrib${i}`,
      amount: 100 + i,
      date: new Date(2024, 0, i + 1),
      paymentMethod: 'CASH',
      status: 'CONFIRMED',
      recordedBy: managerUser.id,
    }));
    await prisma.tithe.createMany({ data: records });
  });

  it('GET /api/tithes?page=1&limit=5 returns exactly 5 records and total=12', async () => {
    const res = await request(app)
      .get('/api/tithes?page=1&limit=5')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithes.length).toBe(5);
    expect(res.body.data.total).toBe(12);
  });

  it('GET /api/tithes?page=3&limit=5 returns exactly 2 records (records 11 and 12)', async () => {
    const res = await request(app)
      .get('/api/tithes?page=3&limit=5')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithes.length).toBe(2);
  });

  it('GET /api/tithes?limit=101 returns limit=100 (clamped by MAX_LIMIT)', async () => {
    const res = await request(app)
      .get('/api/tithes?limit=101')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(100);
  });

  it('GET /api/tithes?page=999&limit=5 returns empty array (not an error)', async () => {
    const res = await request(app)
      .get('/api/tithes?page=999&limit=5')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithes).toEqual([]);
  });
});

describe('passwordHash never exposed in API responses', () => {
  it('GET /api/auth/me — JSON.stringify(res.body) does not contain "passwordHash"', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('POST /api/auth/signin — JSON.stringify(res.body) does not contain "passwordHash"', async () => {
    const { user } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: user.email, password: 'Password123!' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('POST /api/auth/signup — JSON.stringify(res.body) does not contain "passwordHash"', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `phsh_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'P',
      lastName: 'H',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('GET /api/users — no user object in list has key "passwordHash"', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});
