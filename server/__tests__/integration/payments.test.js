const request = require('supertest');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

let partnerCookie, partner2Cookie, managerCookie, adminCookie;
let partnerUser, partner2User, managerUser, adminUser;
let harambeeId;

beforeAll(async () => {
  try {
    const p1 = await seedTestUser({ role: 'PARTNER' });
    partnerUser = p1.user; partnerCookie = p1.cookie;
    const p2 = await seedTestUser({ role: 'PARTNER' });
    partner2User = p2.user; partner2Cookie = p2.cookie;
    const m = await seedTestUser({ role: 'MANAGER' });
    managerUser = m.user; managerCookie = m.cookie;
    const a = await seedTestUser({ role: 'SUPER_ADMIN' });
    adminUser = a.user; adminCookie = a.cookie;

    // Seed one harambee for HARAMBEE payment tests
    const h = await prisma.harambee.create({
      data: {
        title: 'Test Harambee',
        description: 'For testing',
        targetAmount: 100000,
        startDate: new Date(),
        status: 'ACTIVE',
        createdBy: managerUser.id,
      },
    });
    harambeeId = h.id;
  } catch (err) {
    console.error('[payments.beforeAll] error:', err);
    throw err;
  }
});

afterAll(async () => {
  await cleanupDatabase();
});

describe('POST /api/payments', () => {
  it('returns 400 when amount missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ paymentType: 'TITHE' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when paymentType missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 100 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when paymentType is invalid ("DONATION")', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 100, paymentType: 'DONATION' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when paymentType is "HARAMBEE" and harambeeId missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 100, paymentType: 'HARAMBEE' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 with payment status "PENDING" for PARTNER with paymentType "TITHE"', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 500, paymentType: 'TITHE' });
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe('PENDING');
  });

  it('created payment has userId equal to the authenticated PARTNER\'s id', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', partnerCookie)
      .send({ amount: 250, paymentType: 'OFFERING' });
    expect(res.body.data.payment.userId).toBe(partnerUser.id);
  });

  it('returns 201 for MANAGER token', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', managerCookie)
      .send({ amount: 100, paymentType: 'TITHE' });
    expect(res.status).toBe(201);
  });

  it('returns 201 for SUPER_ADMIN token', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', adminCookie)
      .send({ amount: 100, paymentType: 'TITHE' });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/payments/my', () => {
  beforeEach(async () => {
    // Seed payments for two different PARTNERs
    await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 100,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 200,
        paymentType: 'OFFERING',
        status: 'CONFIRMED',
        paymentMethod: 'MPESA',
      },
    });
    await prisma.payment.create({
      data: {
        userId: partner2User.id,
        amount: 999,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
  });

  it('returns 200 with only the calling user\'s payments', async () => {
    const res = await request(app).get('/api/payments/my').set('Cookie', partnerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.payments)).toBe(true);
    // Every payment must belong to partnerUser
    for (const p of res.body.data.payments) {
      expect(p.userId).toBe(partnerUser.id);
    }
  });

  it('does not return payments belonging to other users', async () => {
    const res = await request(app).get('/api/payments/my').set('Cookie', partnerCookie);
    const amounts = res.body.data.payments.map((p) => Number(p.amount));
    // partner2's 999 payment must NOT appear
    expect(amounts).not.toContain(999);
  });

  it('supports ?status=PENDING filter', async () => {
    const res = await request(app)
      .get('/api/payments/my?status=PENDING')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(200);
    for (const p of res.body.data.payments) {
      expect(p.status).toBe('PENDING');
    }
  });

  it('supports ?paymentType=TITHE filter', async () => {
    const res = await request(app)
      .get('/api/payments/my?paymentType=TITHE')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(200);
    for (const p of res.body.data.payments) {
      expect(p.paymentType).toBe('TITHE');
    }
  });
});

describe('PUT /api/payments/:id/confirm', () => {
  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .put('/api/payments/nonexistent-id/confirm')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for MANAGER token and sets status to "CONFIRMED"', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 300,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/confirm`)
      .set('Cookie', managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('CONFIRMED');
  });

  it('confirmed payment has confirmedBy set to the manager\'s id', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 350,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/confirm`)
      .set('Cookie', managerCookie);
    expect(res.body.data.payment.confirmedBy).toBe(managerUser.id);
  });

  it('confirmed payment has confirmedAt set (not null)', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 400,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/confirm`)
      .set('Cookie', managerCookie);
    expect(res.body.data.payment.confirmedAt).not.toBeNull();
  });

  it('returns 409 when payment is already CONFIRMED', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 450,
        paymentType: 'TITHE',
        status: 'CONFIRMED',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/confirm`)
      .set('Cookie', managerCookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /api/payments/:id/reject', () => {
  it('PARTNER token returns 403', async () => {
    const res = await request(app)
      .put('/api/payments/nonexistent-id/reject')
      .set('Cookie', partnerCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 for MANAGER token and sets status to "REJECTED"', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 550,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/reject`)
      .set('Cookie', managerCookie)
      .send({ reason: 'Insufficient funds' });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('REJECTED');
  });

  it('stores rejectionReason in response when provided in body', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 650,
        paymentType: 'TITHE',
        status: 'PENDING',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/reject`)
      .set('Cookie', managerCookie)
      .send({ reason: 'Duplicate transaction' });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.rejectionReason).toBe('Duplicate transaction');
  });

  it('returns 409 when payment is already REJECTED', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: partnerUser.id,
        amount: 750,
        paymentType: 'TITHE',
        status: 'REJECTED',
        paymentMethod: 'MPESA',
      },
    });
    const res = await request(app)
      .put(`/api/payments/${payment.id}/reject`)
      .set('Cookie', managerCookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });
});
