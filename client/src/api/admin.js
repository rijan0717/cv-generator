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
 *
 * The two lists page independently, which is why the parameters are named
 * rather than a single `page`: moving the CV table must not move the
 * activity table underneath it.
 *
 * @param {string} id - The user's id.
 * @param {{cvPage?: number, activityPage?: number}} [params] - Page numbers.
 * @returns {Promise<{user: object, cvs: Array<object>, cvPagination: object,
 *                    recentActivity: Array<object>, activityPagination: object}>}
 */
export async function getUser(id, params = {}) {
  const { data } = await api.get(`/api/admin/users/${id}`, { params });
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

/**
 * Lists companies in one review state, with a count for every state.
 * @param {{status?: 'pending'|'approved'|'rejected', search?: string, page?: number}} params
 * @returns {Promise<{companies: Array<object>, counts: object, pagination: object}>}
 */
export async function listCompanies(params = {}) {
  const { data } = await api.get('/api/admin/companies', { params });
  return data.data;
}

/**
 * Approves or rejects a company. A rejection needs a reason.
 * @param {string} id
 * @param {'approved'|'rejected'} status
 * @param {string} [reason]
 * @returns {Promise<object>} The updated company.
 */
export async function reviewCompany(id, status, reason = '') {
  const { data } = await api.patch(`/api/admin/companies/${id}/status`, { status, reason });
  return data.data.company;
}
