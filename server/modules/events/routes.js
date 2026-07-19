const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/',                authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.list);
router.get('/summary',         authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getSummary);
router.get('/summary/yearly',  authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getYearlySummary);
router.get('/:id',             authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getById);
router.post('/',               authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('events'), ctrl.create);
router.put('/:id',             authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('events'), ctrl.update);
router.delete('/:id',          authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('events'), ctrl.remove);

module.exports = router;
