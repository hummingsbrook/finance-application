const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./controller');

router.get('/financial-summary', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.financialSummary);
router.get('/monthly/:year/:month', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.monthly);
router.get('/dashboard', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.dashboard);
router.get('/dashboard/yearly', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.dashboardYearly);

router.get('/summary', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.summary);
router.get('/breakdown', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.breakdown);
router.get('/summary/yearly',    authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.summaryYearly);
router.get('/breakdown/yearly',  authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.breakdownYearly);
router.get('/trend', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.trend);
router.post('/generate-narrative', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), ctrl.generateNarrative);

module.exports = router;
