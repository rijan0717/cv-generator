import api from './axios.js';

/**
 * Analyses one of the caller's CVs against a job description.
 * @param {{cvId: string, jobDescription?: string, jobId?: string,
 *          jobTitle?: string}} payload
 * @returns {Promise<{jobMatch: object, analysis: object}>}
 */
export async function analyseMatch(payload) {
  const { data } = await api.post('/api/job-match', payload);
  return data.data;
}

/**
 * Scores a page of jobs against the caller's primary CV, for the match
 * badges on the board.
 *
 * Returns `cv: null` when the user has not chosen a primary CV. That is a
 * normal answer rather than an error, so the caller should check for it
 * instead of relying on a rejection.
 *
 * @param {string[]} jobIds - The jobs currently on screen.
 * @returns {Promise<{cv: {_id: string, title: string}|null,
 *                    scores: Array<{id: string, matchScore: number, band: string}>}>}
 */
export async function scoreJobs(jobIds) {
  const { data } = await api.post('/api/job-match/scores', { jobIds });
  return data.data;
}

/**
 * The caller's own analysis history, newest first.
 * @returns {Promise<Array<object>>}
 */
export async function listMatches() {
  const { data } = await api.get('/api/job-match');
  return data.data.jobMatches;
}

/**
 * One stored analysis in full.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getMatch(id) {
  const { data } = await api.get(`/api/job-match/${id}`);
  return data.data.jobMatch;
}

/**
 * Removes one analysis from the history.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteMatch(id) {
  await api.delete(`/api/job-match/${id}`);
}
