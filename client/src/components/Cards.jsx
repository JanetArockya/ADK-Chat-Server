import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge, Loading } from './Common';
import { Avatar } from './Common';
import { getPresenceColor, getPresenceText } from '../utils/helpers';

export const FriendRequestItem = ({ request, onAccept, onReject, loading }) => {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar name={request.senderName || 'U'} size="md" />
        <div>
          <h4 className="font-medium text-gray-900">{request.senderName}</h4>
          {request.message && (
            <p className="text-sm text-gray-600">{request.message}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => onAccept(request.id)}
          loading={loading}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onReject(request.id)}
          loading={loading}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
};

export const FriendCard = ({ friend, status, onMessage, onRemove, onBan }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar name={friend.username} size="md" />
          <div className={`absolute bottom-0 right-0 w-3 h-3 ${getPresenceColor(status)} rounded-full border-2 border-white`} />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{friend.username}</h4>
          <p className="text-xs text-gray-500">{getPresenceText(status)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => onMessage(friend.id)}>
          Message
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onRemove(friend.id)}>
          Remove
        </Button>
        <Button size="sm" variant="danger" onClick={() => onBan(friend.id)}>
          Ban
        </Button>
      </div>
    </Card>
  );
};

export const PublicRoomCard = ({ room, onJoin, joined = false, loading = false }) => {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">#{room.name}</h3>
          {room.visibility === 'private' && (
            <Badge variant="default">Private</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{room.description}</p>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        {room.memberCount || 0} members
      </div>
      <Button
        size="sm"
        onClick={() => onJoin(room.id)}
        loading={loading}
        disabled={joined}
        className="w-full"
      >
        {joined ? 'Already joined' : 'Join Room'}
      </Button>
    </Card>
  );
};

export const SessionItem = ({ session, isCurrentSession, onRevoke, loading }) => {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <h4 className="font-medium text-gray-900">{session.browser || 'Unknown Browser'}</h4>
        <p className="text-xs text-gray-600">{session.ipAddress}</p>
        <p className="text-xs text-gray-500">Last active: {new Date(session.lastActive).toLocaleString()}</p>
        {isCurrentSession && <Badge variant="primary">Current Session</Badge>}
      </div>
      {!isCurrentSession && (
        <Button
          size="sm"
          variant="danger"
          onClick={() => onRevoke(session.id)}
          loading={loading}
        >
          Revoke
        </Button>
      )}
    </Card>
  );
};

export const NotificationBanner = ({ type = 'info', message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeClasses = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <div className={`border-l-4 p-4 mb-4 flex items-center justify-between ${typeClasses[type]}`}>
      <p>{message}</p>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
  );
};

export const EmptyState = ({ icon = '📭', title, description, action = null }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md">{description}</p>
      {action && action}
    </div>
  );
};

export const UserListItem = ({ user, status, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="p-3 hover:bg-gray-50 cursor-pointer rounded transition-colors flex items-center gap-3"
    >
      <div className="relative">
        <Avatar name={user.username} size="sm" />
        <div className={`absolute bottom-0 right-0 w-2 h-2 ${getPresenceColor(status)} rounded-full border border-white`} />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{user.username}</h4>
        <p className="text-xs text-gray-500">{getPresenceText(status)}</p>
      </div>
    </div>
  );
};
