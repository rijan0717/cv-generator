import api from './axios.js';

/**
 * Lists jobs on the public board.
 * @param {{page?: number, limit?: number, search?: string, location?: string,
 *          jobType?: string, workMode?: string}} params
 * @returns {Promise<{jobs: Array<object>, pagination: object}>}
 */
export async function listJobs(params = {}) {
  const { data } = await api.get('/api/jobs', { params });
  return data.data;
}

/**
 * Loads one job, with the caller's saved and applied flags when signed in.
 * @param {string} id
 * @returns {Promise<{job: object, isSaved: boolean, hasApplied: boolean}>}
 */
export async function getJob(id) {
  const { data } = await api.get(`/api/jobs/${id}`);
  return data.data;
}

/**
 * Posts a job under the caller's company.
 * @param {object} payload
 * @returns {Promise<object>} The created job.
 */
export async function createJob(payload) {
  const { data } = await api.post('/api/jobs', payload);
  return data.data.job;
}

/**
 * Updates one of the caller's jobs.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>} The updated job.
 */
export async function updateJob(id, payload) {
  const { data } = await api.put(`/api/jobs/${id}`, payload);
  return data.data.job;
}

/**
 * Removes one of the caller's jobs.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteJob(id) {
  await api.delete(`/api/jobs/${id}`);
}

/**
 * The caller's own postings.
 * @returns {Promise<Array<object>>}
 */
export async function listMyJobs() {
  const { data } = await api.get('/api/jobs/mine/posted');
  return data.data.jobs;
}

/**
 * Bookmarks a job.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function saveJob(id) {
  await api.post(`/api/jobs/${id}/save`);
}

/**
 * Removes a bookmark.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function unsaveJob(id) {
  await api.delete(`/api/jobs/${id}/save`);
}

/**
 * The caller's saved jobs.
 * @returns {Promise<Array<object>>}
 */
export async function listSavedJobs() {
  const { data } = await api.get('/api/jobs/mine/saved');
  return data.data.jobs;
}

/**
 * Applies to a job with one of the caller's CVs.
 * @param {string} id - Job id.
 * @param {{cvId: string, coverLetter?: string}} payload
 * @returns {Promise<object>}
 */
export async function applyToJob(id, payload) {
  const { data } = await api.post(`/api/jobs/${id}/apply`, payload);
  return data.data.application;
}

/**
 * Applications to one of the caller's own jobs.
 * @param {string} id - Job id.
 * @returns {Promise<{job: object, applications: Array<object>}>}
 */
export async function listJobApplications(id) {
  const { data } = await api.get(`/api/jobs/${id}/applications`);
  return data.data;
}
