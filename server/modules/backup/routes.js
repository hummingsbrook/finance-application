const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./controller');

// FIXED: H-4 — server-side backup endpoint. Only SUPER_ADMIN may call it.
router.get('/backup', authenticate, authorize('SUPER_ADMIN'), ctrl.backup);

module.exports = router;
