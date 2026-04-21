import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useContext';
import { useAuth } from '../hooks/useContext';
import WebSocketService from '../services/websocket';
import { roomsAPI, messagesAPI, dialogsAPI, friendsAPI } from '../services/api';
import { Message, MessageInput, TypingIndicator, DateDivider } from '../components/Message';
import { RoomItem, ContactItem, RoomHeader, DialogHeader, MemberItem } from '../components/Chat';
import { Button, Input, Modal, Toast, Loading, Card, Badge } from '../components/Common';
import { RoomSettingsModal, InviteUserModal, AddFriendModal, UserProfileModal } from '../components/Modals';
import { FriendRequestItem, FriendCard, PublicRoomCard, EmptyState, UserListItem } from '../components/Cards';
import { formatTime } from '../utils/helpers';

export const ChatPage = () => {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const {
    rooms,
    dialogs,
    friends,
    friendRequests,
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
    sendFriendRequest,
    acceptFriendRequest,
  } = useChat();

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState('rooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSearchPublicRooms, setShowSearchPublicRooms] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Message States
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Room/Dialog States
  const [bannedUsers, setBannedUsers] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [searchPublicQuery, setSearchPublicQuery] = useState('');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track activity
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

  const handleJoinRoom = async (roomId) => {
    try {
      setLoading(true);
      await joinRoom(roomId);
      setShowSearchPublicRooms(false);
      setToast({ type: 'success', message: 'Joined room successfully' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to join room' });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (window.confirm('Leave this room?')) {
      try {
        await leaveRoom(currentRoomId);
        setToast({ type: 'success', message: 'Left room' });
      } catch (err) {
        setToast({ type: 'error', message: 'Failed to leave room' });
      }
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

  const handleLoadRoomBans = async () => {
    try {
      const response = await roomsAPI.getBannedUsers(currentRoomId);
      setBannedUsers(response.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load banned users' });
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await roomsAPI.unbanUser(currentRoomId, userId);
      setBannedUsers((prev) => prev.filter((u) => u.userId !== userId));
      setToast({ type: 'success', message: 'User unbanned' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to unban user' });
    }
  };

  const handleAddFriend = async (username, message) => {
    try {
      setLoading(true);
      await sendFriendRequest(username, message);
      setShowAddFriend(false);
      setToast({ type: 'success', message: 'Friend request sent' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to send friend request' });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      setToast({ type: 'success', message: 'Friend request accepted' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to accept request' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to logout' });
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
        <EmptyState
          icon="💬"
          title="No messages yet"
          description="Start the conversation!"
        />
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
          currentUserId={user?.id}
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
          !sidebarOpen ? 'hidden' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ChatApp</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-600 hover:text-gray-900 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['rooms', 'dialogs', 'friends'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="p-3 border-b border-gray-200 space-y-2">
          <Input placeholder="Search..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {tab === 'rooms' && (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => setShowCreateRoom(true)} className="flex-1">
                New
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowSearchPublicRooms(true)} className="flex-1">
                Browse
              </Button>
            </div>
          )}
          {tab === 'friends' && (
            <Button size="sm" onClick={() => setShowAddFriend(true)} className="w-full">
              Add Friend
            </Button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tab === 'rooms' &&
            rooms
              ?.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((room) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isActive={currentRoomId === room.id}
                  onClick={() => loadRoomMessages(room.id)}
                />
              ))}

          {tab === 'dialogs' &&
            dialogs
              ?.filter((d) => d.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((dialog) => (
                <ContactItem
                  key={dialog.id}
                  contact={dialog.participant}
                  status={userPresence[dialog.participantId] || 'offline'}
                  isActive={currentDialogId === dialog.participantId}
                  onClick={() => loadDialogMessages(dialog.participantId)}
                />
              ))}

          {tab === 'friends' && (
            <>
              {friendRequests?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-700 px-3 py-2">Friend Requests ({friendRequests.length})</h3>
                  {friendRequests.map((req) => (
                    <div key={req.id} className="mb-2">
                      <FriendRequestItem
                        request={req}
                        onAccept={() => handleAcceptFriendRequest(req.id)}
                        onReject={() => {}}
                        loading={loading}
                      />
                    </div>
                  ))}
                </div>
              )}
              <h3 className="text-xs font-semibold text-gray-700 px-3 py-2">Friends</h3>
              {friends
                ?.filter((f) => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((friend) => (
                  <ContactItem
                    key={friend.id}
                    contact={friend}
                    status={userPresence[friend.id] || 'offline'}
                    isActive={currentDialogId === friend.id}
                    onClick={() => loadDialogMessages(friend.id)}
                  />
                ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{user?.username}</span>
          <button onClick={() => setShowUserProfile(true)} className="text-gray-600 hover:text-gray-900">
            ⚙
          </button>
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
                memberCount={members?.length || 0}
                onSettings={() => {
                  handleLoadRoomBans();
                  setShowRoomSettings(true);
                }}
                onBack={() => setSidebarOpen(true)}
              />
            )}
            {currentDialog && (
              <DialogHeader
                contact={currentDialog?.participant || friends?.find((f) => f.id === currentDialogId)}
                status={userPresence[currentDialogId] || 'offline'}
                onBack={() => setSidebarOpen(true)}
              />
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
              {renderMessages()}
              <TypingIndicator users={getTypingUsers()} />
              <div ref={messagesEndRef} />
            </div>

            {/* Reply/Edit Bar */}
            {(replyingTo || editingMessage) && (
              <div className="px-4 py-2 bg-blue-50 border-t-2 border-blue-200 flex items-center justify-between text-sm">
                <div>
                  {replyingTo && <span className="text-blue-900">Replying to: <strong>{replyingTo.userName}</strong></span>}
                  {editingMessage && <span className="text-blue-900">Editing message...</span>}
                </div>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                  }}
                  className="text-blue-600 hover:text-blue-900 font-bold"
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
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon="👋"
              title="Welcome to ChatApp"
              description="Select a room or start a conversation to begin"
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRoomModal isOpen={showCreateRoom} onClose={() => setShowCreateRoom(false)} onSubmit={handleCreateRoom} loading={loading} />

      <SearchPublicRoomsModal
        isOpen={showSearchPublicRooms}
        onClose={() => setShowSearchPublicRooms(false)}
        onJoin={handleJoinRoom}
        loading={loading}
      />

      <RoomSettingsModal
        isOpen={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
        room={currentRoom}
        isAdmin={currentRoom?.ownerId === user?.id || members?.find((m) => m.id === user?.id)?.isAdmin}
        onUpdate={async (data) => {
          try {
            await roomsAPI.updateRoom(currentRoomId, data);
            setToast({ type: 'success', message: 'Room updated' });
            setShowRoomSettings(false);
          } catch (err) {
            setToast({ type: 'error', message: 'Failed to update room' });
          }
        }}
        onDelete={async () => {
          try {
            await roomsAPI.deleteRoom(currentRoomId);
            setToast({ type: 'success', message: 'Room deleted' });
            setShowRoomSettings(false);
          } catch (err) {
            setToast({ type: 'error', message: 'Failed to delete room' });
          }
        }}
        onBan={async (userId) => {
          try {
            await roomsAPI.banUser(currentRoomId, userId);
            setToast({ type: 'success', message: 'User banned' });
          } catch (err) {
            setToast({ type: 'error', message: 'Failed to ban user' });
          }
        }}
        onUnban={handleUnbanUser}
        onMakeAdmin={async (userId) => {
          try {
            await roomsAPI.addAdmin(currentRoomId, userId);
            setToast({ type: 'success', message: 'User promoted' });
          } catch (err) {
            setToast({ type: 'error', message: 'Failed to promote user' });
          }
        }}
        onRemoveAdmin={async (userId) => {
          try {
            await roomsAPI.removeAdmin(currentRoomId, userId);
            setToast({ type: 'success', message: 'Admin removed' });
          } catch (err) {
            setToast({ type: 'error', message: 'Failed to remove admin' });
          }
        }}
        members={members}
        bannedUsers={bannedUsers}
      />

      <InviteUserModal isOpen={showInviteUser} onClose={() => setShowInviteUser(false)} onInvite={async (username) => {
        try {
          await roomsAPI.inviteUser(currentRoomId, { username });
          setToast({ type: 'success', message: 'Invitation sent' });
          setShowInviteUser(false);
        } catch (err) {
          setToast({ type: 'error', message: 'Failed to send invitation' });
        }
      }} loading={loading} />

      <AddFriendModal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onSend={handleAddFriend}
        loading={loading}
      />

      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={user}
        onLogout={handleLogout}
        onChangePassword={changePassword}
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
    if (!name.trim()) newErrors.name = 'Room name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({ name, description, visibility: isPrivate ? 'private' : 'public' });
    setName('');
    setDescription('');
    setIsPrivate(false);
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Room" size="md">
      <div className="space-y-4">
        <Input label="Room Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="my-room" />
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
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded border-gray-300" />
          <span className="text-sm text-gray-700">Private room</span>
        </label>
        <Button onClick={handleSubmit} loading={loading} className="w-full">
          Create Room
        </Button>
      </div>
    </Modal>
  );
};

const SearchPublicRoomsModal = ({ isOpen, onClose, onJoin, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    try {
      setSearching(true);
      const response = await roomsAPI.getPublicRooms({ search: searchQuery });
      setPublicRooms(response.data);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse Public Rooms" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search rooms..." />
          <Button onClick={handleSearch} loading={searching}>
            Search
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {publicRooms.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No rooms found</p>
          ) : (
            publicRooms.map((room) => (
              <PublicRoomCard key={room.id} room={room} onJoin={onJoin} loading={loading} />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChatPage;
