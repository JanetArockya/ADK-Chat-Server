import React from 'react';
import { Avatar, Badge } from './Common';
import { getPresenceColor } from '../utils/helpers';

export const RoomItem = ({ room, isActive, onClick, unread }) => (
  <div onClick={onClick}
    className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`}>
    <div className="flex items-center justify-between gap-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900 truncate"># {room.name}</span>
          {room.visibility === 'private' && <span className="text-xs text-gray-400">🔒</span>}
        </div>
        {room.description && <p className="text-xs text-gray-500 truncate">{room.description}</p>}
      </div>
      {unread > 0 && (
        <span className="bg-blue-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 flex-shrink-0">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </div>
  </div>
);

export const ContactItem = ({ contact, status, isActive, onClick, unread }) => (
  <div onClick={onClick}
    className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`}>
    <div className="relative flex-shrink-0">
      <Avatar name={contact?.username || '?'} size="sm" />
      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getPresenceColor(status)}`} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-900 truncate">{contact?.username}</div>
      <div className="text-xs text-gray-400 capitalize">{status}</div>
    </div>
    {unread > 0 && (
      <span className="bg-blue-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 flex-shrink-0">
        {unread > 99 ? '99+' : unread}
      </span>
    )}
  </div>
);

export const RoomHeader = ({ room, memberCount, onSettings, onLeave }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
    <div>
      <h2 className="font-semibold text-gray-900">#{room.name}</h2>
      <p className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
    </div>
    <div className="flex items-center gap-1">
      {onLeave && (
        <button onClick={onLeave} className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Leave room">
          Leave
        </button>
      )}
      <button onClick={onSettings} className="p-2 hover:bg-gray-100 rounded text-gray-500 text-lg" title="Room settings">⚙</button>
    </div>
  </div>
);

export const DialogHeader = ({ contact, status }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
    <div className="relative">
      <Avatar name={contact?.username || '?'} size="sm" />
      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getPresenceColor(status)}`} />
    </div>
    <div>
      <h2 className="font-semibold text-gray-900">{contact?.username}</h2>
      <p className="text-xs text-gray-400 capitalize">{status}</p>
    </div>
  </div>
);

export const MemberItem = ({ member, isOwner, isAdmin, onPromote, onDemote, onKick }) => (
  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
    <div className="flex items-center gap-2">
      <Avatar name={member.username} size="sm" />
      <div>
        <div className="text-sm font-medium text-gray-900">{member.username}</div>
        <div className="text-xs text-gray-500">
          {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
        </div>
      </div>
    </div>
    {!isOwner && (
      <div className="flex gap-1">
        {isAdmin
          ? <button onClick={onDemote} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">−Admin</button>
          : <button onClick={onPromote} className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700">+Admin</button>}
        <button onClick={onKick} className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700">Remove</button>
      </div>
    )}
  </div>
);
