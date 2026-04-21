import React, { useState } from 'react';
import { Button, Input, TextArea, Modal, Badge, Loading } from './Common';
import { MemberItem } from './Chat';
import { roomsAPI } from '../services/api';

export const RoomSettingsModal = ({
  isOpen,
  onClose,
  room,
  isAdmin,
  onUpdate,
  onDelete,
  onBan,
  onUnban,
  onMakeAdmin,
  onRemoveAdmin,
  members,
  bannedUsers,
}) => {
  const [tab, setTab] = useState('settings');
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [isPrivate, setIsPrivate] = useState(room?.visibility === 'private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await onUpdate({
        name,
        description,
        visibility: isPrivate ? 'private' : 'public',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure? This cannot be undone.')) {
      try {
        setLoading(true);
        await onDelete();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen || !room) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Settings" size="lg">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {['settings', 'members', 'banned'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === 'settings' && isAdmin && (
        <div className="space-y-4">
          <Input
            label="Room Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Private room</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={loading}>
              Save Changes
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={loading}>
              Delete Room
            </Button>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {members?.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              role={member.isAdmin ? 'Admin' : 'Member'}
              isOwner={member.id === room.ownerId}
              isAdmin={member.isAdmin}
              onPromote={() => onMakeAdmin(member.id)}
              onDemote={() => onRemoveAdmin(member.id)}
              onKick={() => onBan(member.id)}
              onBan={() => onBan(member.id)}
            />
          ))}
        </div>
      )}

      {/* Banned Users Tab */}
      {tab === 'banned' && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {bannedUsers?.length === 0 ? (
            <p className="text-sm text-gray-500">No banned users</p>
          ) : (
            bannedUsers.map((ban) => (
              <div
                key={ban.userId}
                className="flex items-center justify-between p-3 border border-gray-200 rounded"
              >
                <div>
                  <h4 className="font-medium text-sm">{ban.userName}</h4>
                  <p className="text-xs text-gray-500">Banned by {ban.bannedBy}</p>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="secondary" onClick={() => onUnban(ban.userId)}>
                    Unban
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
};

export const InviteUserModal = ({ isOpen, onClose, onInvite, loading }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    onInvite(username);
    setUsername('');
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite User" size="md">
      <div className="space-y-4">
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={error}
          placeholder="username"
        />
        <Button onClick={handleSubmit} loading={loading} className="w-full">
          Send Invite
        </Button>
      </div>
    </Modal>
  );
};

export const AddFriendModal = ({ isOpen, onClose, onSend, loading }) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    onSend(username, message);
    setUsername('');
    setMessage('');
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Friend" size="md">
      <div className="space-y-4">
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={error}
          placeholder="username"
        />
        <TextArea
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say hello..."
          rows={3}
        />
        <Button onClick={handleSubmit} loading={loading} className="w-full">
          Send Request
        </Button>
      </div>
    </Modal>
  );
};

export const UserProfileModal = ({ isOpen, onClose, user, onLogout, onChangePassword }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onChangePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" size="md">
      <div className="space-y-4">
        {!showChangePassword ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <p className="text-gray-900">{user?.username}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </Button>
              <Button size="sm" variant="danger" onClick={onLogout}>
                Log Out
              </Button>
            </div>
          </>
        ) : (
          <>
            <Input
              label="Current Password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              error={error}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleChangePassword} loading={loading}>
                Change Password
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowChangePassword(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
