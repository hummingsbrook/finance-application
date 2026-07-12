const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./controller');

router.get('/logs', authenticate, authorize('SUPER_ADMIN'), ctrl.getLogs);
router.get('/login-history', authenticate, authorize('SUPER_ADMIN'), ctrl.loginHistory);

module.exports = router;