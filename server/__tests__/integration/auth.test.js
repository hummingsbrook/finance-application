const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = require('../../index');
const { seedTestUser, cleanupDatabase, prisma } = require('../setup');

// FIXED: C-3 — helper that mirrors the new single-use reset-token flow.
// Generates a raw 32-byte hex token, hashes it with SHA-256 (matching the
// auth service) and stores the hash + 1-hour expiry on the user record.
// Returns the raw token so the test can submit it to /api/auth/reset-password.
async function issueResetToken(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetToken: tokenHash, passwordResetExpiry: expiry },
  });
  return rawToken;
}

afterAll(async () => {
  await cleanupDatabase();
});

describe('POST /api/auth/signin', () => {
  let activeUser;
  beforeAll(async () => {
    activeUser = await prisma.user.create({
      data: {
        email: `active_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Active',
        lastName: 'User',
        role: 'PARTNER',
        isActive: true,
      },
    });
  });

  it('returns 400 VALIDATION_ERROR when email is missing', async () => {
    const res = await request(app).post('/api/auth/signin').send({ password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password is missing', async () => {
    const res = await request(app).post('/api/auth/signin').send({ email: 'someone@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 INVALID_CREDENTIALS for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: `nobody_${Date.now()}@example.com`, password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for an existing user with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 403 ACCOUNT_DEACTIVATED when user.isActive is false', async () => {
    const inactiveUser = await prisma.user.create({
      data: {
        email: `inactive_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'In',
        lastName: 'Active',
        role: 'PARTNER',
        isActive: false,
      },
    });
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: inactiveUser.email, password: 'Password123!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('returns 200 with a user object on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(activeUser.email);
  });

  it('response body does not contain "passwordHash" at any level', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'Password123!' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('sets an httpOnly cookie named "token" in the response', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'Password123!' });
    const cookies = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toMatch(/token=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('cookie maxAge is approximately 30 days when keepSignedIn=true (Max-Age=2592000 or larger)', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'Password123!', keepSignedIn: true });
    const cookies = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    // 30 days = 2592000 seconds. Allow >= 2590000 to be safe.
    const maxAgeMatch = cookieStr.match(/Max-Age=(\d+)/i);
    expect(maxAgeMatch).not.toBeNull();
    const maxAge = parseInt(maxAgeMatch[1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(2590000);
  });

  it('subsequent GET /api/auth/me returns 401 when no cookie is sent after signin', async () => {
    // Sign in but do not persist the cookie
    await request(app)
      .post('/api/auth/signin')
      .send({ email: activeUser.email, password: 'Password123!' });
    // No Cookie header on this request → expect 401
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });
});

