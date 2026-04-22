const router = require('express').Router();
const c = require('../controllers/dialogController');
const { authenticate } = require('../middleware/authenticate');

router.get('/', authenticate, c.getDialogs);
router.get('/with/:userId', authenticate, c.getDialog);
router.get('/:dialogId/messages', authenticate, c.getMessages);
router.post('/:userId/messages', authenticate, c.sendMessage);
router.put('/messages/:messageId', authenticate, c.editDialogMessage);
router.delete('/messages/:messageId', authenticate, c.deleteDialogMessage);
router.post('/:dialogId/read', authenticate, c.markDialogRead);

module.exports = router;
