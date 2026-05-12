import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

const REFRESH_URL = '/auth/token/refresh/';
let refreshPromise = null;
let redirectingToLogin = false;

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,        // Send HttpOnly refresh token cookie on every request
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from memory to every outgoing request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function redirectToLogin() {
  if (redirectingToLogin || window.location.pathname === '/login') return;
  redirectingToLogin = true;
  window.location.href = '/login';
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post(REFRESH_URL)
      .then((res) => {
        setAccessToken(res.data.access);
        return res.data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// On 401: try to silently refresh the access token using the HttpOnly cookie.
// If refresh fails, clear state and redirect to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshRequest = original?.url?.includes(REFRESH_URL);
    const isAuthRequest = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && isRefreshRequest) {
      clearAccessToken();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && isAuthRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const access = await refreshAccessToken();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        clearAccessToken();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
