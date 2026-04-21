import io from 'socket.io-client';

let socket = null;

export const WebSocketService = {
  connect: (token) => {
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  emit: (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  },

  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  },

  off: (event) => {
    if (socket) {
      socket.off(event);
    }
  },

  // Room operations
  joinRoom: (roomId) => {
    socket?.emit('room:join', roomId);
  },

  leaveRoom: (roomId) => {
    socket?.emit('room:leave', roomId);
  },

  // Dialog operations
  joinDialog: (dialogId) => {
    socket?.emit('dialog:join', dialogId);
  },

  // Activity tracking
  setActive: () => {
    socket?.emit('user:activity');
  },

  setAFK: () => {
    socket?.emit('user:afk');
  },

  // Typing indicators
  startTyping: (roomId, dialogId) => {
    socket?.emit('typing:start', { roomId, dialogId });
  },

  stopTyping: (roomId, dialogId) => {
    socket?.emit('typing:stop', { roomId, dialogId });
  },

  getSocket: () => socket,
};

export default WebSocketService;
