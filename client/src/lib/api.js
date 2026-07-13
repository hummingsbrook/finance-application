import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
});

// FIXED: C-5 — CSRF token management for the double-submit cookie pattern.
// The server sets a readable `csrf-token` cookie and emits the new token in
// the `x-csrf-token` response header on each write. We capture it from the
// first response we see and echo it back as `X-CSRF-Token` on every
// subsequent non-GET request.
let csrfToken = null;
// Track an in-flight CSRF fetch so concurrent requests don't each trigger one.
let csrfFetchPromise = null;

function isWriteMethod(method) {
  const m = (method || 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

// Fetch a fresh CSRF token from the dedicated endpoint.
// Returns the token string, or null on failure.
async function fetchCsrfToken() {
  if (csrfFetchPromise) return csrfFetchPromise;
  csrfFetchPromise = api.get('/csrf-token')
    .then(res => {
      const token = res.headers?.['x-csrf-token'] || res.data?.csrfToken;
      if (token) csrfToken = token;
      return csrfToken;
    })
    .catch(() => null)
    .finally(() => { csrfFetchPromise = null; });
  return csrfFetchPromise;
}

// Attach the token before every write request.
// If we don't have one yet, fetch it first (covers page-reload scenarios
// where the user is already authenticated but no token has been issued).
api.interceptors.request.use(async (config) => {
  if (isWriteMethod(config.method)) {
    if (!csrfToken) await fetchCsrfToken();
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
    // Capture CSRF token if the server includes it in the response header
    // (e.g. from the dedicated /csrf-token endpoint).
    const headerToken = response.headers['x-csrf-token'];
    if (headerToken) csrfToken = headerToken;

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