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
 * Uploads a CV file and ranks every open job against it.
 *
 * Nothing is stored: the parsed CV comes straight back so the page can
 * preview it, and the ranking is thrown away when the user leaves.
 *
 * @param {File} file - A PDF, .docx or .txt CV.
 * @returns {Promise<{cv: object, strength: object,
 *                    results: Array<{job: object, match: object}>, stats: object}>}
 */
export async function matchUploadedCV(file) {
  const form = new FormData();
  form.append('document', file);

  // The shared Axios instance defaults every request to `application/json`,
  // and Axios converts a FormData body into a JSON object when that is the
  // content type — so the file never reaches the server and multer finds
  // nothing. Naming multipart here (as the other uploads do) prevents that;
  // Axios then removes the header before sending so the browser can set it
  // with the correct boundary.
  const { data } = await api.post('/api/job-match/from-upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

/**
 * The caller's own analysis history, newest first.
 * @param {{page?: number, limit?: number}} [params] - Which page to load.
 * @returns {Promise<{jobMatches: Array<object>, pagination: object}>}
 */
export async function listMatches(params = {}) {
  const { data } = await api.get('/api/job-match', { params });
  return data.data;
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
