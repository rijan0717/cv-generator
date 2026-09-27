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
 * Turns an Axios error into the plain message the server sent, so components
 * can display a consistent message without knowing about Axios.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    return Promise.reject(Object.assign(error, { message }));
  },
);

export default api;
