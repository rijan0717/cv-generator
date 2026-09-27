import api from './axios.js';

/**
 * Lists the logged-in user's CVs for the dashboard.
 * @returns {Promise<Array<object>>}
 */
export async function listCVs() {
  const { data } = await api.get('/api/cvs');
  return data.data.cvs;
}

/**
 * Creates a new CV.
 * @param {{title: string, templateKey?: string}} payload
 * @returns {Promise<object>} The created CV.
 */
export async function createCV(payload) {
  const { data } = await api.post('/api/cvs', payload);
  return data.data.cv;
}

/**
 * Loads one complete CV.
 * @param {string} id - The CV's id.
 * @returns {Promise<object>}
 */
export async function getCV(id) {
  const { data } = await api.get(`/api/cvs/${id}`);
  return data.data.cv;
}

/**
 * Saves changes to a CV. Accepts a partial body, which is what autosave
 * relies on.
 * @param {string} id - The CV's id.
 * @param {object} patch - The fields to change.
 * @returns {Promise<object>} The saved CV.
 */
export async function updateCV(id, patch) {
  const { data } = await api.put(`/api/cvs/${id}`, patch);
  return data.data.cv;
}

/**
 * Soft-deletes a CV.
 * @param {string} id - The CV's id.
 * @returns {Promise<void>}
 */
export async function deleteCV(id) {
  await api.delete(`/api/cvs/${id}`);
}

/**
 * Duplicates a CV.
 * @param {string} id - The CV to copy.
 * @returns {Promise<object>} The new copy.
 */
export async function duplicateCV(id) {
  const { data } = await api.post(`/api/cvs/${id}/duplicate`);
  return data.data.cv;
}

/**
 * Uploads the photo shown on the CV itself.
 * @param {string} id - The CV's id.
 * @param {File} file - The chosen image.
 * @returns {Promise<object>} The updated CV.
 */
export async function uploadCVPhoto(id, file) {
  const formData = new FormData();
  formData.append('photo', file);

  const { data } = await api.post(`/api/cvs/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.cv;
}

/**
 * Marks a CV as the primary one, used by default when applying for jobs.
 * @param {string} id - The CV to make primary.
 * @returns {Promise<object>} The updated CV.
 */
export async function setPrimaryCV(id) {
  const { data } = await api.patch(`/api/cvs/${id}/primary`);
  return data.data.cv;
}

/**
 * Clears the primary flag, leaving no primary CV.
 * @param {string} id - The CV to clear.
 * @returns {Promise<object>} The updated CV.
 */
export async function clearPrimaryCV(id) {
  const { data } = await api.delete(`/api/cvs/${id}/primary`);
  return data.data.cv;
}
