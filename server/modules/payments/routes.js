const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

// Safaricom M-Pesa IP allowlist
const MPESA_IPS = [
  '196.201.214.0/24',
  '196.201.213.0/24',
];

function mpesaIpGuard(req, res, next) {
  const ipRangeCheck = require('ip-range-check');
  const isSandbox = process.env.MPESA_ENVIRONMENT !== 'production';
  if (isSandbox) {
    console.warn(`[M-Pesa] Sandbox mode — skipping IP check for ${req.ip}`);
    return next();
  }
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const allowed = ipRangeCheck(clientIp, MPESA_IPS);
  if (!allowed) {
    console.warn(`[M-Pesa] Blocked callback from disallowed IP: ${clientIp}`);
    return res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
  }
  next();
}

router.post('/', authenticate, authorize('PARTNER', 'MANAGER', 'SUPER_ADMIN'), auditLogger('payments'), ctrl.create);
router.get('/my', authenticate, authorize('PARTNER', 'MANAGER', 'SUPER_ADMIN'), ctrl.getMy);
router.put('/:id/confirm', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('payments'), ctrl.confirm);
router.put('/:id/reject', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('payments'), ctrl.reject);
router.post('/mpesa/callback', mpesaIpGuard, ctrl.mpesaCallback);

module.exports = router;