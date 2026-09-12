import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Interceptor to attach Bearer token (Clerk session token or local JWT)
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');

  if (window.Clerk && window.Clerk.session) {
    try {
      const clerkToken = await window.Clerk.session.getToken();
      if (clerkToken) {
        token = clerkToken;
      }
    } catch (e) {}
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
