import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useContext';
import { useAuth } from '../hooks/useContext';
import WebSocketService from '../services/websocket';
import { Message, MessageInput, TypingIndicator, DateDivider } from '../components/Message';
import { RoomItem, ContactItem, RoomHeader, DialogHeader, MemberItem } from '../components/Chat';
import { Button, Input, Modal, Toast, Loading } from '../components/Common';
import { formatTime } from '../utils/helpers';

export const Chat = () => {
  const { user } = useAuth();
  const {
    rooms,
    dialogs,
    friends,
    currentRoomId,
    currentDialogId,
    currentRoom,
    currentDialog,
    messages,
    members,
    userPresence,
    typingUsers,
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
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState('rooms'); // rooms, dialogs, friends
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSearchPublicRooms, setShowSearchPublicRooms] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      WebSocketService.setActive();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    const afkTimer = setTimeout(() => {
      WebSocketService.setAFK();
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearTimeout(afkTimer);
    };
  }, []);

  const handleCreateRoom = async (data) => {
    try {
      setLoading(true);
      await createRoom(data);
      setShowCreateRoom(false);
      setToast({ type: 'success', message: 'Room created successfully' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPublicRoom = async (roomId) => {
    try {
      setLoading(true);
      await joinRoom(roomId);
      setShowSearchPublicRooms(false);
      setToast({ type: 'success', message: 'Joined room successfully' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content) => {
    try {
      if (currentRoomId) {
        await sendRoomMessage(currentRoomId, content, replyingTo?.id, null);
      } else if (currentDialogId) {
        await sendDialogMessage(currentDialogId, content, replyingTo?.id, null);
      }
      setReplyingTo(null);
      setEditingMessage(null);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to send message' });
    }
  };

  const handleEditMessage = async (content) => {
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, content);
        setEditingMessage(null);
        setToast({ type: 'success', message: 'Message updated' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to edit message' });
    }
  };

  const getTypingUsers = () => {
    if (currentRoomId) {
      return typingUsers[`room:${currentRoomId}`] || [];
    } else if (currentDialogId) {
      return typingUsers[`dialog:${currentDialogId}`] || [];
    }
    return [];
  };

  const renderMessages = () => {
    if (!messages || messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      );
    }

    return messages.map((msg, idx) => (
      <div key={msg.id}>
        {idx === 0 && <DateDivider date={msg.createdAt} />}
        {idx > 0 && messages[idx - 1].createdAt.split('T')[0] !== msg.createdAt.split('T')[0] && (
          <DateDivider date={msg.createdAt} />
        )}
        <Message
          message={msg}
          currentUserId={user.id}
          onEdit={setEditingMessage}
          onDelete={() => deleteMessage(msg.id).catch(() => setToast({ type: 'error', message: 'Failed to delete' }))}
          onReply={setReplyingTo}
        />
      </div>
    ));
  };

  return (
    <div className="flex h-screen bg-light">
      {/* Sidebar */}
      <div
        className={`w-64 bg-white border-r border-gray-200 flex flex-col transition-all ${
          !sidebarOpen ? '-translate-x-full' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">ChatApp</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['rooms', 'dialogs', 'friends'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Search and Add */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <Input placeholder="Search..." type="text" />
          {tab === 'rooms' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowCreateRoom(true)}
                className="flex-1"
              >
                New Room
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSearchPublicRooms(true)}
                className="flex-1"
              >
                Browse
              </Button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {tab === 'rooms' &&
            rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={currentRoomId === room.id}
                onClick={() => loadRoomMessages(room.id)}
              />
            ))}
          {tab === 'dialogs' &&
            dialogs.map((dialog) => (
              <ContactItem
                key={dialog.id}
                contact={dialog.participant}
                status={userPresence[dialog.participantId] || 'offline'}
                isActive={currentDialogId === dialog.participantId}
                onClick={() => loadDialogMessages(dialog.participantId)}
              />
            ))}
          {tab === 'friends' &&
            friends.map((friend) => (
              <ContactItem
                key={friend.id}
                contact={friend}
                status={userPresence[friend.id] || 'offline'}
                isActive={currentDialogId === friend.id}
                onClick={() => loadDialogMessages(friend.id)}
              />
            ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium">{user?.username}</span>
          <button className="text-gray-600 hover:text-gray-900">⋮</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentRoom || currentDialog ? (
          <>
            {/* Header */}
            {currentRoom && (
              <RoomHeader
                room={currentRoom}
                memberCount={members.length}
                onSettings={() => {}}
                onBack={!sidebarOpen ? () => setSidebarOpen(true) : null}
              />
            )}
            {currentDialog && (
              <DialogHeader
                contact={currentDialog.participant || friends.find(f => f.id === currentDialogId)}
                status={userPresence[currentDialogId] || 'offline'}
                onBack={!sidebarOpen ? () => setSidebarOpen(true) : null}
              />
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-2"
            >
              {renderMessages()}
              <TypingIndicator users={getTypingUsers()} />
              <div ref={messagesEndRef} />
            </div>

            {/* Reply/Edit Bar */}
            {(replyingTo || editingMessage) && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
                <div>
                  {replyingTo && <span>Replying to: {replyingTo.userName}</span>}
                  {editingMessage && <span>Editing message...</span>}
                </div>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input */}
            <MessageInput
              onSend={editingMessage ? handleEditMessage : handleSendMessage}
              onAttach={() => setToast({ type: 'info', message: 'File upload coming soon' })}
              disabled={loading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-2xl mb-2">👋</p>
              <p>Select a room or start a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onSubmit={handleCreateRoom}
        loading={loading}
      />

      <SearchPublicRoomsModal
        isOpen={showSearchPublicRooms}
        onClose={() => setShowSearchPublicRooms(false)}
        onJoin={handleJoinPublicRoom}
      />

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

// Helper Components
const CreateRoomModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'Room name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name, description, visibility: isPrivate ? 'private' : 'public' });
    setName('');
    setDescription('');
    setIsPrivate(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Room" size="md">
      <div className="space-y-4">
        <Input
          label="Room Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="my-room"
        />
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this room about?"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Private room</span>
        </label>
        <Button onClick={handleSubmit} loading={loading} className="w-full">
          Create Room
        </Button>
      </div>
    </Modal>
  );
};

const SearchPublicRoomsModal = ({ isOpen, onClose, onJoin }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      // TODO: Implement search
      setPublicRooms([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse Public Rooms" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
          />
          <Button onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {publicRooms.length === 0 ? (
            <p className="text-gray-500 text-sm">No rooms found</p>
          ) : (
            publicRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <h4 className="font-medium"># {room.name}</h4>
                  <p className="text-xs text-gray-500">{room.memberCount} members</p>
                </div>
                <Button size="sm" onClick={() => onJoin(room.id)}>
                  Join
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default Chat;
