import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export const formatTime = (date) => {
  const d = new Date(date);
  if (isToday(d)) {
    return format(d, 'HH:mm');
  }
  if (isYesterday(d)) {
    return 'Yesterday';
  }
  return format(d, 'MMM dd');
};

export const formatFullTime = (date) => {
  return format(new Date(date), 'PPpp');
};

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const truncate = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

export const getInitials = (name) => {
  return name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
};

export const getPresenceColor = (status) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'afk':
      return 'bg-yellow-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

export const getPresenceText = (status) => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'afk':
      return 'Away';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};
