const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

async function uploadAttachment(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { roomId, dialogId } = req.params;
  const comment = String(req.body?.comment || '');

  // Validate access
  if (roomId) {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: Number(roomId), userId: req.user.id } },
    });
    if (!membership) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'Not a room member' });
    }
  } else if (dialogId) {
    const dialog = await prisma.dialog.findUnique({ where: { id: Number(dialogId) } });
    if (!dialog || (dialog.participant1Id !== req.user.id && dialog.participant2Id !== req.user.id)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'Not a dialog participant' });
    }
  } else {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'roomId or dialogId is required' });
  }

  const attachment = await prisma.attachment.create({
    data: {
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      comment,
      uploadedById: req.user.id,
      roomId: roomId ? Number(roomId) : null,
      dialogId: dialogId ? Number(dialogId) : null,
    },
  });

  return res.status(201).json({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    comment: attachment.comment,
  });
}

async function downloadAttachment(req, res) {
  const attachmentId = Number(req.params.attachmentId);
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

  // Access control
  const userId = req.user.id;
  let hasAccess = false;

  if (attachment.roomId) {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: attachment.roomId, userId } },
    });
    hasAccess = !!membership;
  } else if (attachment.dialogId) {
    const dialog = await prisma.dialog.findUnique({ where: { id: attachment.dialogId } });
    hasAccess = dialog && (dialog.participant1Id === userId || dialog.participant2Id === userId);
  } else {
    // Orphaned attachment - only uploader can access
    hasAccess = attachment.uploadedById === userId;
  }

  if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

  const filePath = path.join(UPLOAD_DIR, attachment.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
  res.setHeader('Content-Type', attachment.mimeType);
  res.sendFile(filePath);
}

module.exports = { uploadAttachment, downloadAttachment };
