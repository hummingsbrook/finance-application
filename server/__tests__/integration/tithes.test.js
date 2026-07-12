const request = require('supertest');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

let managerCookie, adminCookie, partnerCookie;
let managerUser, adminUser;
const createdTitheIds = [];

beforeAll(async () => {
  try {
    const p = await seedTestUser({ role: 'PARTNER' });
    partnerCookie = p.cookie;
    const m = await seedTestUser({ role: 'MANAGER' });
    managerUser = m.user; managerCookie = m.cookie;
    const a = await seedTestUser({ role: 'SUPER_ADMIN' });
    adminUser = a.user; adminCookie = a.cookie;

    // Seed 15 tithe records attributed to the manager
    const records = Array.from({ length: 15 }, (_, i) => ({
      contributorName: `SeedContrib${i}`,
      amount: 100 + i,
      date: new Date(2024, 0, i + 1),
      paymentMethod: 'CASH',
      status: 'CONFIRMED',
      recordedBy: managerUser.id,
    }));
    await prisma.tithe.createMany({ data: records });
  } catch (err) {
    console.error('[tithes.beforeAll] error:', err);
    throw err;
  }
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('GET /api/tithes', () => {
  it('returns 200 with { success: true, data: { tithes, total, page, limit } }', async () => {
    const res = await request(app).get('/api/tithes').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.tithes)).toBe(true);
    expect(res.body.data.total).toBe(15);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });

  it('default page=1, limit=20 when no query params', async () => {
    const res = await request(app).get('/api/tithes').set('Cookie', managerCookie);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });

  it('respects ?page=2&limit=5 — returns 5 records and total=15', async () => {
    const res = await request(app)
      .get('/api/tithes?page=2&limit=5')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithes.length).toBe(5);
    expect(res.body.data.total).toBe(15);
  });

  it('filters by ?startDate and ?endDate — only records in range returned', async () => {
    // Seed range covers Jan 1–15, 2024. Filter Jan 5–10 inclusive lower bound,
    // exclusive upper bound (service uses lt for endDate).
    const res = await request(app)
      .get('/api/tithes?startDate=2024-01-05&endDate=2024-01-11')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    // Jan 5,6,7,8,9,10 → 6 records
    expect(res.body.data.tithes.length).toBe(6);
  });

  it('filters by ?contributorName — partial match search works', async () => {
    const res = await request(app)
      .get('/api/tithes?contributorName=SeedContrib1')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    // "SeedContrib1" matches SeedContrib1, SeedContrib10..14 (partial contains)
    expect(res.body.data.tithes.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array (not error) when no records match filter', async () => {
    const res = await request(app)
      .get('/api/tithes?contributorName=NoSuchContributorXYZ123')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithes).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('PARTNER token returns 403 FORBIDDEN', async () => {
    const res = await request(app).get('/api/tithes').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/tithes/summary', () => {
  it('returns 200 with { data: { summary: { totalThisMonth, totalLastMonth, countThisMonth, avgThisMonth, monthlyTrend } } }', async () => {
    // Use year/month filters so the seeded Jan 2024 data is the "current month"
    const res = await request(app)
      .get('/api/tithes/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('totalThisMonth');
    expect(res.body.data.summary).toHaveProperty('totalLastMonth');
    expect(res.body.data.summary).toHaveProperty('countThisMonth');
    expect(res.body.data.summary).toHaveProperty('avgThisMonth');
    expect(res.body.data.summary).toHaveProperty('monthlyTrend');
  });

  it('monthlyTrend is an array of exactly 6 items', async () => {
    const res = await request(app)
      .get('/api/tithes/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    expect(Array.isArray(res.body.data.summary.monthlyTrend)).toBe(true);
    expect(res.body.data.summary.monthlyTrend.length).toBe(6);
  });

  it('each monthlyTrend item has "month" and "total" keys', async () => {
    const res = await request(app)
      .get('/api/tithes/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    for (const item of res.body.data.summary.monthlyTrend) {
      expect(item).toHaveProperty('month');
      expect(item).toHaveProperty('total');
    }
  });

  it('accepts ?year and ?month query params without error', async () => {
    const res = await request(app)
      .get('/api/tithes/summary?year=2023&month=6')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .get('/api/tithes/summary')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/tithes/:id', () => {
  let existingId;
  beforeAll(async () => {
    const t = await prisma.tithe.findFirst();
    existingId = t.id;
  });

  it('returns 200 with the tithe when id exists', async () => {
    const res = await request(app).get(`/api/tithes/${existingId}`).set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.tithe.id).toBe(existingId);
  });

  it('returns 404 NOT_FOUND when id does not exist', async () => {
    const res = await request(app).get('/api/tithes/nonexistent-id').set('Cookie', managerCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app).get(`/api/tithes/${existingId}`).set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/tithes', () => {
  it('returns 400 VALIDATION_ERROR when contributorName missing', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ amount: 100, date: '2024-02-01' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when amount missing', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', date: '2024-02-01' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when date missing', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: 100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when amount is 0', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: 0, date: '2024-02-01' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when amount is negative (-100)', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: -100, date: '2024-02-01' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 with created tithe on valid input', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'NewContrib', amount: 500, date: '2024-02-15' });
    expect(res.status).toBe(201);
    expect(res.body.data.tithe).toBeDefined();
    createdTitheIds.push(res.body.data.tithe.id);
  });

  it('created tithe has recordedBy equal to the authenticated user\'s id', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'RecorderCheck', amount: 200, date: '2024-02-16' });
    expect(res.body.data.tithe.recordedBy).toBe(managerUser.id);
    createdTitheIds.push(res.body.data.tithe.id);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', partnerCookie)
      .send({ contributorName: 'X', amount: 100, date: '2024-02-01' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('PUT /api/tithes/:id', () => {
  let titheId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'ToUpdate', amount: 100, date: '2024-03-01' });
    titheId = res.body.data.tithe.id;
  });

  it('returns 200 with updated tithe', async () => {
    const res = await request(app)
      .put(`/api/tithes/${titheId}`)
      .set('Cookie', managerCookie)
      .send({ amount: 500 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.tithe.amount)).toBe(500);
  });

  it('returns 404 NOT_FOUND when id does not exist', async () => {
    const res = await request(app)
      .put('/api/tithes/nonexistent-id')
      .set('Cookie', managerCookie)
      .send({ amount: 500 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('supports partial update — sends only { amount: 9999 }, other fields unchanged', async () => {
    const before = await request(app).get(`/api/tithes/${titheId}`).set('Cookie', managerCookie);
    const originalContributor = before.body.data.tithe.contributorName;
    const res = await request(app)
      .put(`/api/tithes/${titheId}`)
      .set('Cookie', managerCookie)
      .send({ amount: 9999 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.tithe.amount)).toBe(9999);
    // contributorName should remain unchanged
    expect(res.body.data.tithe.contributorName).toBe(originalContributor);
  });
});

describe('DELETE /api/tithes/:id', () => {
  let toDeleteId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tithes')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'ToDelete', amount: 50, date: '2024-04-01' });
    toDeleteId = res.body.data.tithe.id;
  });

  it('returns 200 on success', async () => {
    const res = await request(app).delete(`/api/tithes/${toDeleteId}`).set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('returns 404 NOT_FOUND when id does not exist', async () => {
    const res = await request(app).delete('/api/tithes/nonexistent-id').set('Cookie', managerCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('deleted tithe no longer appears in GET /api/tithes list', async () => {
    const list = await request(app).get('/api/tithes').set('Cookie', managerCookie);
    const ids = list.body.data.tithes.map((t) => t.id);
    expect(ids).not.toContain(toDeleteId);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app).delete('/api/tithes/nonexistent-id').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
