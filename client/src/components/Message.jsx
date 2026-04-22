import React, { useState, useRef } from 'react';
import { formatTime, formatFullTime } from '../utils/helpers';
import { Avatar } from './Common';
import { downloadAttachment, API_BASE_URL } from '../services/api';

export const Message = ({ message, currentUserId, isAdmin, onEdit, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const isOwn = message.userId === currentUserId;
  const canDelete = isOwn || isAdmin;

  const handleDownload = async (att) => {
    try {
      await downloadAttachment(att.id, att.fileName);
    } catch {
      alert('Failed to download file');
    }
  };

  const isImage = (mimeType) => mimeType && mimeType.startsWith('image/');

  return (
    <div
      className={`flex gap-3 mb-4 group ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && <Avatar name={message.userName || 'U'} size="sm" />}

      <div className={`flex flex-col gap-1 max-w-lg ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && <span className="text-xs font-medium text-gray-600">{message.userName}</span>}

        {message.replyTo && (
          <div className={`px-2 py-1 border-l-2 border-blue-400 bg-blue-50 rounded text-xs max-w-xs ${isOwn ? 'text-right' : ''}`}>
            <div className="font-medium text-blue-700">{message.replyTo.userName}</div>
            <div className="text-gray-600 truncate">{message.replyTo.content}</div>
          </div>
        )}

        <div className={`px-3 py-2 rounded-lg break-words ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
          {message.content}
        </div>

        {message.attachments?.length > 0 && (
          <div className="flex flex-col gap-2 mt-1 max-w-xs">
            {message.attachments.map((att) => (
              <div key={att.id} className="border border-gray-200 rounded overflow-hidden">
                {isImage(att.mimeType) ? (
                  <div>
                    <AttachmentImage attachmentId={att.id} fileName={att.fileName} />
                    <div className="px-2 py-1 bg-gray-50 text-xs flex justify-between items-center">
                      <span className="truncate text-gray-600">{att.fileName}</span>
                      <button onClick={() => handleDownload(att)} className="text-blue-500 hover:underline ml-2 flex-shrink-0">↓</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(att)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left"
                  >
                    <span className="text-xl">📎</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-blue-600 truncate">{att.fileName}</div>
                      {att.size && <div className="text-xs text-gray-500">{formatSize(att.size)}</div>}
                    </div>
                  </button>
                )}
                {att.comment && <div className="px-2 pb-1 text-xs text-gray-500 italic">{att.comment}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400" title={formatFullTime(message.createdAt)}>
            {formatTime(message.createdAt)}
          </span>
          {message.edited && <span className="text-xs text-gray-400">(edited)</span>}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-1 self-start mt-1">
          <button onClick={() => onReply(message)} className="p-1 hover:bg-gray-200 rounded text-sm text-gray-600" title="Reply">↩</button>
          {isOwn && (
            <button onClick={() => onEdit(message)} className="p-1 hover:bg-gray-200 rounded text-sm text-gray-600" title="Edit">✎</button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(message.id)} className="p-1 hover:bg-gray-200 rounded text-sm text-red-500" title="Delete">✕</button>
          )}
        </div>
      )}
    </div>
  );
};

// Image component that fetches with auth header
function AttachmentImage({ attachmentId, fileName }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setError(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachmentId]);

  if (error) return <div className="p-2 text-xs text-gray-500">Image unavailable</div>;
  if (!src) return <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Loading...</div>;
  return <img src={src} alt={fileName} className="max-h-48 w-full object-contain cursor-pointer" onClick={() => window.open(src)} />;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const LoadOlderButton = ({ onClick, loading }) => (
  <div className="flex justify-center py-3">
    <button
      onClick={onClick}
      disabled={loading}
      className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
    >
      {loading ? 'Loading...' : '↑ Load older messages'}
    </button>
  </div>
);

export const MessageInput = ({ onSend, onAttach, disabled = false, placeholder = 'Type a message...' }) => {
  const [content, setContent] = useState('');
  const [rows, setRows] = useState(1);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (content.trim()) {
      onSend(content);
      setContent('');
      setRows(1);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    setRows(Math.min(e.target.value.split('\n').length, 5));
  };

  return (
    <div className="flex gap-2 items-end p-4 bg-white border-t border-gray-200">
      <button onClick={onAttach} disabled={disabled} className="p-2 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50 flex-shrink-0" title="Attach file">
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
        onClick={submit}
        disabled={disabled || !content.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium flex-shrink-0"
      >
        Send
      </button>
    </div>
  );
};

export const TypingIndicator = ({ users }) => {
  if (!users || users.length === 0) return null;
  const names = users.map((u) => u.username).join(', ');
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-sm text-gray-500">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce`} style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      <span>{names} {users.length === 1 ? 'is' : 'are'} typing...</span>
    </div>
  );
};

export const DateDivider = ({ date }) => {
  const d = new Date(date);
  const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
};
