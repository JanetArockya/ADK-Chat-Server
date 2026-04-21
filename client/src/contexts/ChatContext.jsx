import React, { createContext, useState, useCallback, useEffect } from 'react';
import { roomsAPI, messagesAPI, dialogsAPI, friendsAPI } from '../services/api';
import WebSocketService from '../services/websocket';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentDialogId, setCurrentDialogId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentDialog, setCurrentDialog] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const [typingUsers, setTypingUsers] = useState({});
  const [userPresence, setUserPresence] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, dialogsRes, friendsRes, requestsRes] = await Promise.all([
        roomsAPI.getMyRooms(),
        dialogsAPI.getDialogs(),
        friendsAPI.getFriends(),
        friendsAPI.getFriendRequests(),
      ]);

      setRooms(roomsRes.data);
      setDialogs(dialogsRes.data);
      setFriends(friendsRes.data);
      setFriendRequests(requestsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load room messages
  const loadRoomMessages = useCallback(async (roomId) => {
    try {
      setLoading(true);
      const [roomRes, messagesRes, membersRes] = await Promise.all([
        roomsAPI.getRoom(roomId),
        messagesAPI.getRoomMessages(roomId, { limit: 50 }),
        roomsAPI.getMembers(roomId),
      ]);

      setCurrentRoom(roomRes.data);
      setMessages(messagesRes.data);
      setMembers(membersRes.data);
      setCurrentRoomId(roomId);
      setCurrentDialogId(null);
      
      WebSocketService.joinRoom(roomId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dialog messages
  const loadDialogMessages = useCallback(async (userId) => {
    try {
      setLoading(true);
      const [dialogRes, messagesRes] = await Promise.all([
        dialogsAPI.getDialog(userId),
        dialogsAPI.getMessages(userId, { limit: 50 }),
      ]);

      setCurrentDialog(dialogRes.data);
      setMessages(messagesRes.data);
      setCurrentDialogId(userId);
      setCurrentRoomId(null);
      
      WebSocketService.joinDialog(dialogRes.data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send room message
  const sendRoomMessage = useCallback(async (roomId, content, replyTo, attachments) => {
    try {
      const response = await messagesAPI.sendRoomMessage(roomId, {
        content,
        replyTo,
        attachments,
      });
      setMessages((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Send dialog message
  const sendDialogMessage = useCallback(async (userId, content, replyTo, attachments) => {
    try {
      const response = await dialogsAPI.sendMessage(userId, {
        content,
        replyTo,
        attachments,
      });
      setMessages((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Edit message
  const editMessage = useCallback(async (messageId, content) => {
    try {
      const response = await messagesAPI.editMessage(messageId, { content });
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? response.data : msg))
      );
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Create room
  const createRoom = useCallback(async (data) => {
    try {
      const response = await roomsAPI.createRoom(data);
      setRooms((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (roomId) => {
    try {
      const response = await roomsAPI.joinRoom(roomId);
      setRooms((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(async (roomId) => {
    try {
      await roomsAPI.leaveRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setCurrentRoom(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentRoomId]);

  // Send friend request
  const sendFriendRequest = useCallback(async (username, message) => {
    try {
      const response = await friendsAPI.sendFriendRequest({ username, message });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      await loadInitialData(); // Refresh friends list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadInitialData]);

  // Setup WebSocket listeners
  useEffect(() => {
    const socket = WebSocketService.getSocket();
    if (!socket) return;

    socket.on('user:presence', ({ userId, status }) => {
      setUserPresence((prev) => ({ ...prev, [userId]: status }));
    });

    socket.on('typing:start', ({ userId, username, roomId, dialogId }) => {
      const key = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      setTypingUsers((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { userId, username }],
      }));
    });

    socket.on('typing:stop', ({ userId, roomId, dialogId }) => {
      const key = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      setTypingUsers((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((u) => u.userId !== userId),
      }));
    });

    // Listen for real-time message events
    socket.on('message:received', (message) => {
      setMessages((prev) => {
        // Only add if not already in list (avoid duplicates from sender's optimistic update)
        const exists = prev.some((m) => m.id === message.id);
        return exists ? prev : [...prev, message];
      });
    });

    socket.on('message:updated', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    });

    socket.on('message:deleted', ({ id }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    return () => {
      socket.off('user:presence');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:received');
      socket.off('message:updated');
      socket.off('message:deleted');
    };
  }, []);

  const value = {
    rooms,
    dialogs,
    friends,
    friendRequests,
    bannedUsers,
    currentRoomId,
    currentDialogId,
    currentRoom,
    currentDialog,
    messages,
    members,
    unreadCounts,
    typingUsers,
    userPresence,
    loading,
    error,
    loadInitialData,
    loadRoomMessages,
    loadDialogMessages,
    sendRoomMessage,
    sendDialogMessage,
    editMessage,
    deleteMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    sendFriendRequest,
    acceptFriendRequest,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
