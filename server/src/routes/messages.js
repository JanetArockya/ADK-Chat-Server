const router = require('express').Router();
const c = require('../controllers/messageController');
const { authenticate } = require('../middleware/authenticate');

router.get('/room/:roomId', authenticate, c.getRoomMessages);
router.post('/room/:roomId', authenticate, c.sendRoomMessage);
router.put('/:messageId', authenticate, c.editMessage);
router.delete('/:messageId', authenticate, c.deleteMessage);

module.exports = router;
