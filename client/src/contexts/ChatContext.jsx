import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { roomsAPI, messagesAPI, dialogsAPI, friendsAPI, attachmentsAPI } from '../services/api';
import WebSocketService from '../services/websocket';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentDialogId, setCurrentDialogId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentDialog, setCurrentDialog] = useState(null);

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState({ rooms: {}, dialogs: {} });
  const [typingUsers, setTypingUsers] = useState({});
  const [userPresence, setUserPresence] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track current dialog DB id separately from participant userId
  const currentDialogDbId = useRef(null);

  const updateUnread = useCallback((update) => {
    setUnreadCounts((prev) => {
      if ('roomId' in update) {
        return { ...prev, rooms: { ...prev.rooms, [update.roomId]: update.count } };
      }
      if ('dialogId' in update) {
        return { ...prev, dialogs: { ...prev.dialogs, [update.dialogId]: update.count } };
      }
      return prev;
    });
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, dialogsRes, friendsRes, requestsRes, invitesRes] = await Promise.all([
        roomsAPI.getMyRooms(),
        dialogsAPI.getDialogs(),
        friendsAPI.getFriends(),
        friendsAPI.getFriendRequests(),
        roomsAPI.getMyInvitations(),
      ]);
      setRooms(roomsRes.data);
      setDialogs(dialogsRes.data);
      setFriends(friendsRes.data);
      setFriendRequests(requestsRes.data);
      setInvitations(invitesRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
      setHasOlderMessages(messagesRes.data.length === 50);
      setMembers(membersRes.data);
      setCurrentRoomId(roomId);
      setCurrentDialogId(null);
      currentDialogDbId.current = null;
      WebSocketService.joinRoom(roomId);
      // Mark as read
      roomsAPI.markRead(roomId).catch(() => {});
      updateUnread({ roomId, count: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [updateUnread]);

  const loadDialogMessages = useCallback(async (userId) => {
    try {
      setLoading(true);
      const dialogRes = await dialogsAPI.getDialog(userId);
      const dialogDbId = dialogRes.data.id;
      currentDialogDbId.current = dialogDbId;

      const messagesRes = await dialogsAPI.getMessages(dialogDbId, { limit: 50 });
      setCurrentDialog(dialogRes.data);
      setMessages(messagesRes.data);
      setHasOlderMessages(messagesRes.data.length === 50);
      setCurrentDialogId(userId);
      setCurrentRoomId(null);
      setCurrentRoom(null);
      WebSocketService.joinDialog(dialogDbId);
      // Mark as read
      dialogsAPI.markRead(dialogDbId).catch(() => {});
      updateUnread({ dialogId: dialogDbId, count: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [updateUnread]);

  const loadOlderMessages = useCallback(async () => {
    if (!messages.length) return;
    const before = messages[0].id;
    try {
      let older;
      if (currentRoomId) {
        const res = await messagesAPI.getRoomMessages(currentRoomId, { limit: 50, before });
        older = res.data;
      } else if (currentDialogDbId.current) {
        const res = await dialogsAPI.getMessages(currentDialogDbId.current, { limit: 50, before });
        older = res.data;
      } else return;
      setHasOlderMessages(older.length === 50);
      setMessages((prev) => [...older, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }, [messages, currentRoomId]);

  const sendRoomMessage = useCallback(async (roomId, content, replyTo, attachmentIds) => {
    const response = await messagesAPI.sendRoomMessage(roomId, { content, replyTo, attachmentIds: attachmentIds || [] });
    return response.data;
  }, []);

  const sendDialogMessage = useCallback(async (userId, content, replyTo, attachmentIds) => {
    const response = await dialogsAPI.sendMessage(userId, { content, replyTo, attachmentIds: attachmentIds || [] });
    return response.data;
  }, []);

  const editMessage = useCallback(async (messageId, content, isDialog) => {
    const response = isDialog
      ? await dialogsAPI.editMessage(messageId, { content })
      : await messagesAPI.editMessage(messageId, { content });
    setMessages((prev) => prev.map((m) => (m.id === messageId ? response.data : m)));
    return response.data;
  }, []);

  const deleteMessage = useCallback(async (messageId, isDialog) => {
    if (isDialog) {
      await dialogsAPI.deleteMessage(messageId);
    } else {
      await messagesAPI.deleteMessage(messageId);
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const uploadAttachment = useCallback(async (file, comment = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (comment) formData.append('comment', comment);
    let response;
    if (currentRoomId) {
      response = await attachmentsAPI.uploadRoomAttachment(currentRoomId, formData);
    } else if (currentDialogDbId.current) {
      response = await attachmentsAPI.uploadDialogAttachment(currentDialogDbId.current, formData);
    } else {
      throw new Error('No active room or dialog');
    }
    return response.data;
  }, [currentRoomId]);

  const createRoom = useCallback(async (data) => {
    const response = await roomsAPI.createRoom(data);
    setRooms((prev) => [...prev, response.data]);
    return response.data;
  }, []);

  const joinRoom = useCallback(async (roomId) => {
    const response = await roomsAPI.joinRoom(roomId);
    setRooms((prev) => {
      const exists = prev.some((r) => r.id === roomId);
      return exists ? prev : [...prev, response.data];
    });
    return response.data;
  }, []);

  const leaveRoom = useCallback(async (roomId) => {
    await roomsAPI.leaveRoom(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (currentRoomId === roomId) {
      setCurrentRoomId(null);
      setCurrentRoom(null);
      setMessages([]);
    }
  }, [currentRoomId]);

  const acceptRoomInvite = useCallback(async (roomId) => {
    const response = await roomsAPI.acceptInvite(roomId);
    setInvitations((prev) => prev.filter((i) => i.roomId !== roomId));
    setRooms((prev) => [...prev, response.data]);
    return response.data;
  }, []);

  const sendFriendRequest = useCallback(async (username, message) => {
    const response = await friendsAPI.sendFriendRequest({ username, message });
    return response.data;
  }, []);

  const acceptFriendRequest = useCallback(async (requestId) => {
    await friendsAPI.acceptFriendRequest(requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    const friendsRes = await friendsAPI.getFriends();
    setFriends(friendsRes.data);
  }, []);

  const rejectFriendRequest = useCallback(async (requestId) => {
    await friendsAPI.rejectFriendRequest(requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const removeFriend = useCallback(async (friendId) => {
    await friendsAPI.removeFriend(friendId);
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }, []);

  // WebSocket listeners
  useEffect(() => {
    const socket = WebSocketService.getSocket();
    if (!socket) return;

    const onPresence = ({ userId, status }) =>
      setUserPresence((prev) => ({ ...prev, [userId]: status }));

    const onTypingStart = ({ userId, username, roomId, dialogId }) => {
      const key = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      setTypingUsers((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []).filter((u) => u.userId !== userId), { userId, username }],
      }));
    };

    const onTypingStop = ({ userId, roomId, dialogId }) => {
      const key = roomId ? `room:${roomId}` : `dialog:${dialogId}`;
      setTypingUsers((prev) => ({ ...prev, [key]: (prev[key] || []).filter((u) => u.userId !== userId) }));
    };

    const onMessageReceived = (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    };

    const onMessageUpdated = (updated) =>
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    const onMessageDeleted = ({ id }) =>
      setMessages((prev) => prev.filter((m) => m.id !== id));

    const onUnreadUpdate = (data) => updateUnread(data);

    const onUnreadInitial = (counts) => {
      const rooms = {};
      const dialogs = {};
      counts.forEach(({ roomId, dialogId, count }) => {
        if (roomId) rooms[roomId] = count;
        if (dialogId) dialogs[dialogId] = count;
      });
      setUnreadCounts({ rooms, dialogs });
    };

    const onRoomInvited = ({ roomId, roomName, invitedBy }) => {
      setInvitations((prev) => {
        if (prev.some((i) => i.roomId === roomId)) return prev;
        return [...prev, { roomId, roomName, invitedBy, createdAt: new Date().toISOString() }];
      });
    };

    const onRoomBanned = ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setCurrentRoom((prev) => (prev?.id === roomId ? null : prev));
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setMessages([]);
      }
    };

    socket.on('user:presence', onPresence);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('message:received', onMessageReceived);
    socket.on('message:updated', onMessageUpdated);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('unread:update', onUnreadUpdate);
    socket.on('unread:initial', onUnreadInitial);
    socket.on('room:invited', onRoomInvited);
    socket.on('room:banned', onRoomBanned);

    return () => {
      socket.off('user:presence', onPresence);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:received', onMessageReceived);
      socket.off('message:updated', onMessageUpdated);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('unread:update', onUnreadUpdate);
      socket.off('unread:initial', onUnreadInitial);
      socket.off('room:invited', onRoomInvited);
      socket.off('room:banned', onRoomBanned);
    };
  }, [updateUnread, currentRoomId]);

  const value = {
    rooms, dialogs, friends, friendRequests, invitations,
    currentRoomId, currentDialogId, currentRoom, currentDialog,
    messages, members, hasOlderMessages,
    unreadCounts, typingUsers, userPresence, loading, error,
    loadInitialData, loadRoomMessages, loadDialogMessages, loadOlderMessages,
    sendRoomMessage, sendDialogMessage, editMessage, deleteMessage, uploadAttachment,
    createRoom, joinRoom, leaveRoom, acceptRoomInvite,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
    setMembers,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
