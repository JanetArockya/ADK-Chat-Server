import React, { useState } from 'react';
import { Avatar, Badge } from './Common';
import { getPresenceColor } from '../utils/helpers';

export const RoomItem = ({ room, isActive, onClick, unreadCount }) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900"># {room.name}</h3>
          <p className="text-xs text-gray-500 truncate">{room.description}</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="ml-2">{unreadCount}</Badge>
        )}
      </div>
      {room.visibility === 'private' && (
        <Badge variant="default" className="mt-2">
          Private
        </Badge>
      )}
    </div>
  );
};

export const ContactItem = ({ contact, status, isActive, onClick, unreadCount }) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
        isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative">
        <Avatar name={contact.username} size="sm" />
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${getPresenceColor(status)} rounded-full border border-white`} />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 text-sm">{contact.username}</h3>
        <p className="text-xs text-gray-500">{status}</p>
      </div>
      {unreadCount > 0 && (
        <Badge>{unreadCount}</Badge>
      )}
    </div>
  );
};

export const MemberItem = ({ member, role, isOwner, isAdmin, onPromote, onDemote, onKick, onBan }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.username} size="sm" />
        <div>
          <h4 className="font-medium text-gray-900 text-sm">{member.username}</h4>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>

      {showActions && !isOwner && (
        <div className="flex gap-2">
          {isAdmin ? (
            <button
              onClick={() => onDemote(member.id)}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Demote
            </button>
          ) : (
            <button
              onClick={() => onPromote(member.id)}
              className="text-xs px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded"
            >
              Promote
            </button>
          )}
          <button
            onClick={() => onKick(member.id)}
            className="text-xs px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-red-700"
          >
            Kick
          </button>
          <button
            onClick={() => onBan(member.id)}
            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-white"
          >
            Ban
          </button>
        </div>
      )}
    </div>
  );
};

export const RoomHeader = ({ room, memberCount, onSettings, onBack }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
            ←
          </button>
        )}
        <div>
          <h2 className="font-semibold text-gray-900">#{room.name}</h2>
          <p className="text-xs text-gray-500">{memberCount} members</p>
        </div>
      </div>
      <button
        onClick={onSettings}
        className="p-2 hover:bg-gray-100 rounded text-gray-600"
      >
        ⚙
      </button>
    </div>
  );
};

export const DialogHeader = ({ contact, status, onBack }) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
      {onBack && (
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
          ←
        </button>
      )}
      <Avatar name={contact.username} size="md" />
      <div>
        <h2 className="font-semibold text-gray-900">{contact.username}</h2>
        <p className="text-xs text-gray-500">{status}</p>
      </div>
    </div>
  );
};
