// dialogs.js
const router = require('express').Router();
const c = require('../controllers/dialogController');
const { authenticate } = require('../middleware/authenticate');

router.get('/', authenticate, c.getDialogs);
router.get('/with/:userId', authenticate, c.getDialog);
router.get('/:dialogId/messages', authenticate, c.getMessages);
router.post('/:userId/messages', authenticate, c.sendMessage);

module.exports = router;