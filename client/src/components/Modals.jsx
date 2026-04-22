import React, { useState, useEffect } from 'react';
import { Button, Input, TextArea, Modal, Badge } from './Common';
import { roomsAPI, sessionsAPI, authAPI } from '../services/api';

export const RoomSettingsModal = ({
  isOpen, onClose, room, currentUser, members, bannedUsers,
  onUpdate, onDelete, onBan, onUnban, onMakeAdmin, onRemoveAdmin, onRemoveMember, onRefreshMembers,
}) => {
  const [tab, setTab] = useState('settings');
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [isPrivate, setIsPrivate] = useState(room?.visibility === 'private');
  const [inviteUsername, setInviteUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isOwner = room?.ownerId === currentUser?.id;
  const myMembership = members?.find((m) => m.id === currentUser?.id);
  const isAdmin = isOwner || myMembership?.isAdmin;

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setDescription(room.description || '');
      setIsPrivate(room.visibility === 'private');
    }
  }, [room]);

  const handleSave = async () => {
    try { setLoading(true); setError(null);
      await onUpdate({ name, description, visibility: isPrivate ? 'private' : 'public' });
      setSuccess('Saved');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try { setLoading(true); await onDelete(); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    try {
      setLoading(true); setError(null);
      await roomsAPI.inviteUser(room.id, { username: inviteUsername.trim() });
      setInviteUsername('');
      setSuccess('Invitation sent');
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  if (!isOpen || !room) return null;

  const tabs = isAdmin
    ? ['members', 'banned', 'invitations', 'settings']
    : ['members'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`#${room.name}`} size="lg">
      <div className="flex border-b border-gray-200 mb-4 gap-1 flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }}
            className={`px-3 py-2 text-sm font-medium transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={`mb-3 px-3 py-2 rounded text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                  {member.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium">{member.username}</span>
                  {member.isOwner && <span className="ml-1 text-xs text-yellow-600 font-medium">Owner</span>}
                  {member.isAdmin && !member.isOwner && <span className="ml-1 text-xs text-blue-600 font-medium">Admin</span>}
                </div>
              </div>
              {isAdmin && member.id !== currentUser?.id && !member.isOwner && (
                <div className="flex gap-1">
                  {isOwner && (
                    member.isAdmin
                      ? <Button size="sm" variant="secondary" onClick={() => onRemoveAdmin(member.id)}>−Admin</Button>
                      : <Button size="sm" variant="secondary" onClick={() => onMakeAdmin(member.id)}>+Admin</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => onRemoveMember(member.id)}>Remove</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'banned' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {bannedUsers?.length === 0
            ? <p className="text-sm text-gray-500 text-center py-4">No banned users</p>
            : bannedUsers?.map((ban) => (
              <div key={ban.userId} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <div>
                  <div className="font-medium text-sm">{ban.userName}</div>
                  <div className="text-xs text-gray-500">Banned by {ban.bannedBy}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onUnban(ban.userId)}>Unban</Button>
              </div>
            ))}
        </div>
      )}

      {tab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Username to invite"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <Button onClick={handleInvite} loading={loading}>Invite</Button>
          </div>
        </div>
      )}

      {tab === 'settings' && isAdmin && (
        <div className="space-y-4">
          <Input label="Room Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Private room</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={loading}>Save</Button>
            {isOwner && <Button variant="danger" onClick={handleDelete} loading={loading}>Delete Room</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const InviteUserModal = ({ isOpen, onClose, onInvite, loading }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const handleSubmit = () => {
    if (!username.trim()) { setError('Username is required'); return; }
    onInvite(username); setUsername(''); setError(null);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite User" size="sm">
      <div className="space-y-4">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={error} placeholder="username" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        <Button onClick={handleSubmit} loading={loading} className="w-full">Send Invite</Button>
      </div>
    </Modal>
  );
};

export const AddFriendModal = ({ isOpen, onClose, onSend, loading }) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const handleSubmit = () => {
    if (!username.trim()) { setError('Username is required'); return; }
    onSend(username, message); setUsername(''); setMessage(''); setError(null);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Friend" size="sm">
      <div className="space-y-4">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={error} placeholder="username" />
        <TextArea label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say hello..." rows={2} />
        <Button onClick={handleSubmit} loading={loading} className="w-full">Send Request</Button>
      </div>
    </Modal>
  );
};

export const UserProfileModal = ({ isOpen, onClose, user, onLogout, onChangePassword, onDeleteAccount }) => {
  const [view, setView] = useState('profile');
  const [sessions, setSessions] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadSessions = async () => {
    try { const res = await sessionsAPI.getSessions(); setSessions(res.data); }
    catch {}
  };

  useEffect(() => { if (view === 'sessions') loadSessions(); }, [view]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      setLoading(true); setError(null);
      await onChangePassword(oldPassword, newPassword);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Password changed successfully');
      setView('profile');
    } catch (err) { setError(err.message || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const handleRevokeSession = async (sessionId) => {
    try { await sessionsAPI.revokeSession(sessionId); await loadSessions(); }
    catch {}
  };

  const handleRevokeAll = async () => {
    try { await sessionsAPI.revokeAllSessions(); await loadSessions(); }
    catch {}
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? All your owned rooms and their messages will be deleted.')) return;
    try { setLoading(true); await onDeleteAccount(); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" size="md">
      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
        {['profile', 'password', 'sessions'].map((v) => (
          <button key={v} onClick={() => { setView(v); setError(null); setSuccess(null); }}
            className={`px-3 py-1 text-sm rounded ${view === v ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={`mb-3 px-3 py-2 rounded text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      {view === 'profile' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900">{user?.username}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button size="sm" variant="danger" onClick={onLogout}>Sign Out</Button>
            <Button size="sm" variant="danger" onClick={handleDeleteAccount} loading={loading}>Delete Account</Button>
          </div>
        </div>
      )}

      {view === 'password' && (
        <div className="space-y-3">
          <Input label="Current Password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button onClick={handleChangePassword} loading={loading} className="w-full">Change Password</Button>
        </div>
      )}

      {view === 'sessions' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
            <Button size="sm" variant="danger" onClick={handleRevokeAll}>Revoke All Others</Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-start justify-between p-2 border border-gray-200 rounded text-sm">
                <div>
                  <div className="font-medium text-gray-900 truncate max-w-48">{s.userAgent || 'Unknown browser'}</div>
                  <div className="text-xs text-gray-500">{s.ipAddress} · {new Date(s.lastActive || s.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRevokeSession(s.id)}>Revoke</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const InvitationsModal = ({ isOpen, onClose, invitations, onAccept }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`Invitations (${invitations?.length || 0})`} size="md">
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {invitations?.length === 0
        ? <p className="text-sm text-gray-500 text-center py-4">No pending invitations</p>
        : invitations?.map((inv) => (
          <div key={inv.roomId} className="flex items-center justify-between p-3 border border-gray-200 rounded">
            <div>
              <div className="font-medium text-sm">#{inv.roomName}</div>
              {inv.roomDescription && <div className="text-xs text-gray-500 truncate max-w-48">{inv.roomDescription}</div>}
            </div>
            <Button size="sm" onClick={() => onAccept(inv.roomId)}>Join</Button>
          </div>
        ))}
    </div>
  </Modal>
);
