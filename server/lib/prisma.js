const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  if (params.model === 'AuditLog' &&
      ['delete', 'deleteMany', 'update', 'updateMany'].includes(params.action)) {
    throw new Error('Audit logs are immutable and cannot be modified or deleted.');
  }
  return next(params);
});

module.exports = prisma;