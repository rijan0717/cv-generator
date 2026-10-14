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

/**
 * Uploads the company logo.
 * @param {File} file - The chosen image.
 * @returns {Promise<object>} The updated company.
 */
export async function uploadLogo(file) {
  const formData = new FormData();
  formData.append('logo', file);

  const { data } = await api.post('/api/companies/mine/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.company;
}

/**
 * Removes the company logo.
 * @returns {Promise<object>} The updated company.
 */
export async function removeLogo() {
  const { data } = await api.delete('/api/companies/mine/logo');
  return data.data.company;
}

/**
 * Uploads the company registration document (PDF, JPG or PNG).
 * @param {File} file - The chosen file.
 * @returns {Promise<object>} The updated company.
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('document', file);

  const { data } = await api.post('/api/companies/mine/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.company;
}

/**
 * The address the registration document can be opened at. Same-origin, so
 * the session cookie goes with it; the server lets only the owner or an
 * admin read it.
 * @param {string} companyId
 * @returns {string}
 */
export function documentUrl(companyId) {
  return `/api/companies/${companyId}/document`;
}
