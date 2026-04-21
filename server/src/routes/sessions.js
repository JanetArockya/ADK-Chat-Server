// sessions.js
const router = require('express').Router();
const c = require('../controllers/sessionController');
const { authenticate } = require('../middleware/authenticate');

router.get('/', authenticate, c.getSessions);
router.delete('/all', authenticate, c.revokeAllSessions);
router.delete('/:sessionId', authenticate, c.revokeSession);

module.exports = router;