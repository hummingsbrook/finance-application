const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.list);
router.get('/summary', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getSummary);
router.get('/summary/yearly', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getYearlySummary);
router.get('/check-duplicate', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.checkDuplicate);
router.get('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getById);
router.post('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('tithes'), ctrl.create);
router.put('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('tithes'), ctrl.update);
router.delete('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('tithes'), ctrl.remove);

module.exports = router;