const prisma = require('../../lib/prisma');
const { parsePagination } = require('../../lib/pagination');

async function listUsers(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { role, search, status } = filters;

  const where = {};
  if (role) {
    where.role = role;
  }
  if (status === 'ACTIVE') {
    where.isActive = true;
  } else if (status === 'INACTIVE') {
    where.isActive = false;
  }
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

async function createUser(data) {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'PARTNER',
      phone: data.phone || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
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
}

async function updateUser(id, data) {
  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.passwordHash) updateData.passwordHash = data.passwordHash;

  return prisma.user.update({
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
}

async function getUserLoginHistory(userId, filters = {}) {
  const { page, limit, skip } = parsePagination(filters);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        userId,
        action: 'LOGIN',
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        createdAt: true,
        details: true,
      },
    }),
    prisma.auditLog.count({
      where: {
        userId,
        action: 'LOGIN',
      },
    }),
  ]);

  return { userId, loginLogs: logs, total, page, limit };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  getUserLoginHistory,
};