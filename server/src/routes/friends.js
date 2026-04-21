// friends.js
const router = require('express').Router();
const c = require('../controllers/friendController');
const { authenticate } = require('../middleware/authenticate');

router.get('/', authenticate, c.getFriends);
router.get('/requests', authenticate, c.getFriendRequests);
router.get('/bans', authenticate, c.getBannedUsers);
router.post('/request', authenticate, c.sendFriendRequest);
router.post('/request/:requestId/accept', authenticate, c.acceptFriendRequest);
router.post('/request/:requestId/reject', authenticate, c.rejectFriendRequest);
router.delete('/:friendId', authenticate, c.removeFriend);
router.post('/ban/:userId', authenticate, c.banUser);
router.delete('/ban/:userId', authenticate, c.unbanUser);

module.exports = router;
