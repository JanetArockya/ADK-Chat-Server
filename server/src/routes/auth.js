// auth.js
const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { body } = require('express-validator');

router.post('/register', [
  body('email').isEmail(),
  body('username').isAlphanumeric().isLength({ min: 3, max: 20 }),
  body('password').isLength({ min: 8 }),
], c.register);
router.post('/login', c.login);
router.post('/logout', authenticate, c.logout);
router.get('/me', authenticate, c.me);
router.put('/password', authenticate, c.changePassword);
router.post('/password-reset/request', c.requestPasswordReset);
router.post('/password-reset/confirm', c.resetPassword);
router.delete('/account', authenticate, c.deleteAccount);

module.exports = router;