import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// FIXED: C-5 — CSRF token management for the double-submit cookie pattern.
// The server sets a readable `csrf-token` cookie and emits the new token in
// the `x-csrf-token` response header on each write. We capture it from the
// first response we see and echo it back as `X-CSRF-Token` on every
// subsequent non-GET request.
let csrfToken = null;

function isWriteMethod(method) {
  const m = (method || 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

// Attach the token (if we have one) before the request goes out.
api.interceptors.request.use((config) => {
  if (isWriteMethod(config.method)) {
    // Try header-captured token first (set by the response interceptor below),
    // then fall back to reading the cookie directly.
    // FIXED: the csrf-token cookie contains "rawToken|hash" — only the left
    // part (before the pipe) is the value the server validates against the
    // X-CSRF-Token header. Sending the full cookie string always fails.
    if (!csrfToken && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
      if (match) csrfToken = decodeURIComponent(match[1]).split('|')[0];
    }
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Auth endpoints whose 401 responses should NOT trigger a hard redirect.
// These are handled by their own page-level catch blocks.
const AUTH_ENDPOINTS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/me',
];

// Central response unwrapping: backend sends { success, data, message, code }
// After this interceptor, res.data is the inner payload directly.
api.interceptors.response.use(
  (response) => {
    // FIXED: C-5 — capture the CSRF token from the response header
    const headerToken = response.headers['x-csrf-token'];
    if (headerToken) {
      csrfToken = headerToken;
    }
    // Also fall back to the cookie (set by the server) if the header is absent.
    // FIXED: same as above — strip the |hash suffix, keep only the raw token.
    if (!csrfToken && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
      if (match) {
        csrfToken = decodeURIComponent(match[1]).split('|')[0];
      }
    }

    const { data } = response;
    // If the response has the standard envelope, unwrap it
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      // Replace response.data with the inner payload
      response.data = data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only force-redirect if the failing request is NOT an auth endpoint
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = AUTH_ENDPOINTS.some(
        (ep) => requestUrl === ep || requestUrl.endsWith(ep)
      );
      if (!isAuthEndpoint) {
        window.location.href = '/signin';
        return new Promise(() => {}); // Prevent further processing
      }
    }
    return Promise.reject(error);
  }
);

export default api;
