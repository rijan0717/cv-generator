import api from './axios.js';

/**
 * Loads the dashboard statistics.
 * @returns {Promise<object>}
 */
export async function getStats() {
  const { data } = await api.get('/api/admin/stats');
  return data.data;
}

/**
 * Lists users, with optional search, status filter and pagination.
 * @param {{page?: number, limit?: number, search?: string, status?: string}} params
 * @returns {Promise<{users: Array<object>, pagination: object}>}
 */
export async function listUsers(params = {}) {
  const { data } = await api.get('/api/admin/users', { params });
  return data.data;
}

/**
 * Loads one user together with their CVs and recent activity.
 * @param {string} id - The user's id.
 * @returns {Promise<{user: object, cvs: Array<object>, recentActivity: Array<object>}>}
 */
export async function getUser(id) {
  const { data } = await api.get(`/api/admin/users/${id}`);
  return data.data;
}

/**
 * Blocks or unblocks a user.
 * @param {string} id - The user's id.
 * @param {'active'|'blocked'} status - The new status.
 * @returns {Promise<object>} The updated user.
 */
export async function setUserStatus(id, status) {
  const { data } = await api.patch(`/api/admin/users/${id}/status`, { status });
  return data.data.user;
}

/**
 * Soft-deletes a user.
 * @param {string} id - The user's id.
 * @returns {Promise<void>}
 */
export async function deleteUser(id) {
  await api.delete(`/api/admin/users/${id}`);
}

/**
 * Lists every CV in the system.
 * @param {{page?: number, limit?: number, search?: string, templateKey?: string}} params
 * @returns {Promise<{cvs: Array<object>, pagination: object}>}
 */
export async function listAllCVs(params = {}) {
  const { data } = await api.get('/api/admin/cvs', { params });
  return data.data;
}

/**
 * Loads any CV for read-only review.
 * @param {string} id - The CV's id.
 * @returns {Promise<object>}
 */
export async function getAnyCV(id) {
  const { data } = await api.get(`/api/admin/cvs/${id}`);
  return data.data.cv;
}

/**
 * Removes a CV from the system.
 * @param {string} id - The CV's id.
 * @returns {Promise<void>}
 */
export async function deleteAnyCV(id) {
  await api.delete(`/api/admin/cvs/${id}`);
}

/**
 * Loads the activity log.
 * @param {{page?: number, limit?: number, action?: string}} params
 * @returns {Promise<{entries: Array<object>, pagination: object}>}
 */
export async function listActivity(params = {}) {
  const { data } = await api.get('/api/admin/activity', { params });
  return data.data;
}
