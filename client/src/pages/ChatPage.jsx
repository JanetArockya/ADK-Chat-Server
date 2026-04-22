import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useContext';
import { useAuth } from '../hooks/useContext';
import WebSocketService from '../services/websocket';
import { roomsAPI, authAPI } from '../services/api';
import { Message, MessageInput, TypingIndicator, DateDivider, LoadOlderButton } from '../components/Message';
import { RoomItem, ContactItem, RoomHeader, DialogHeader, MemberItem } from '../components/Chat';
import { Button, Input, Modal, Toast, Loading } from '../components/Common';
import { RoomSettingsModal, AddFriendModal, UserProfileModal, InvitationsModal } from '../components/Modals';
import { FriendRequestItem, PublicRoomCard, EmptyState } from '../components/Cards';
import { formatTime } from '../utils/helpers';

export const ChatPage = () => {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const {
    rooms, dialogs, friends, friendRequests, invitations,
    currentRoomId, currentDialogId, currentRoom, currentDialog,
    messages, members, hasOlderMessages,
    unreadCounts, userPresence, typingUsers,
    loadInitialData, loadRoomMessages, loadDialogMessages, loadOlderMessages,
    sendRoomMessage, sendDialogMessage, editMessage, deleteMessage, uploadAttachment,
    createRoom, joinRoom, leaveRoom, acceptRoomInvite,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
    setMembers,
  } = useChat();

  const [tab, setTab] = useState('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);

  // Modals
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showPublicRooms, setShowPublicRooms] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);

  // Message states
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const fileInputRef = useRef(null);

  // Scroll state
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const wasAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => { loadInitialData(); }, []);

  // Track scroll position before messages update
  const isAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Auto-scroll only if user was at bottom
  useEffect(() => {
    if (wasAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    wasAtBottomRef.current = isAtBottom();
  }, [isAtBottom]);

  const handleLoadOlder = async () => {
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    setOlderLoading(true);
    try {
      await loadOlderMessages();
      // Restore scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setOlderLoading(false);
    }
  };

  // Activity tracking for AFK
  useEffect(() => {
    let afkTimer;
    const resetAFK = () => {
      WebSocketService.setActive();
      clearTimeout(afkTimer);
      afkTimer = setTimeout(() => WebSocketService.setAFK(), 60000);
    };
    window.addEventListener('mousemove', resetAFK);
    window.addEventListener('keypress', resetAFK);
    resetAFK();
    return () => {
      window.removeEventListener('mousemove', resetAFK);
      window.removeEventListener('keypress', resetAFK);
      clearTimeout(afkTimer);
    };
  }, []);

  const showToast = (type, message) => setToast({ type, message });

  const handleSelectRoom = async (roomId) => {
    wasAtBottomRef.current = true;
    await loadRoomMessages(roomId);
  };

  const handleSelectDialog = async (userId) => {
    wasAtBottomRef.current = true;
    await loadDialogMessages(userId);
  };

  const handleSendMessage = async (content) => {
    if (!pendingAttachment && !content.trim()) return;
    try {
      let attachmentIds = [];
      if (pendingAttachment) {
        const uploaded = await uploadAttachment(pendingAttachment.file);
        attachmentIds = [uploaded.id];
        setPendingAttachment(null);
      }
      if (currentRoomId) {
        await sendRoomMessage(currentRoomId, content, replyingTo?.id, attachmentIds);
      } else if (currentDialogId) {
        await sendDialogMessage(currentDialogId, content, replyingTo?.id, attachmentIds);
      }
      setReplyingTo(null);
      setEditingMessage(null);
      wasAtBottomRef.current = true;
    } catch (err) {
      showToast('error', err.message || 'Failed to send message');
    }
  };

  const handleEditMessage = async (content) => {
    if (!editingMessage) return;
    try {
      const isDialog = !!currentDialogId;
      await editMessage(editingMessage.id, content, isDialog);
      setEditingMessage(null);
    } catch {
      showToast('error', 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const isDialog = !!currentDialogId;
      await deleteMessage(messageId, isDialog);
    } catch {
      showToast('error', 'Failed to delete message');
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const MAX = file.type.startsWith('image/') ? 3 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > MAX) {
      showToast('error', `File too large (max ${file.type.startsWith('image/') ? '3 MB' : '20 MB'})`);
      return;
    }
    setPendingAttachment({ file, name: file.name, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null });
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        handleFileSelect(item.getAsFile());
        break;
      }
    }
  }, []);

  const handleLoadRoomBans = async () => {
    if (!currentRoomId) return;
    try { const res = await roomsAPI.getBannedUsers(currentRoomId); setBannedUsers(res.data); }
    catch {}
  };

  const handleOpenRoomSettings = async () => {
    await handleLoadRoomBans();
    setShowRoomSettings(true);
  };

  const handleCreateRoom = async (data) => {
    try {
      setLoading(true);
      await createRoom(data);
      setShowCreateRoom(false);
      showToast('success', 'Room created');
    } catch (err) { showToast('error', err.message || 'Failed to create room'); }
    finally { setLoading(false); }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      setLoading(true);
      await joinRoom(roomId);
      setShowPublicRooms(false);
      showToast('success', 'Joined room');
    } catch (err) { showToast('error', err.message || 'Failed to join room'); }
    finally { setLoading(false); }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('Leave this room?')) return;
    try { await leaveRoom(currentRoomId); showToast('success', 'Left room'); }
    catch { showToast('error', 'Failed to leave room'); }
  };

  const handleAddFriend = async (username, message) => {
    try {
      setLoading(true);
      await sendFriendRequest(username, message);
      setShowAddFriend(false);
      showToast('success', 'Friend request sent');
    } catch (err) { showToast('error', err.message || 'Failed to send request'); }
    finally { setLoading(false); }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Remove this friend?')) return;
    try { await removeFriend(friendId); showToast('success', 'Friend removed'); }
    catch { showToast('error', 'Failed to remove friend'); }
  };

  const handleAcceptInvite = async (roomId) => {
    try {
      await acceptRoomInvite(roomId);
      setShowInvitations(false);
      showToast('success', 'Joined room via invitation');
    } catch (err) { showToast('error', err.message || 'Failed to accept invitation'); }
  };

  const isCurrentUserAdmin = () => {
    if (!currentRoom || !user) return false;
    if (currentRoom.ownerId === user.id) return true;
    return members?.find((m) => m.id === user.id)?.isAdmin || false;
  };

  const getTypingText = () => {
    const key = currentRoomId ? `room:${currentRoomId}` : currentDialogId ? `dialog:${currentDialogId}` : null;
    return key ? typingUsers[key] || [] : [];
  };

  const getRoomUnread = (roomId) => unreadCounts.rooms?.[roomId] || 0;
  const getDialogUnread = (dialog) => unreadCounts.dialogs?.[dialog?.id] || 0;

  const renderMessages = () => {
    if (!messages || messages.length === 0) {
      return <EmptyState icon="💬" title="No messages yet" description="Start the conversation!" />;
    }
    return messages.map((msg, idx) => (
      <div key={msg.id}>
        {(idx === 0 || messages[idx - 1].createdAt.split('T')[0] !== msg.createdAt.split('T')[0]) && (
          <DateDivider date={msg.createdAt} />
        )}
        <Message
          message={msg}
          currentUserId={user?.id}
          isAdmin={isCurrentUserAdmin()}
          onEdit={setEditingMessage}
          onDelete={handleDeleteMessage}
          onReply={setReplyingTo}
        />
      </div>
    ));
  };

  const totalUnread = Object.values(unreadCounts.rooms || {}).reduce((a, b) => a + b, 0) +
    Object.values(unreadCounts.dialogs || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="h-screen bg-gray-50 flex flex-col" onPaste={handlePaste}>
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900 mr-3">ChatApp</h1>
          <button onClick={() => setTab('public')} className={`px-2.5 py-1.5 text-sm rounded ${tab === 'public' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Public Rooms</button>
          <button onClick={() => setTab('private')} className={`px-2.5 py-1.5 text-sm rounded ${tab === 'private' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Private Rooms</button>
          <button onClick={() => setTab('dialogs')} className={`px-2.5 py-1.5 text-sm rounded ${tab === 'dialogs' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Contacts</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUserProfile(true)} className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Sessions</button>
          <button onClick={() => setShowUserProfile(true)} className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Profile</button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded">Sign out</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Navigation</h2>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalUnread}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['public', 'private', 'dialogs', 'friends'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
              {t === 'public' ? 'Public' : t === 'private' ? 'Private' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="p-2 border-b border-gray-200 space-y-1">
          <Input placeholder="Search..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {(tab === 'public' || tab === 'private') && (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => setShowCreateRoom(true)} className="flex-1">New</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPublicRooms(true)} className="flex-1">Browse</Button>
              {invitations.length > 0 && (
                <button onClick={() => setShowInvitations(true)}
                  className="relative px-2 py-1 text-xs bg-yellow-50 border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-100">
                  📬<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{invitations.length}</span>
                </button>
              )}
            </div>
          )}
          {tab === 'friends' && (
            <Button size="sm" onClick={() => setShowAddFriend(true)} className="w-full">Add Friend</Button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(tab === 'public' || tab === 'private') && rooms
            .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter((r) => (tab === 'public' ? r.visibility === 'public' : r.visibility === 'private'))
            .map((room) => (
              <RoomItem key={room.id} room={room} isActive={currentRoomId === room.id}
                unread={getRoomUnread(room.id)} onClick={() => handleSelectRoom(room.id)} />
            ))}

          {tab === 'dialogs' && dialogs
            .filter((d) => d.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((dialog) => (
              <ContactItem key={dialog.id} contact={dialog.participant}
                status={userPresence[dialog.participantId] || 'offline'}
                isActive={currentDialogId === dialog.participantId}
                unread={getDialogUnread(dialog)}
                onClick={() => handleSelectDialog(dialog.participantId)} />
            ))}

          {tab === 'friends' && (
            <>
              {friendRequests.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 px-2 py-1">Requests ({friendRequests.length})</p>
                  {friendRequests.map((req) => (
                    <FriendRequestItem key={req.id} request={req}
                      onAccept={() => acceptFriendRequest(req.id)}
                      onReject={() => rejectFriendRequest(req.id)} loading={loading} />
                  ))}
                </div>
              )}
              <p className="text-xs font-semibold text-gray-500 px-2 py-1">Friends</p>
              {friends
                .filter((f) => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((friend) => (
                  <div key={friend.id} className="group relative">
                    <ContactItem contact={friend} status={userPresence[friend.id] || 'offline'}
                      isActive={currentDialogId === friend.id} onClick={() => handleSelectDialog(friend.id)} />
                    <button onClick={() => handleRemoveFriend(friend.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:block text-xs text-red-400 hover:text-red-600 p-1">
                      ✕
                    </button>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{user?.username}</span>
          <button onClick={() => setShowUserProfile(true)} className="text-gray-400 hover:text-gray-700 text-lg">⚙</button>
        </div>
      </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentRoom || currentDialog ? (
          <>
            {currentRoom && (
              <RoomHeader room={currentRoom} memberCount={members?.length || 0}
                onSettings={handleOpenRoomSettings} onLeave={handleLeaveRoom} />
            )}
            {currentDialog && (
              <DialogHeader
                contact={currentDialog.participant || friends.find((f) => f.id === currentDialogId)}
                status={userPresence[currentDialogId] || 'offline'} />
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-0">
              {hasOlderMessages && <LoadOlderButton onClick={handleLoadOlder} loading={olderLoading} />}
              {renderMessages()}
              <TypingIndicator users={getTypingText()} />
              <div ref={messagesEndRef} />
            </div>

            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                {pendingAttachment.preview
                  ? <img src={pendingAttachment.preview} className="h-10 w-10 object-cover rounded" alt="" />
                  : <span className="text-xl">📎</span>}
                <span className="text-sm text-gray-700 truncate flex-1">{pendingAttachment.name}</span>
                <button onClick={() => setPendingAttachment(null)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
              </div>
            )}

            {/* Reply/Edit Bar */}
            {(replyingTo || editingMessage) && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  {replyingTo ? <>Replying to <strong>{replyingTo.userName}</strong></> : 'Editing message...'}
                </span>
                <button onClick={() => { setReplyingTo(null); setEditingMessage(null); }} className="text-blue-500 hover:text-blue-800 font-bold">✕</button>
              </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])} />
            <MessageInput
              onSend={editingMessage ? handleEditMessage : handleSendMessage}
              onAttach={() => fileInputRef.current?.click()}
              disabled={loading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon="💬" title="Welcome to ChatApp" description="Select a room or contact to start chatting" />
          </div>
        )}
      </div>

      {/* Right panel: members when in room */}
      {currentRoom && members && members.length > 0 && (
        <div className="w-52 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members ({members.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50">
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    (userPresence[m.id] === 'online') ? 'bg-green-400' :
                    (userPresence[m.id] === 'afk') ? 'bg-yellow-400' : 'bg-gray-300'
                  }`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{m.username}</div>
                  {m.isOwner && <div className="text-xs text-yellow-600">Owner</div>}
                  {m.isAdmin && !m.isOwner && <div className="text-xs text-blue-600">Admin</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal isOpen={showCreateRoom} onClose={() => setShowCreateRoom(false)} onSubmit={handleCreateRoom} loading={loading} />

      <PublicRoomsModal isOpen={showPublicRooms} onClose={() => setShowPublicRooms(false)} onJoin={handleJoinRoom} loading={loading} />

      {showRoomSettings && currentRoom && (
        <RoomSettingsModal
          isOpen={showRoomSettings}
          onClose={() => setShowRoomSettings(false)}
          room={currentRoom}
          currentUser={user}
          members={members}
          bannedUsers={bannedUsers}
          onUpdate={async (data) => {
            try { await roomsAPI.updateRoom(currentRoomId, data); showToast('success', 'Room updated'); setShowRoomSettings(false); }
            catch (err) { showToast('error', err.message || 'Failed to update room'); }
          }}
          onDelete={async () => {
            try { await roomsAPI.deleteRoom(currentRoomId); showToast('success', 'Room deleted'); setShowRoomSettings(false); }
            catch { showToast('error', 'Failed to delete room'); }
          }}
          onRemoveMember={async (userId) => {
            try {
              await roomsAPI.removeMember(currentRoomId, userId);
              setMembers((prev) => prev.filter((m) => m.id !== userId));
              showToast('success', 'Member removed');
            } catch { showToast('error', 'Failed to remove member'); }
          }}
          onBan={async (userId) => {
            try {
              await roomsAPI.banUser(currentRoomId, userId);
              setMembers((prev) => prev.filter((m) => m.id !== userId));
              showToast('success', 'User banned');
            } catch { showToast('error', 'Failed to ban user'); }
          }}
          onUnban={async (userId) => {
            try {
              await roomsAPI.unbanUser(currentRoomId, userId);
              setBannedUsers((prev) => prev.filter((u) => u.userId !== userId));
              showToast('success', 'User unbanned');
            } catch { showToast('error', 'Failed to unban user'); }
          }}
          onMakeAdmin={async (userId) => {
            try {
              await roomsAPI.addAdmin(currentRoomId, userId);
              setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: 'admin', isAdmin: true } : m));
              showToast('success', 'Admin added');
            } catch { showToast('error', 'Failed to add admin'); }
          }}
          onRemoveAdmin={async (userId) => {
            try {
              await roomsAPI.removeAdmin(currentRoomId, userId);
              setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: 'member', isAdmin: false } : m));
              showToast('success', 'Admin removed');
            } catch { showToast('error', 'Failed to remove admin'); }
          }}
        />
      )}

      <AddFriendModal isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} onSend={handleAddFriend} loading={loading} />

      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={user}
        onLogout={async () => { await logout(); navigate('/login'); }}
        onChangePassword={changePassword}
        onDeleteAccount={async () => { await authAPI.deleteAccount(); navigate('/login'); }}
      />

      <InvitationsModal
        isOpen={showInvitations}
        onClose={() => setShowInvitations(false)}
        invitations={invitations}
        onAccept={handleAcceptInvite}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

