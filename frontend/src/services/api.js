import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

export function setAdminToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function uploadImage(file, onProgress) {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  return data; // { url, publicId, width, height }
}

export const adminApi = {
  login: (username, password) => api.post('/admin/login', { username, password }).then((r) => r.data),
  getStats: () => api.get('/admin/stats').then((r) => r.data),
  getUsers: () => api.get('/admin/users').then((r) => r.data),
  getRooms: () => api.get('/admin/rooms').then((r) => r.data),
  muteUser: (username, duration, reason) =>
    api.post('/admin/users/mute', { username, duration, reason }).then((r) => r.data),
  restrictUser: (username, duration, reason) =>
    api.post('/admin/users/restrict', { username, duration, reason }).then((r) => r.data),
  disconnectUser: (username) => api.post('/admin/users/disconnect', { username }).then((r) => r.data),
};

export { API_URL };
