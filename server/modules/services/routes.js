const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const ctrl = require('./controller');

router.get('/',        authenticate, ctrl.list);
router.post('/',       authenticate, authorize('MANAGER','SUPER_ADMIN'), auditLogger('SERVICES'), ctrl.create);
router.put('/:id',     authenticate, authorize('MANAGER','SUPER_ADMIN'), auditLogger('SERVICES'), ctrl.update);
router.delete('/:id',  authenticate, authorize('MANAGER','SUPER_ADMIN'), auditLogger('SERVICES'), ctrl.destroy);

module.exports = router;