import api from './axios.js';

/**
 * Registers a new account. The server sets the session cookie in its reply.
 * @param {{name: string, email: string, password: string}} payload
 * @returns {Promise<object>} The newly created user.
 */
export async function register(payload) {
  const { data } = await api.post('/api/auth/register', payload);
  return data.data.user;
}

/**
 * Logs in and starts a session.
 * @param {{email: string, password: string}} payload
 * @returns {Promise<object>} The logged-in user.
 */
export async function login(payload) {
  const { data } = await api.post('/api/auth/login', payload);
  return data.data.user;
}

/**
 * Ends the session by asking the server to clear the cookie.
 * @returns {Promise<void>}
 */
export async function logout() {
  await api.post('/api/auth/logout');
}

/**
 * Asks the server who the current user is. Used on start-up to find out
 * whether a cookie the browser already holds is still valid.
 * @returns {Promise<object>} The current user.
 */
export async function getCurrentUser() {
  const { data } = await api.get('/api/auth/me');
  return data.data.user;
}

/**
 * Updates the logged-in user's display name.
 * @param {{name: string}} payload
 * @returns {Promise<object>} The updated user.
 */
export async function updateProfile(payload) {
  const { data } = await api.put('/api/users/me', payload);
  return data.data.user;
}

/**
 * Changes the logged-in user's password.
 * @param {{currentPassword: string, newPassword: string}} payload
 * @returns {Promise<void>}
 */
export async function changePassword(payload) {
  await api.put('/api/users/me/password', payload);
}

/**
 * Uploads a new avatar image.
 * @param {File} file - The image chosen by the user.
 * @returns {Promise<object>} The updated user.
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await api.post('/api/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.user;
}
