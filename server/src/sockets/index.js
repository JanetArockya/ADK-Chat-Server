const { getSession } = require('../utils/authStore');
const prisma = require('../utils/prisma');

// userId -> Set of socketIds
const userSockets = new Map();
// socketId -> 'online' | 'afk'
const socketStatus = new Map();
const AFK_TIMEOUT = 60 * 1000;

function getPresence(userId) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return 'offline';
  const allAfk = [...sockets].every((sid) => socketStatus.get(sid) === 'afk');
  return allAfk ? 'afk' : 'online';
}

function broadcastPresence(io, userId) {
  io.emit('user:presence', { userId, status: getPresence(userId) });
}

function initSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      const user = await getSession(token);
      if (!user) return next(new Error('Invalid session'));
      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket;

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socketStatus.set(socket.id, 'online');

    socket.join(`user:${userId}`);
    broadcastPresence(io, userId);

    // Send initial unread counts to the connected user
    try {
      const roomUnreads = await prisma.roomUnread.findMany({ where: { userId, count: { gt: 0 } } });
      const dialogUnreads = await prisma.dialogUnread.findMany({ where: { userId, count: { gt: 0 } } });
      const counts = [
        ...roomUnreads.map((u) => ({ roomId: u.roomId, count: u.count })),
        ...dialogUnreads.map((u) => ({ dialogId: u.dialogId, count: u.count })),
      ];
      if (counts.length > 0) {
        socket.emit('unread:initial', counts);
      }
    } catch {}

    socket.on('room:join', (roomId) => socket.join(`room:${roomId}`));
    socket.on('room:leave', (roomId) => socket.leave(`room:${roomId}`));
    socket.on('dialog:join', (dialogId) => socket.join(`dialog:${dialogId}`));

    socket.on('user:activity', () => {
      const prev = socketStatus.get(socket.id);
      socketStatus.set(socket.id, 'online');
      if (prev !== 'online') broadcastPresence(io, userId);
    });

    socket.on('user:afk', () => {
      socketStatus.set(socket.id, 'afk');
      broadcastPresence(io, userId);
    });

    socket.on('typing:start', ({ roomId, dialogId }) => {
      const target = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      socket.to(target).emit('typing:start', { userId, username: socket.username, roomId, dialogId });
    });

    socket.on('typing:stop', ({ roomId, dialogId }) => {
      const target = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      socket.to(target).emit('typing:stop', { userId, roomId, dialogId });
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      socketStatus.delete(socket.id);
      broadcastPresence(io, userId);
    });
  });
}

module.exports = { initSocketHandlers };
