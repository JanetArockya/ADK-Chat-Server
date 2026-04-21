import React, { useState } from 'react';
import { formatTime, formatFullTime } from '../utils/helpers';
import { Avatar } from './Common';

export const Message = ({ message, currentUserId, onEdit, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isOwnMessage = message.userId === currentUserId;

  return (
    <div
      className={`flex gap-3 mb-4 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwnMessage && (
        <Avatar name={message.userName || 'U'} size="sm" />
      )}
      
      <div className={`flex flex-col gap-1 max-w-md ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {!isOwnMessage && (
          <span className="text-xs font-medium text-gray-600">{message.userName}</span>
        )}

        {message.replyTo && (
          <div className={`px-2 py-1 border-l-2 border-gray-400 bg-gray-50 rounded text-xs ${isOwnMessage ? 'text-right' : ''}`}>
            <div className="font-medium text-gray-700">{message.replyTo.userName}</div>
            <div className="text-gray-600 truncate">{message.replyTo.content}</div>
          </div>
        )}

        <div
          className={`px-3 py-2 rounded-lg break-words ${
            isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
          }`}
          onMouseEnter={() => setShowTimestamp(true)}
          onMouseLeave={() => setShowTimestamp(false)}
        >
          {message.content}
        </div>

        {message.attachments?.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/attachments/${attachment.id}`}
                download
                className="text-xs text-blue-500 hover:underline"
              >
                📎 {attachment.fileName}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {showTimestamp && (
            <span className="text-xs text-gray-500" title={formatFullTime(message.createdAt)}>
              {formatTime(message.createdAt)}
            </span>
          )}
          {message.edited && <span className="text-xs text-gray-400">(edited)</span>}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isOwnMessage && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="p-1 hover:bg-gray-200 rounded text-sm"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 hover:bg-gray-200 rounded text-sm text-red-600"
                title="Delete"
              >
                ✕
              </button>
            </>
          )}
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:bg-gray-200 rounded text-sm"
            title="Reply"
          >
            ↩
          </button>
        </div>
      )}
    </div>
  );
};

export const MessageInput = ({ onSend, onAttach, disabled = false, placeholder = 'Type a message...' }) => {
  const [content, setContent] = useState('');
  const [rows, setRows] = useState(1);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content.trim()) {
        onSend(content);
        setContent('');
        setRows(1);
      }
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    const lineCount = e.target.value.split('\n').length;
    setRows(Math.min(lineCount, 5));
  };

  return (
    <div className="flex gap-2 items-end p-4 bg-white border-t border-gray-200">
      <button
        onClick={onAttach}
        disabled={disabled}
        className="p-2 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50"
        title="Attach file"
      >
        📎
      </button>
      <textarea
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100"
      />
      <button
        onClick={() => {
          if (content.trim()) {
            onSend(content);
            setContent('');
            setRows(1);
          }
        }}
        disabled={disabled || !content.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
      >
        Send
      </button>
    </div>
  );
};

export const TypingIndicator = ({ users }) => {
  if (!users || users.length === 0) return null;

  const userNames = users.map((u) => u.username).join(', ');

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
      </div>
      <span>{userNames} is typing...</span>
    </div>
  );
};

export const DateDivider = ({ date }) => {
  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 border-t border-gray-300" />
      <span className="text-xs text-gray-500">{formatTime(date)}</span>
      <div className="flex-1 border-t border-gray-300" />
    </div>
  );
};
