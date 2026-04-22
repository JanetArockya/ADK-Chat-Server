import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

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
  markRead: (roomId) => api.post(`/rooms/${roomId}/read`),
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

export const messagesAPI = {
  getRoomMessages: (roomId, params) => api.get(`/messages/room/${roomId}`, { params }),
  sendRoomMessage: (roomId, data) => api.post(`/messages/room/${roomId}`, data),
  editMessage: (messageId, data) => api.put(`/messages/${messageId}`, data),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

export const dialogsAPI = {
  getDialogs: () => api.get('/dialogs'),
  getDialog: (userId) => api.get(`/dialogs/with/${userId}`),
  getMessages: (dialogId, params) => api.get(`/dialogs/${dialogId}/messages`, { params }),
  sendMessage: (userId, data) => api.post(`/dialogs/${userId}/messages`, data),
  editMessage: (messageId, data) => api.put(`/dialogs/messages/${messageId}`, data),
  deleteMessage: (messageId) => api.delete(`/dialogs/messages/${messageId}`),
  markRead: (dialogId) => api.post(`/dialogs/${dialogId}/read`),
};

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

export const attachmentsAPI = {
  uploadRoomAttachment: (roomId, formData) =>
    api.post(`/attachments/room/${roomId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadDialogAttachment: (dialogId, formData) =>
    api.post(`/attachments/dialog/${dialogId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export async function downloadAttachment(attachmentId, fileName) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const sessionsAPI = {
  getSessions: () => api.get('/sessions'),
  revokeAllSessions: () => api.delete('/sessions/all'),
  revokeSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
};

export const usersAPI = {
  searchUsers: (query) => api.get('/users/search', { params: { q: query } }),
  getUser: (userId) => api.get(`/users/${userId}`),
};

export default api;
