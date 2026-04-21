// users.js
const router = require('express').Router();
const c = require('../controllers/userController');
const { authenticate } = require('../middleware/authenticate');

router.get('/search', authenticate, c.searchUsers);
router.get('/:userId', authenticate, c.getUser);
router.put('/profile', authenticate, c.updateProfile);

module.exports = router;