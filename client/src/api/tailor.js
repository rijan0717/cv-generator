import api from './axios.js';

/**
 * Rewrites one of the caller's CVs for one job and returns the draft.
 *
 * Nothing is stored by this call. The draft comes back with the list of
 * changes that were made and the before-and-after match scores, so the
 * user can see what the rewrite did before deciding to keep any of it.
 *
 * The advert is either a job from the board (`jobId`) or pasted text
 * (`jobDescription`); one of the two is required.
 *
 * @param {string} cvId - The CV to tailor.
 * @param {{jobId?: string, jobDescription?: string, jobTitle?: string}} payload
 * @returns {Promise<{draft: object, changes: Array<object>,
 *                    suggestedSkills: string[], notes: string[],
 *                    suggestedTitle: string, job: object|null,
 *                    jobTitle: string, comparison: object}>}
 */
export async function previewTailoredCV(cvId, payload) {
  const { data } = await api.post(`/api/cvs/${cvId}/tailor`, payload);
  return data.data;
}

/**
 * The same rewrite, against whichever CV the user has marked primary.
 *
 * Used by the job page, where an advert has been chosen but a CV has
 * not. The response names the CV it used in `sourceCv`, which is the id
 * the save call then needs.
 *
 * Rejects with a readable message when the user has no primary CV.
 *
 * @param {{jobId?: string, jobDescription?: string, jobTitle?: string}} payload
 * @returns {Promise<object>} The same shape as `previewTailoredCV`.
 */
export async function previewTailoredPrimaryCV(payload) {
  const { data } = await api.post('/api/cvs/primary/tailor', payload);
  return data.data;
}

/**
 * Saves the reviewed draft as a brand new CV.
 *
 * The draft sent here is the one the user has edited, not the one the
 * server generated, so their changes are what gets stored.
 *
 * The advert is named again here — `jobId`, or `jobDescription` when it
 * was pasted — so the server can score the draft that is being saved
 * against it. Those two figures are stored on the new CV and are what the
 * dashboard, the job board badge and the job page all read; omit them and
 * the CV is saved without a match score rather than with a wrong one.
 *
 * @param {string} cvId - The CV it was tailored from.
 * @param {{draft: object, title?: string, jobId?: string,
 *          jobDescription?: string, jobTitle?: string}} payload
 * @returns {Promise<object>} The new CV.
 */
export async function saveTailoredCV(cvId, payload) {
  const { data } = await api.post(`/api/cvs/${cvId}/tailor/save`, payload);
  return data.data.cv;
}
