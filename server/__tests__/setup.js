// Test bootstrap: loads test env, exports DB seeders and cookie helpers
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.test') });

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

/**
 * Creates a user in the test DB and returns { user, cookie }.
 * cookie is the string: "token=<signed-jwt>" ready for supertest .set('Cookie', cookie)
 *
 * @param {object} overrides — any User fields to override defaults
 */
async function seedTestUser(overrides = {}) {
  const defaults = {
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: await bcrypt.hash('Password123!', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'PARTNER',
    isActive: true,
  };

  const data = { ...defaults, ...overrides };
  // If caller passed a plain 'password', hash it
  if (overrides.password) {
    data.passwordHash = await bcrypt.hash(overrides.password, 10);
    delete data.password;
  }

  const user = await prisma.user.create({ data });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { user, cookie: `token=${token}` };
}

async function getManagerCookie() {
  const { cookie } = await seedTestUser({ role: 'MANAGER', email: `mgr_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com` });
  return cookie;
}

async function getPartnerCookie() {
  const { cookie } = await seedTestUser({ role: 'PARTNER', email: `partner_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com` });
  return cookie;
}

async function getAdminCookie() {
  const { cookie } = await seedTestUser({ role: 'SUPER_ADMIN', email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com` });
  return cookie;
}

/**
 * Deletes ALL test-created records in dependency order.
 * Call this in afterAll() inside each test file.
 */
async function cleanupDatabase() {
  await prisma.auditLog.deleteMany({});
  await prisma.harambeeContribution.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.tithe.deleteMany({});
  await prisma.offering.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.harambee.deleteMany({});
  await prisma.user.deleteMany({});
}

// Disconnect after all suites finish
afterAll(async () => {
  await prisma.$disconnect();
});

module.exports = {
  prisma,
  seedTestUser,
  getManagerCookie,
  getPartnerCookie,
  getAdminCookie,
  cleanupDatabase,
};
