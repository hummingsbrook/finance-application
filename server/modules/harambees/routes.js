const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.list);
router.post('/', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('harambees'), ctrl.create);
router.get('/:id/contributions', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.getContributions);
router.post('/:id/contributions', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('harambees'), ctrl.addContribution);
router.put('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('harambees'), ctrl.update);
router.delete('/:id', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), auditLogger('harambees'), ctrl.remove);

module.exports = router;