const router = require('express').Router();
const c = require('../controllers/roomController');
const { authenticate } = require('../middleware/authenticate');

router.get('/public', authenticate, c.getPublicRooms);
router.get('/my', authenticate, c.getMyRooms);
router.get('/invitations', authenticate, c.getMyInvitations);
router.post('/', authenticate, c.createRoom);
router.get('/:roomId', authenticate, c.getRoom);
router.put('/:roomId', authenticate, c.updateRoom);
router.delete('/:roomId', authenticate, c.deleteRoom);
router.post('/:roomId/join', authenticate, c.joinRoom);
router.post('/:roomId/leave', authenticate, c.leaveRoom);
router.post('/:roomId/read', authenticate, c.markRoomRead);
router.get('/:roomId/members', authenticate, c.getMembers);
router.delete('/:roomId/members/:userId', authenticate, c.removeMember);
router.post('/:roomId/ban/:userId', authenticate, c.banUser);
router.delete('/:roomId/ban/:userId', authenticate, c.unbanUser);
router.get('/:roomId/bans', authenticate, c.getBannedUsers);
router.post('/:roomId/admins/:userId', authenticate, c.addAdmin);
router.delete('/:roomId/admins/:userId', authenticate, c.removeAdmin);
router.post('/:roomId/invite', authenticate, c.inviteUser);
router.post('/:roomId/invite/accept', authenticate, c.acceptInvite);

module.exports = router;
