const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      // FIXED: C-3 — needed to validate single-use reset tokens
      passwordResetToken: true,
      passwordResetExpiry: true,
      // FIXED: H-2 — needed to evaluate account lockout state
      failedLoginAttempts: true,
      lockedUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function createUser(data) {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'PARTNER',
      phone: data.phone || null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

async function updatePassword(id, newPassword) {
  const hash = await bcrypt.hash(newPassword, 10);
  // FIXED: C-3 — clear the reset token in the same update so it cannot be
  // reused. (H-2) also reset failed-attempt counters so a successful password
  // change un-locks the account if it had been locked.
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: hash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

// FIXED: C-3 — store a SHA-256 hash of the random reset token so a DB leak
// cannot be used to reset arbitrary accounts. Returns the raw token (to embed
// in the email link) and the expiry timestamp.
async function setPasswordResetToken(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    },
  });
  return { rawToken, expiry };
}

// FIXED: C-3 — look up the user by the hashed token. Returns the user when
// the token matches AND the expiry is still in the future.
async function findByValidResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: tokenHash },
  });
  if (!user) return null;
  if (!user.passwordResetExpiry || user.passwordResetExpiry.getTime() <= Date.now()) {
    return null;
  }
  return user;
}

async function createAuditEntry(userId, action, module, details, ip) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      module,
      details,
      ipAddress: ip,
    },
  });
}

async function updateLastLogin(id) {
  await prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

async function updateProfile(id, data) {
  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

// FIXED: H-2 — Account lockout helpers
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function incrementFailedAttempts(userId) {
  // Fetch current counter, increment, and lock if threshold is reached.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  });
  const next = (user?.failedLoginAttempts || 0) + 1;
  const data = { failedLoginAttempts: next };
  if (next >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await prisma.user.update({ where: { id: userId }, data });
}

async function resetFailedAttempts(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

function isAccountLocked(user) {
  return !!(user && user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updatePassword,
  setPasswordResetToken,
  findByValidResetToken,
  createAuditEntry,
  updateLastLogin,
  updateProfile,
  incrementFailedAttempts,
  resetFailedAttempts,
  isAccountLocked,
};