// ─── Helper Modals ────────────────────────────────────────────────────────────

const CreateRoomModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Room name is required'); return; }
    onSubmit({ name, description, visibility: isPrivate ? 'private' : 'public' });
    setName(''); setDescription(''); setIsPrivate(false); setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Room" size="sm">
      <div className="space-y-4">
        <Input label="Room Name" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="my-room" />
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this room about?" rows={2}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
          Private room (invite only)
        </label>
        <Button onClick={handleSubmit} loading={loading} className="w-full">Create Room</Button>
      </div>
    </Modal>
  );
};

const PublicRoomsModal = ({ isOpen, onClose, onJoin, loading }) => {
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    setSearching(true);
    try {
      const res = await roomsAPI.getPublicRooms({ search: query });
      setRooms(res.data);
    } finally { setSearching(false); }
  };

  useEffect(() => { if (isOpen) search(); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse Public Rooms" size="md">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search rooms..." />
          <Button onClick={search} loading={searching}>Search</Button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {rooms.length === 0
            ? <p className="text-sm text-gray-500 text-center py-6">No rooms found</p>
            : rooms.map((room) => <PublicRoomCard key={room.id} room={room} onJoin={onJoin} loading={loading} />)}
        </div>
      </div>
    </Modal>
  );
};

export default ChatPage;
