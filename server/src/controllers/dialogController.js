const prisma = require('../utils/prisma');
const { getUserById } = require('../utils/authStore');
const { areFriends, isBanned } = require('./friendController');
const { getIO } = require('../utils/socketIO');

const MSG_INCLUDE = {
  user: { select: { id: true, username: true } },
  replyTo: { include: { user: { select: { id: true, username: true } } } },
  attachments: { select: { id: true, fileName: true, mimeType: true, size: true, comment: true } },
};

function msgPayload(m) {
  return {
    id: m.id,
    dialogId: m.dialogId,
    userId: m.userId,
    userName: m.user?.username ?? 'Unknown',
    content: m.content,
    replyTo: m.replyTo
      ? { id: m.replyTo.id, content: m.replyTo.content, userId: m.replyTo.userId, userName: m.replyTo.user?.username ?? 'Unknown' }
      : null,
    attachments: m.attachments ?? [],
    edited: m.edited,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function dialogKey(a, b) {
  const [p1, p2] = [Number(a), Number(b)].sort((x, y) => x - y);
  return { participant1Id: p1, participant2Id: p2 };
}

async function ensureDialog(userA, userB) {
  const key = dialogKey(userA, userB);
  const existing = await prisma.dialog.findUnique({ where: { participant1Id_participant2Id: key } });
  if (existing) return existing;
  return prisma.dialog.create({ data: key });
}

function toDialogPayload(dialog, currentUserId) {
  const isP1 = dialog.participant1Id === Number(currentUserId);
  const participant = isP1 ? dialog.participant2 : dialog.participant1;
  return {
    id: dialog.id,
    participantId: participant?.id,
    participant: participant ? { id: participant.id, username: participant.username, email: participant.email } : null,
    updatedAt: dialog.updatedAt,
    unreadCount: dialog.unreadCount,
  };
}

async function getDialogs(req, res) {
  const userId = req.user.id;
  const dialogs = await prisma.dialog.findMany({
    where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
    include: {
      participant1: { select: { id: true, username: true, email: true } },
      participant2: { select: { id: true, username: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Get unread counts
  const unreads = await prisma.dialogUnread.findMany({ where: { userId } });
  const unreadMap = Object.fromEntries(unreads.map((u) => [u.dialogId, u.count]));

  return res.status(200).json(
    dialogs.map((d) => ({ ...toDialogPayload(d, userId), unreadCount: unreadMap[d.id] ?? 0 }))
  );
}

async function getDialog(req, res) {
  const currentUserId = req.user.id;
  const otherUserId = Number(req.params.userId);
  if (!await getUserById(otherUserId)) return res.status(404).json({ message: 'User not found' });
  if (otherUserId === currentUserId) return res.status(400).json({ message: 'Cannot open dialog with yourself' });

  const dialog = await ensureDialog(currentUserId, otherUserId);
  const full = await prisma.dialog.findUnique({
    where: { id: dialog.id },
    include: {
      participant1: { select: { id: true, username: true, email: true } },
      participant2: { select: { id: true, username: true, email: true } },
    },
  });
  return res.status(200).json(toDialogPayload(full, currentUserId));
}

async function getMessages(req, res) {
  const dialogId = Number(req.params.dialogId);
  const dialog = await prisma.dialog.findUnique({ where: { id: dialogId } });
  if (!dialog) return res.status(404).json({ message: 'Dialog not found' });

  const userId = req.user.id;
  if (dialog.participant1Id !== userId && dialog.participant2Id !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? Number(req.query.before) : undefined;

  const messages = await prisma.dialogMessage.findMany({
    where: { dialogId, ...(before ? { id: { lt: before } } : {}) },
    include: MSG_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return res.status(200).json(messages.reverse().map(msgPayload));
}

async function sendMessage(req, res) {
  const currentUserId = req.user.id;
  const otherUserId = Number(req.params.userId);
  const content = String(req.body?.content || '').trim();
  const { replyTo = null, attachmentIds = [] } = req.body || {};

  if (!content && attachmentIds.length === 0) return res.status(400).json({ message: 'Message content is required' });
  if (content.length > 3 * 1024) return res.status(400).json({ message: 'Message too long (max 3 KB)' });

  const other = await getUserById(otherUserId);
  if (!other) return res.status(404).json({ message: 'Recipient not found' });
  if (otherUserId === currentUserId) return res.status(400).json({ message: 'Cannot message yourself' });

  // Enforce friend-only and ban rules
  if (!await areFriends(currentUserId, otherUserId)) {
    return res.status(403).json({ message: 'You can only message friends', code: 'NOT_FRIENDS' });
  }
  if (await isBanned(currentUserId, otherUserId)) {
    return res.status(403).json({ message: 'Unable to send message due to a ban', code: 'BANNED' });
  }

  const dialog = await ensureDialog(currentUserId, otherUserId);
  const now = new Date();

  const message = await prisma.dialogMessage.create({
    data: {
      dialogId: dialog.id,
      userId: currentUserId,
      content,
      replyToId: replyTo || null,
      ...(attachmentIds.length > 0 ? { attachments: { connect: attachmentIds.map((id) => ({ id: Number(id) })) } } : {}),
    },
    include: MSG_INCLUDE,
  });

  await prisma.dialog.update({ where: { id: dialog.id }, data: { updatedAt: now } });

  const payload = msgPayload(message);
  const io = getIO();
  io.to(`dialog:${dialog.id}`).emit('message:received', payload);

  // Increment unread for other participant
  const result = await prisma.dialogUnread.upsert({
    where: { userId_dialogId: { userId: otherUserId, dialogId: dialog.id } },
    update: { count: { increment: 1 } },
    create: { userId: otherUserId, dialogId: dialog.id, count: 1 },
  });
  io.to(`user:${otherUserId}`).emit('unread:update', { dialogId: dialog.id, count: result.count });

  return res.status(201).json(payload);
}

async function editDialogMessage(req, res) {
  const messageId = Number(req.params.messageId);
  const msg = await prisma.dialogMessage.findUnique({ where: { id: messageId } });
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  if (msg.userId !== req.user.id) return res.status(403).json({ message: 'Only message author can edit' });

  const { content } = req.body || {};
  if (!String(content || '').trim()) return res.status(400).json({ message: 'Content is required' });

  const updated = await prisma.dialogMessage.update({
    where: { id: messageId },
    data: { content: String(content).trim(), edited: true },
    include: MSG_INCLUDE,
  });

  const payload = msgPayload(updated);
  getIO().to(`dialog:${msg.dialogId}`).emit('message:updated', payload);
  return res.status(200).json(payload);
}

async function deleteDialogMessage(req, res) {
  const messageId = Number(req.params.messageId);
  const msg = await prisma.dialogMessage.findUnique({ where: { id: messageId } });
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  if (msg.userId !== req.user.id) return res.status(403).json({ message: 'Only message author can delete' });

  await prisma.dialogMessage.delete({ where: { id: messageId } });
  getIO().to(`dialog:${msg.dialogId}`).emit('message:deleted', { id: messageId, dialogId: msg.dialogId });
  return res.status(200).json({ message: 'Message deleted' });
}

async function markDialogRead(req, res) {
  const dialogId = Number(req.params.dialogId);
  const userId = req.user.id;

  const dialog = await prisma.dialog.findUnique({ where: { id: dialogId } });
  if (!dialog) return res.status(404).json({ message: 'Dialog not found' });
  if (dialog.participant1Id !== userId && dialog.participant2Id !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await prisma.dialogUnread.upsert({
    where: { userId_dialogId: { userId, dialogId } },
    update: { count: 0 },
    create: { userId, dialogId, count: 0 },
  });
  getIO().to(`user:${userId}`).emit('unread:update', { dialogId, count: 0 });
  return res.status(200).json({ message: 'Marked as read' });
}

module.exports = { getDialogs, getDialog, getMessages, sendMessage, editDialogMessage, deleteDialogMessage, markDialogRead };
