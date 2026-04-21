// attachments.js
const router = require('express').Router();
const c = require('../controllers/attachmentController');
const { authenticate } = require('../middleware/authenticate');
const { upload } = require('../middleware/upload');

router.post('/room/:roomId', authenticate, upload.single('file'), c.uploadAttachment);
router.post('/dialog/:dialogId', authenticate, upload.single('file'), c.uploadAttachment);
router.get('/:attachmentId', authenticate, c.downloadAttachment);

module.exports = router;