const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socketIO');

const MESSAGE_INCLUDE = {
  user: { select: { id: true, username: true } },
  replyTo: {
    include: { user: { select: { id: true, username: true } } },
  },
  attachments: { select: { id: true, fileName: true, mimeType: true, size: true, comment: true } },
};

function msgPayload(m) {
  return {
    id: m.id,
    roomId: m.roomId,
    userId: m.userId,
    userName: m.user?.username ?? 'Unknown',
    content: m.content,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          userId: m.replyTo.userId,
          userName: m.replyTo.user?.username ?? 'Unknown',
        }
      : null,
    attachments: m.attachments ?? [],
    edited: m.edited,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

async function getMembership(roomId, userId) {
  return prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}

async function getRoomMessages(req, res) {
  const roomId = Number(req.params.roomId);
  const membership = await getMembership(roomId, req.user.id);
  if (!membership) return res.status(403).json({ message: 'Access denied' });

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? Number(req.query.before) : undefined;

  const messages = await prisma.message.findMany({
    where: {
      roomId,
      ...(before ? { id: { lt: before } } : {}),
    },
    include: MESSAGE_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return res.status(200).json(messages.reverse().map(msgPayload));
}

async function sendRoomMessage(req, res) {
  const roomId = Number(req.params.roomId);
  const membership = await getMembership(roomId, req.user.id);
  if (!membership) return res.status(403).json({ message: 'Access denied' });

  const { content = '', replyTo = null, attachmentIds = [] } = req.body || {};
  const trimmed = String(content).trim();
  if (!trimmed && attachmentIds.length === 0) {
    return res.status(400).json({ message: 'Message content or attachments are required' });
  }
  if (trimmed.length > 3 * 1024) {
    return res.status(400).json({ message: 'Message too long (max 3 KB)' });
  }

  const message = await prisma.message.create({
    data: {
      roomId,
      userId: req.user.id,
      content: trimmed,
      replyToId: replyTo || null,
      ...(attachmentIds.length > 0
        ? { attachments: { connect: attachmentIds.map((id) => ({ id: Number(id) })) } }
        : {}),
    },
    include: MESSAGE_INCLUDE,
  });

  const payload = msgPayload(message);
  const io = getIO();
  io.to(`room:${roomId}`).emit('message:received', payload);

  // Increment unread for all other room members
  const members = await prisma.roomMember.findMany({ where: { roomId, userId: { not: req.user.id } }, select: { userId: true } });
  for (const { userId } of members) {
    const result = await prisma.roomUnread.upsert({
      where: { userId_roomId: { userId, roomId } },
      update: { count: { increment: 1 } },
      create: { userId, roomId, count: 1 },
    });
    io.to(`user:${userId}`).emit('unread:update', { roomId, count: result.count });
  }

  return res.status(201).json(payload);
}

async function editMessage(req, res) {
  const messageId = Number(req.params.messageId);
  const msg = await prisma.message.findUnique({ where: { id: messageId }, include: { room: { select: { ownerId: true } } } });
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  const isAuthor = msg.userId === req.user.id;
  const membership = await getMembership(msg.roomId, req.user.id);
  const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin');

  if (!isAuthor) return res.status(403).json({ message: 'Only message author can edit this message' });

  const { content } = req.body || {};
  if (!String(content || '').trim()) return res.status(400).json({ message: 'Content is required' });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: String(content).trim(), edited: true },
    include: MESSAGE_INCLUDE,
  });

  const payload = msgPayload(updated);
  getIO().to(`room:${msg.roomId}`).emit('message:updated', payload);
  return res.status(200).json(payload);
}

async function deleteMessage(req, res) {
  const messageId = Number(req.params.messageId);
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  const isAuthor = msg.userId === req.user.id;
  const membership = await getMembership(msg.roomId, req.user.id);
  const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin');

  if (!isAuthor && !isAdmin) return res.status(403).json({ message: 'Not authorized to delete this message' });

  await prisma.message.delete({ where: { id: messageId } });
  getIO().to(`room:${msg.roomId}`).emit('message:deleted', { id: messageId, roomId: msg.roomId });
  return res.status(200).json({ message: 'Message deleted' });
}

module.exports = { getRoomMessages, sendRoomMessage, editMessage, deleteMessage };
