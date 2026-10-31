/**
 * Single shared Axios instance. Every API call in the client goes through this
 * so the base URL, credentials and error handling are configured in one place.
 */
import axios from 'axios';

const api = axios.create({
  // Empty during development: requests use relative URLs and the Vite dev
  // server proxies /api to the Express server.
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true, // send the httpOnly auth cookie with every request
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Requests whose 401 means "wrong credentials" or "bad print link", not
 * "your session has ended", so they must not log the user out.
 */
const NOT_A_SESSION_CHECK = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/logout',
  '/print-data',
];

// Set by AuthProvider. Kept as a plain variable rather than imported, because
// this module sits below React and must not depend on the context.
let onSessionExpired = null;

/**
 * Registers the function to call when the server says the session is gone
 * (401 on any ordinary request). Returns a function that unregisters it.
 * @param {() => void} handler
 * @returns {() => void}
 */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
  return () => {
    if (onSessionExpired === handler) onSessionExpired = null;
  };
}

/**
 * Turns an Axios error into the plain message the server sent, so components
 * can display a consistent message without knowing about Axios. A 401 also
 * tells the auth context the session has expired, so a page left open past
 * the cookie's life stops showing the user as logged in.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    if (
      error.response?.status === 401 &&
      !NOT_A_SESSION_CHECK.some((path) => url.includes(path)) &&
      onSessionExpired
    ) {
      onSessionExpired();
    }

    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    return Promise.reject(Object.assign(error, { message }));
  },
);

export default api;
