import api from './axios.js';

/**
 * Composes a cover letter from one of the user's CVs.
 *
 * Nothing is stored by this call: a preview is the user's own CV phrased
 * differently, so it can be run as often as the form changes without
 * leaving a trail of half-written letters behind.
 *
 * @param {object} input - The request.
 * @param {string} input.cvId - Which CV to write from.
 * @param {string} input.companyName - Who the letter is to.
 * @param {string} [input.jobTitle] - The role applied for.
 * @param {string} [input.jobDescription] - The advert, pasted in.
 * @param {string} [input.recipientName] - A named reader, if known.
 * @returns {Promise<{subject: string, body: string, usedFacts: object, notes: string[]}>}
 *   `notes` is the composer saying what it could not evidence from the CV.
 */
export async function previewCoverLetter(input) {
  const { data } = await api.post('/api/cover-letters/preview', input);
  return data.data;
}
