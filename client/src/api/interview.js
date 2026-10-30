import api from './axios.js';

/**
 * Interview preparation, admin side.
 *
 * The user-facing calls (search, study, exams) arrive with phase 8.2 and
 * 8.3; this file holds only what the admin screens need.
 */

/**
 * Every position, including the inactive and the empty ones.
 * @param {{search?: string}} [params] - Filters.
 * @returns {Promise<Array<object>>} The positions, with question counts.
 */
export async function listPositions(params = {}) {
  const { data } = await api.get('/api/admin/interview/positions', { params });
  return data.data.positions;
}

/**
 * One position with its question counts.
 * @param {string} id - The position's id.
 * @returns {Promise<object>}
 */
export async function getPosition(id) {
  const { data } = await api.get(`/api/admin/interview/positions/${id}`);
  return data.data.position;
}

/**
 * Creates a position. It starts inactive.
 * @param {object} payload - Title, description, industry, tags, levels.
 * @returns {Promise<object>} The new position.
 */
export async function createPosition(payload) {
  const { data } = await api.post('/api/admin/interview/positions', payload);
  return data.data.position;
}

/**
 * Edits a position, or switches it on and off.
 * @param {string} id - The position's id.
 * @param {object} payload - The fields to change.
 * @returns {Promise<object>} The updated position.
 */
export async function updatePosition(id, payload) {
  const { data } = await api.patch(`/api/admin/interview/positions/${id}`, payload);
  return data.data.position;
}

/**
 * Soft deletes a position and takes its questions out of use.
 * @param {string} id - The position's id.
 * @returns {Promise<void>}
 */
export async function deletePosition(id) {
  await api.delete(`/api/admin/interview/positions/${id}`);
}

/**
 * A position's questions, grouped by level.
 * @param {string} id - The position's id.
 * @returns {Promise<Record<string, Array<object>>>}
 */
export async function listQuestions(id) {
  const { data } = await api.get(`/api/admin/interview/positions/${id}/questions`);
  return data.data.questions;
}

/**
 * Adds a question to a position.
 * @param {object} payload - position, level, text, options, correctIndex, explanation, topic.
 * @returns {Promise<object>} The new question.
 */
export async function createQuestion(payload) {
  const { data } = await api.post('/api/admin/interview/questions', payload);
  return data.data.question;
}

/**
 * Edits a question.
 * @param {string} id - The question's id.
 * @param {object} payload - The fields to change.
 * @returns {Promise<object>} The updated question.
 */
export async function updateQuestion(id, payload) {
  const { data } = await api.patch(`/api/admin/interview/questions/${id}`, payload);
  return data.data.question;
}

/**
 * Soft deletes a question.
 * @param {string} id - The question's id.
 * @returns {Promise<void>}
 */
export async function deleteQuestion(id) {
  await api.delete(`/api/admin/interview/questions/${id}`);
}

// --- User side -------------------------------------------------------------

/**
 * The positions a user can prepare for, ranked against their search.
 *
 * Returns the whole payload rather than just the list, because
 * `basedOnCV` tells the page whether it is showing suggestions drawn
 * from the user's CV or the full catalogue.
 *
 * @param {{search?: string, level?: string, suggested?: string}} [params] - Filters.
 * @returns {Promise<{positions: Array<object>, basedOnCV?: boolean}>}
 */
export async function searchPositions(params = {}) {
  const { data } = await api.get('/api/interview/positions', { params });
  return data.data;
}

/**
 * One position by slug.
 * @param {string} slug - The position's slug.
 * @returns {Promise<object>}
 */
export async function getPositionBySlug(slug) {
  const { data } = await api.get(`/api/interview/positions/${slug}`);
  return data.data.position;
}

/**
 * Study mode: the questions with their answers and explanations.
 * @param {string} slug - The position's slug.
 * @param {string} level - junior, mid or senior.
 * @returns {Promise<{position: object, level: string, questions: Array<object>}>}
 */
export async function getStudyQuestions(slug, level) {
  const { data } = await api.get(`/api/interview/positions/${slug}/study`, { params: { level } });
  return data.data;
}

/**
 * Starts an exam and returns the paper, without the answers.
 * @param {string} positionId - The position's id.
 * @param {string} level - junior, mid or senior.
 * @returns {Promise<object>} The attempt.
 */
export async function startExam(positionId, level) {
  // Omitting the level gives a mixed paper across junior, mid and
  // senior, which is the normal case.
  const { data } = await api.post('/api/interview/exams', { positionId, level });
  return data.data.attempt;
}

/**
 * An attempt: in progress without answers, or the full review once sat.
 * @param {string} id - The attempt's id.
 * @returns {Promise<object>}
 */
export async function getExam(id) {
  const { data } = await api.get(`/api/interview/exams/${id}`);
  return data.data.attempt;
}

/**
 * Submits the answers and returns the marked result.
 * @param {string} id - The attempt's id.
 * @param {Array<number|null>} answers - Chosen option per question.
 * @returns {Promise<object>} The result with every explanation.
 */
export async function submitExam(id, answers) {
  const { data } = await api.post(`/api/interview/exams/${id}/submit`, { answers });
  return data.data.attempt;
}

/**
 * The user's own past attempts, newest first.
 * @returns {Promise<Array<object>>}
 */
export async function listExams() {
  const { data } = await api.get('/api/interview/exams');
  return data.data.attempts;
}
