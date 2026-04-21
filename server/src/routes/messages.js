// messages.js
const router = require('express').Router();
const c = require('../controllers/messageController');
const { authenticate } = require('../middleware/authenticate');
const { getIO } = require('../utils/socketIO');

// Wrapper to emit socket events for message operations
async function sendRoomMessageWithBroadcast(req, res) {
  const originalJson = res.json;
  res.json = function(data) {
    // Call original json first
    originalJson.call(this, data);
    
    // If successful (201 created), broadcast to room
    if (res.statusCode === 201 && data.id) {
      const io = getIO();
      io.to(`room:${data.roomId}`).emit('message:received', data);
    }
  };
  
  return c.sendRoomMessage(req, res);
}

async function editMessageWithBroadcast(req, res) {
  const originalJson = res.json;
  res.json = function(data) {
    // Call original json first
    originalJson.call(this, data);
    
    // If successful (200), broadcast to all rooms this message belongs to
    if (res.statusCode === 200 && data.id) {
      const io = getIO();
      // Find which room this message belongs to and broadcast
      const { chatStore } = require('../utils/chatStore');
      const msg = chatStore.messages.find(m => m.id === data.id);
      if (msg) {
        io.to(`room:${msg.roomId}`).emit('message:updated', data);
      }
    }
  };
  
  return c.editMessage(req, res);
}

async function deleteMessageWithBroadcast(req, res) {
  // Get message roomId before deletion for broadcasting
  const { chatStore } = require('../utils/chatStore');
  const message = chatStore.messages.find(m => m.id === Number(req.params.messageId));
  const roomId = message?.roomId;
  
  const originalJson = res.json;
  res.json = function(data) {
    // Call original json first
    originalJson.call(this, data);
    
    // If successful (200), broadcast to room
    if (res.statusCode === 200 && roomId) {
      const io = getIO();
      io.to(`room:${roomId}`).emit('message:deleted', { 
        id: Number(req.params.messageId),
        roomId 
      });
    }
  };
  
  return c.deleteMessage(req, res);
}

router.get('/room/:roomId', authenticate, c.getRoomMessages);
router.post('/room/:roomId', authenticate, sendRoomMessageWithBroadcast);
router.put('/:messageId', authenticate, editMessageWithBroadcast);
router.delete('/:messageId', authenticate, deleteMessageWithBroadcast);

module.exports = router;