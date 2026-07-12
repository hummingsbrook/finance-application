const prisma = require('../lib/prisma');
const { AuditAction } = require('@prisma/client');

function auditLogger(moduleName) {
  return (req, res, next) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!writeMethods.includes(req.method)) {
      return next();
    }

    const originalEnd = res.end;

    res.end = function (...args) {
      res.end = originalEnd;
      res.end.apply(res, args);

      if (res.statusCode < 400 && req.user) {
        const actionMap = {
          POST: 'CREATE',
          PUT: 'UPDATE',
          PATCH: 'UPDATE',
          DELETE: 'DELETE',
        };

        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action: actionMap[req.method] || 'CREATE',
              module: moduleName,
              recordId: req.params.id || null,
              details: `${req.method} ${req.originalUrl}`,
              // FIXED: M-4 — req.connection was deprecated in Node 16+;
              // use req.socket.remoteAddress instead.
              ipAddress: req.ip || req.socket.remoteAddress,
            },
          })
          .catch(() => {
            // Audit logging should never crash the request
          });
      }
    };

    next();
  };
}

module.exports = auditLogger;