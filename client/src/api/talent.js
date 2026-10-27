import api from './axios.js';

/**
 * The candidate directory. Only an admin or the owner of an approved
 * company can read it; the server returns a 403 with the reason for
 * anybody else, which the page shows as it is.
 *
 * @param {{page?: number, industry?: string, employmentType?: string,
 *          openToWork?: boolean, search?: string,
 *          accountType?: 'jobseeker'|'employer'}} params - Filters. The
 *   `accountType` is honoured for admins only.
 * @returns {Promise<{users: object[], pagination: object}>}
 */
export async function listTalent(params = {}) {
  const { data } = await api.get('/api/talent', { params });
  return data.data;
}

/**
 * One person in full, with their primary CV when they have marked one.
 * @param {string} id - The user id.
 * @returns {Promise<{user: object, primaryCv: object|null}>}
 */
export async function getTalentProfile(id) {
  const { data } = await api.get(`/api/talent/${id}`);
  return data.data;
}
