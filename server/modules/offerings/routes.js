const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.list);
router.get('/summary', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.summary);
router.get('/summary/yearly', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.yearlySummary);
router.get('/check-duplicate', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.checkDuplicate);
router.post('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('offerings'), ctrl.create);
router.put('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('offerings'), ctrl.update);
router.delete('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('offerings'), ctrl.remove);

module.exports = router;
