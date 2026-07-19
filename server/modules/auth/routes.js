const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./controller');

router.post('/signin', ctrl.signin);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/change-password', authenticate, ctrl.changePassword);
router.put('/profile', authenticate, ctrl.updateProfile);
router.get('/me', authenticate, ctrl.getMe);
router.post('/logout', ctrl.logout);

module.exports = router;