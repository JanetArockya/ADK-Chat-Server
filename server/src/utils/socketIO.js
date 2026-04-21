// Global Socket.IO instance storage
let io = null;

function setIO(ioInstance) {
  io = ioInstance;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO instance not initialized');
  }
  return io;
}

module.exports = { setIO, getIO };
