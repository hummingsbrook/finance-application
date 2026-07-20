const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/summary', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.summary);
router.get('/summary/yearly', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.yearlySummary);
router.get('/oversight', authenticate, authorize('SUPER_ADMIN'), ctrl.oversight);
router.get('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.list);
router.get('/check-duplicate', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.checkDuplicate);
router.post('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('expenses'), ctrl.create);
router.put('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('expenses'), ctrl.update);
router.put('/:id/approve', authenticate, authorize('SUPER_ADMIN'), auditLogger('expenses'), ctrl.approve);
router.put('/:id/reject', authenticate, authorize('SUPER_ADMIN'), auditLogger('expenses'), ctrl.reject);
router.delete('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('expenses'), ctrl.remove);

module.exports = router;
