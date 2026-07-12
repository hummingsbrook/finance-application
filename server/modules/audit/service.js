const prisma = require('../../lib/prisma');
const { parsePagination } = require('../../lib/pagination');

async function getAuditLogs(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { userId, module: moduleName, action, startDate, endDate } = filters;

  const where = {};
  if (userId) where.userId = userId;
  if (moduleName) where.module = moduleName;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const exclusiveEnd = new Date(endDate);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      where.createdAt.lt = exclusiveEnd;
    }
  }
  if (filters.search) {
    where.OR = [
      { module: { contains: filters.search, mode: 'insensitive' } },
      { details: { contains: filters.search, mode: 'insensitive' } },
      { ipAddress: { contains: filters.search } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

async function getLoginHistory(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { action, startDate, endDate, search } = filters;

  const where = {
    module: 'auth',
    action: action && ['LOGIN', 'LOGOUT'].includes(action.toUpperCase())
      ? action.toUpperCase()
      : { in: ['LOGIN', 'LOGOUT'] },
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const exclusiveEnd = new Date(endDate);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      where.createdAt.lt = exclusiveEnd;
    }
  }

  if (search) {
    where.OR = [
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName:  { contains: search, mode: 'insensitive' } } },
      { user: { email:     { contains: search, mode: 'insensitive' } } },
      { ipAddress: { contains: search } },
    ];
  }

  // Summary: this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthWhere = {
    module: 'auth',
    action: { in: ['LOGIN', 'LOGOUT'] },
    createdAt: { gte: monthStart, lt: monthEnd },
  };

  const summaryWhere = (startDate || endDate) ? { ...where } : { ...monthWhere };

  const [logs, total, loginCount, logoutCount, uniqueUsersRaw] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...summaryWhere, action: 'LOGIN' } }),
    prisma.auditLog.count({ where: { ...summaryWhere, action: 'LOGOUT' } }),
    prisma.auditLog.findMany({
      where: summaryWhere,
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    summary: {
      loginCount,
      logoutCount,
      totalEvents: loginCount + logoutCount,
      uniqueUsers: uniqueUsersRaw.length,
    },
  };
}

module.exports = {
  getAuditLogs,
  getLoginHistory,
};