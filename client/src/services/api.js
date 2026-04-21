import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
  requestPasswordReset: (data) => api.post('/auth/password-reset/request', data),
  resetPassword: (data) => api.post('/auth/password-reset/confirm', data),
  deleteAccount: () => api.delete('/auth/account'),
};

// Rooms API
export const roomsAPI = {
  getPublicRooms: (query) => api.get('/rooms/public', { params: query }),
  getMyRooms: () => api.get('/rooms/my'),
  getMyInvitations: () => api.get('/rooms/invitations'),
  createRoom: (data) => api.post('/rooms', data),
  getRoom: (roomId) => api.get(`/rooms/${roomId}`),
  updateRoom: (roomId, data) => api.put(`/rooms/${roomId}`, data),
  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`),
  joinRoom: (roomId) => api.post(`/rooms/${roomId}/join`),
  leaveRoom: (roomId) => api.post(`/rooms/${roomId}/leave`),
  getMembers: (roomId) => api.get(`/rooms/${roomId}/members`),
  removeMember: (roomId, userId) => api.delete(`/rooms/${roomId}/members/${userId}`),
  banUser: (roomId, userId) => api.post(`/rooms/${roomId}/ban/${userId}`),
  unbanUser: (roomId, userId) => api.delete(`/rooms/${roomId}/ban/${userId}`),
  getBannedUsers: (roomId) => api.get(`/rooms/${roomId}/bans`),
  addAdmin: (roomId, userId) => api.post(`/rooms/${roomId}/admins/${userId}`),
  removeAdmin: (roomId, userId) => api.delete(`/rooms/${roomId}/admins/${userId}`),
  inviteUser: (roomId, data) => api.post(`/rooms/${roomId}/invite`, data),
  acceptInvite: (roomId) => api.post(`/rooms/${roomId}/invite/accept`),
};

// Messages API
export const messagesAPI = {
  getRoomMessages: (roomId, params) => api.get(`/messages/room/${roomId}`, { params }),
  sendRoomMessage: (roomId, data) => api.post(`/messages/room/${roomId}`, data),
  editMessage: (messageId, data) => api.put(`/messages/${messageId}`, data),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

// Dialogs API
export const dialogsAPI = {
  getDialogs: () => api.get('/dialogs'),
  getDialog: (userId) => api.get(`/dialogs/with/${userId}`),
  getMessages: (dialogId, params) => api.get(`/dialogs/${dialogId}/messages`, { params }),
  sendMessage: (userId, data) => api.post(`/dialogs/${userId}/messages`, data),
};

// Friends API
export const friendsAPI = {
  getFriends: () => api.get('/friends'),
  getFriendRequests: () => api.get('/friends/requests'),
  getBannedUsers: () => api.get('/friends/bans'),
  sendFriendRequest: (data) => api.post('/friends/request', data),
  acceptFriendRequest: (requestId) => api.post(`/friends/request/${requestId}/accept`),
  rejectFriendRequest: (requestId) => api.post(`/friends/request/${requestId}/reject`),
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
  banUser: (userId) => api.post(`/friends/ban/${userId}`),
  unbanUser: (userId) => api.delete(`/friends/ban/${userId}`),
};

// Attachments API
export const attachmentsAPI = {
  uploadRoomAttachment: (roomId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/attachments/room/${roomId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadDialogAttachment: (dialogId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/attachments/dialog/${dialogId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadAttachment: (attachmentId) => api.get(`/attachments/${attachmentId}`),
};

// Sessions API
export const sessionsAPI = {
  getSessions: () => api.get('/sessions'),
  revokeAllSessions: () => api.delete('/sessions/all'),
  revokeSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
};

// Users API
export const usersAPI = {
  getUsers: (query) => api.get('/users', { params: query }),
};

export default api;
