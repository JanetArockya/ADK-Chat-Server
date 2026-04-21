const { getSession } = require('../utils/authStore');

// In-memory presence: userId -> Set of socketIds
const userSockets = new Map();
const socketAfkTimers = new Map();
const AFK_TIMEOUT = 60 * 1000;

function getPresence(userId) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return 'offline';
  // If all sockets are AFK, user is AFK
  const allAfk = [...sockets].every(sid => socketAfkTimers.get(sid) === 'afk');
  return allAfk ? 'afk' : 'online';
}

function broadcastPresence(io, userId) {
  io.emit('user:presence', { userId, status: getPresence(userId) });
}

function initSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const user = getSession(token);
      if (!user) return next(new Error('Invalid session'));

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socketAfkTimers.set(socket.id, 'online');

    // Join personal room for DMs and notifications
    socket.join(`user:${userId}`);
    broadcastPresence(io, userId);

    // Join room channels
    socket.on('room:join', (roomId) => socket.join(`room:${roomId}`));
    socket.on('room:leave', (roomId) => socket.leave(`room:${roomId}`));
    socket.on('dialog:join', (dialogId) => socket.join(`dialog:${dialogId}`));

    // AFK detection
    socket.on('user:activity', () => {
      const prev = socketAfkTimers.get(socket.id);
      socketAfkTimers.set(socket.id, 'online');
      if (prev !== 'online') broadcastPresence(io, userId);
    });

    socket.on('user:afk', () => {
      socketAfkTimers.set(socket.id, 'afk');
      broadcastPresence(io, userId);
    });

    // Typing indicators
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
      socketAfkTimers.delete(socket.id);
      broadcastPresence(io, userId);
    });
  });
}

module.exports = { initSocketHandlers };