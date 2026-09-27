import api from './axios.js';

/**
 * The caller's own company, or null when they have not created one.
 * @returns {Promise<{company: object|null, jobCount?: number, applicationCount?: number}>}
 */
export async function getMyCompany() {
  const { data } = await api.get('/api/companies/mine');
  return data.data;
}

/**
 * Creates the caller's company.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createCompany(payload) {
  const { data } = await api.post('/api/companies', payload);
  return data.data.company;
}

/**
 * Updates the caller's company.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateMyCompany(payload) {
  const { data } = await api.put('/api/companies/mine', payload);
  return data.data.company;
}

/**
 * A public company profile with its open jobs.
 * @param {string} id
 * @returns {Promise<{company: object, jobs: Array<object>}>}
 */
export async function getCompany(id) {
  const { data } = await api.get(`/api/companies/${id}`);
  return data.data;
}
