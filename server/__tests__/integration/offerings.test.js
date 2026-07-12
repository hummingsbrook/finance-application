const request = require('supertest');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

let managerCookie, adminCookie, partnerCookie;
let managerUser;

beforeAll(async () => {
  try {
    const p = await seedTestUser({ role: 'PARTNER' });
    partnerCookie = p.cookie;
    const m = await seedTestUser({ role: 'MANAGER' });
    managerUser = m.user; managerCookie = m.cookie;
    const a = await seedTestUser({ role: 'SUPER_ADMIN' });
    adminCookie = a.cookie;

    // Seed 10 offerings with mixed serviceType
    const records = Array.from({ length: 10 }, (_, i) => ({
      contributorName: `OfferingContrib${i}`,
      amount: 50 + i * 5,
      date: new Date(2024, 0, i + 1),
      serviceType: i % 2 === 0 ? 'Sunday Main' : 'Sunday School',
      paymentMethod: 'CASH',
      status: 'CONFIRMED',
      recordedBy: managerUser.id,
    }));
    await prisma.offering.createMany({ data: records });
  } catch (err) {
    console.error('[offerings.beforeAll] error:', err);
    throw err;
  }
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('GET /api/offerings', () => {
  it('returns 200 with { success: true, data: { offerings, total, page, limit } }', async () => {
    const res = await request(app).get('/api/offerings').set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.offerings)).toBe(true);
    expect(res.body.data.total).toBe(10);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app).get('/api/offerings').set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('filters by ?serviceType="Sunday Main"', async () => {
    const res = await request(app)
      .get('/api/offerings?serviceType=Sunday%20Main')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    // 5 of the 10 seeded are "Sunday Main"
    expect(res.body.data.offerings.length).toBe(5);
    for (const o of res.body.data.offerings) {
      expect(o.serviceType).toBe('Sunday Main');
    }
  });

  it('returns empty array when no records match', async () => {
    const res = await request(app)
      .get('/api/offerings?serviceType=NoSuchService')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.offerings).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });
});

describe('GET /api/offerings/summary', () => {
  it('returns 200 with summary object', async () => {
    const res = await request(app)
      .get('/api/offerings/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });

  it('response has keys: thisMonthTotal, lastMonthTotal (or equivalent fields per actual service)', async () => {
    const res = await request(app)
      .get('/api/offerings/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    expect(res.body.data.summary).toHaveProperty('thisMonthTotal');
    expect(res.body.data.summary).toHaveProperty('lastMonthTotal');
  });

  it('monthlyTrend array present in response', async () => {
    const res = await request(app)
      .get('/api/offerings/summary?year=2024&month=1')
      .set('Cookie', managerCookie);
    expect(Array.isArray(res.body.data.summary.monthlyTrend)).toBe(true);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .get('/api/offerings/summary')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/offerings', () => {
  it('returns 400 when contributorName missing', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ amount: 100, date: '2024-02-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount missing', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', date: '2024-02-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when date missing', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: 100, serviceType: 'Sunday Main' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when serviceType missing', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: 100, date: '2024-02-01' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is 0', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: 0, date: '2024-02-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is negative', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'X', amount: -50, date: '2024-02-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with created offering for serviceType "Sunday Main"', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'MainService', amount: 100, date: '2024-02-04', serviceType: 'Sunday Main' });
    expect(res.status).toBe(201);
    expect(res.body.data.offering.serviceType).toBe('Sunday Main');
  });

  it('returns 201 with created offering for serviceType "Sunday School"', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'School', amount: 75, date: '2024-02-04', serviceType: 'Sunday School' });
    expect(res.status).toBe(201);
    expect(res.body.data.offering.serviceType).toBe('Sunday School');
  });

  it('created offering has recordedBy equal to authenticated user\'s id', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'RecorderCheck', amount: 80, date: '2024-02-05', serviceType: 'Sunday Main' });
    expect(res.body.data.offering.recordedBy).toBe(managerUser.id);
  });

  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', partnerCookie)
      .send({ contributorName: 'X', amount: 100, date: '2024-02-01', serviceType: 'Sunday Main' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('PUT /api/offerings/:id', () => {
  let offeringId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'ToUpdate', amount: 100, date: '2024-03-01', serviceType: 'Sunday Main' });
    offeringId = res.body.data.offering.id;
  });

  it('returns 200 with updated offering', async () => {
    const res = await request(app)
      .put(`/api/offerings/${offeringId}`)
      .set('Cookie', managerCookie)
      .send({ amount: 250 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.offering.amount)).toBe(250);
  });

  it('returns 404 NOT_FOUND when id does not exist', async () => {
    const res = await request(app)
      .put('/api/offerings/nonexistent-id')
      .set('Cookie', managerCookie)
      .send({ amount: 250 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/offerings/:id', () => {
  let toDeleteId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/offerings')
      .set('Cookie', managerCookie)
      .send({ contributorName: 'ToDelete', amount: 30, date: '2024-04-01', serviceType: 'Sunday Main' });
    toDeleteId = res.body.data.offering.id;
  });

  it('returns 200 on success', async () => {
    const res = await request(app).delete(`/api/offerings/${toDeleteId}`).set('Cookie', managerCookie);
    expect(res.status).toBe(200);
  });

  it('returns 404 NOT_FOUND when id does not exist', async () => {
    const res = await request(app).delete('/api/offerings/nonexistent-id').set('Cookie', managerCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
