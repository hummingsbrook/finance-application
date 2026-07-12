const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/', authenticate, authorize('SUPER_ADMIN'), ctrl.list);
router.post('/', authenticate, authorize('SUPER_ADMIN'), auditLogger('users'), ctrl.create);
router.post('/bulk-deactivate', authenticate, authorize('SUPER_ADMIN'), ctrl.bulkDeactivate);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), auditLogger('users'), ctrl.update);
router.get('/:id/login-history', authenticate, authorize('SUPER_ADMIN'), ctrl.loginHistory);

module.exports = router;