describe('POST /api/auth/signup', () => {
  it('returns 400 VALIDATION_ERROR when email missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `nopw_${Date.now()}@example.com`,
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when firstName missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `nofirst_${Date.now()}@example.com`,
      password: 'Password123!',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when lastName missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `nolast_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'A',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password.length < 8 (e.g. "Pass1")', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `short_${Date.now()}@example.com`,
      password: 'Pass1',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 EMAIL_EXISTS when email already registered', async () => {
    const existing = await prisma.user.create({
      data: {
        email: `exists_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'X',
        lastName: 'Y',
        role: 'PARTNER',
      },
    });
    const res = await request(app).post('/api/auth/signup').send({
      email: existing.email,
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('returns 201 with user object on valid input', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `ok_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'New',
      lastName: 'Partner',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });

  it('created user has role "PARTNER"', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `role_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'R',
      lastName: 'P',
    });
    expect(res.body.data.user.role).toBe('PARTNER');
  });

  it('created user has isActive true', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `active2_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'A2',
      lastName: 'B2',
    });
    expect(res.body.data.user.isActive).toBe(true);
  });

  it('response does not contain "passwordHash"', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: `nohash_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'Password123!',
      firstName: 'N',
      lastName: 'H',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 VALIDATION_ERROR when email field is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `nobody_${Date.now()}@example.com` });
    expect(res.status).toBe(200);
  });

  it('returns 200 for a valid registered email', async () => {
    const user = await prisma.user.create({
      data: {
        email: `forgot_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'F',
        lastName: 'P',
        role: 'PARTNER',
      },
    });
    const res = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    expect(res.status).toBe(200);
  });

  it('response message is exactly "If that email is registered, a reset link has been sent." for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `nobody2_${Date.now()}@example.com` });
    expect(res.body.data.message).toBe('If that email is registered, a reset link has been sent.');
  });

  it('response message is exactly "If that email is registered, a reset link has been sent." for existing email', async () => {
    const user = await prisma.user.create({
      data: {
        email: `forgot2_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'F2',
        lastName: 'P2',
        role: 'PARTNER',
      },
    });
    const res = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    expect(res.body.data.message).toBe('If that email is registered, a reset link has been sent.');
  });

  it('both responses are identical (anti-enumeration)', async () => {
    const user = await prisma.user.create({
      data: {
        email: `enum_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'E',
        lastName: 'N',
        role: 'PARTNER',
      },
    });
    const [resExisting, resNonExisting] = await Promise.all([
      request(app).post('/api/auth/forgot-password').send({ email: user.email }),
      request(app).post('/api/auth/forgot-password').send({ email: `notreal_${Date.now()}@example.com` }),
    ]);
    expect(resExisting.status).toBe(resNonExisting.status);
    expect(resExisting.body).toEqual(resNonExisting.body);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('returns 400 when "token" field missing', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ newPassword: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when "newPassword" field missing', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'sometoken' });
    expect(res.status).toBe(400);
  });

  it('returns 400 VALIDATION_ERROR when newPassword is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'sometoken', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_TOKEN for a token signed with JWT_SECRET (wrong secret)', async () => {
    const user = await prisma.user.create({
      data: {
        email: `reset_wrong_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'R',
        lastName: 'W',
        role: 'PARTNER',
      },
    });
    // FIXED: C-3 — the reset flow no longer accepts JWTs; any JWT (regardless
    // of which secret signed it) is treated as an unknown token.
    const badToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: badToken, newPassword: 'NewPassword123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 INVALID_TOKEN for a tampered/garbage token string', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'garbage.token.value', newPassword: 'NewPassword123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('returns 200 on success with a valid single-use reset token', async () => {
    const user = await prisma.user.create({
      data: {
        email: `reset_ok_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'R',
        lastName: 'O',
        role: 'PARTNER',
      },
    });
    // FIXED: C-3 — replaced JWT-signed token with the new single-use crypto token.
    const resetToken = await issueResetToken(user.id);
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPassword123!' });
    expect(res.status).toBe(200);
  });

  it('after reset, signing in with the new password returns 200', async () => {
    const user = await prisma.user.create({
      data: {
        email: `reset_signin_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'R',
        lastName: 'S',
        role: 'PARTNER',
      },
    });
    // FIXED: C-3 — replaced JWT-signed token with the new single-use crypto token.
    const resetToken = await issueResetToken(user.id);
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: 'BrandNew123!' });
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: user.email, password: 'BrandNew123!' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/change-password', () => {
  it('returns 401 when no auth cookie is sent', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' });
    expect(res.status).toBe(401);
  });

  it('returns 400 VALIDATION_ERROR when oldPassword is missing', async () => {
    const { cookie } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ newPassword: 'NewPassword123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when newPassword is missing', async () => {
    const { cookie } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when newPassword is shorter than 8 characters', async () => {
    const { cookie } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'Password123!', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_PASSWORD when oldPassword is incorrect', async () => {
    const { cookie } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'WrongOldPassword!', newPassword: 'NewPassword123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('returns 200 on success', async () => {
    const { cookie } = await seedTestUser({ password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' });
    expect(res.status).toBe(200);
  });

  it('after change, signing in with the old password returns 401', async () => {
    const { user, cookie } = await seedTestUser({ password: 'Password123!' });
    await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' });
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: user.email, password: 'Password123!' });
    expect(res.status).toBe(401);
  });

  it('after change, signing in with the new password returns 200', async () => {
    const { user, cookie } = await seedTestUser({ password: 'Password123!' });
    await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' });
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: user.email, password: 'NewPassword123!' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 AUTH_MISSING when no cookie is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('returns 200 with user object when valid cookie is sent', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });

  it('response does not include "passwordHash"', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 with message "Signed out successfully."', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Signed out successfully.');
  });

  it('response set-cookie header clears the token (contains "token=" and "Max-Age=0" or past Expires)', async () => {
    const res = await request(app).post('/api/auth/logout');
    const cookies = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toMatch(/token=/);
    // res.clearCookie sets Max-Age=0 OR Expires=Thu, 01 Jan 1970 ...
    const clearsNow = /Max-Age=0/i.test(cookieStr) || /Expires=Thu, 01 Jan 1970/i.test(cookieStr);
    expect(clearsNow).toBe(true);
  });

  it('GET /api/auth/me returns 401 after logout', async () => {
    const { cookie } = await seedTestUser();
    // Logout clears the cookie on the client side; supertest won't auto-send
    // the cleared cookie on the next request unless we explicitly omit it.
    // Here we simulate "after logout" by simply NOT sending the cookie.
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await request(app).get('/api/auth/me'); // no cookie sent
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/profile', () => {
  it('returns 401 when no cookie', async () => {
    const res = await request(app).put('/api/auth/profile').send({ firstName: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 400 VALIDATION_ERROR when firstName is sent as empty string ""', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookie)
      .send({ firstName: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when lastName is sent as empty string ""', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookie)
      .send({ lastName: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with updated user when valid firstName is sent', async () => {
    const { cookie } = await seedTestUser();
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookie)
      .send({ firstName: 'UpdatedName' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('UpdatedName');
  });

  it('returns 200 and sets phone to null when phone is sent as ""', async () => {
    const { cookie } = await seedTestUser();
    // First set phone to something non-null
    await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookie)
      .send({ phone: '0712345678' });
    // Now clear it with empty string
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookie)
      .send({ phone: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBeNull();
  });
});
