import api from './axios.js';

/**
 * Asks the server whether a Gmail account is connected.
 *
 * `configured` is about the *server*, not the user: it is false when this
 * installation has no Google credentials, in which case the card hides
 * itself rather than offering a button that cannot work.
 *
 * @returns {Promise<{configured: boolean, connected: boolean, email: string,
 *   connectedAt: string|null, lastUsedAt: string|null, canCompose: boolean}>}
 */
export async function getGmailStatus() {
  const { data } = await api.get('/api/gmail/status');
  return data.data;
}

/**
 * Starts the connection by leaving the application.
 *
 * This is deliberately a whole-page navigation rather than an Axios call:
 * Google's consent screen is a page the user has to see and interact with,
 * and it refuses to be loaded inside a frame or fetched in the background.
 * The server redirects on to Google, and Google redirects back to the
 * profile page afterwards with `?gmail=…` saying how it went.
 *
 * @returns {void}
 */
export function startGmailConnect() {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  window.location.href = `${base}/api/gmail/connect`;
}

/**
 * Disconnects the account and withdraws the permission at Google.
 * @returns {Promise<{revokedAtGoogle: boolean}>} Whether Google confirmed the
 *   withdrawal; when false the user should also remove the app themselves.
 */
export async function disconnectGmail() {
  const { data } = await api.delete('/api/gmail/disconnect');
  return data.data;
}

/**
 * Saves the letter as a draft in the user's own mailbox.
 *
 * The default of the two actions: nothing leaves the mailbox, so a
 * mistake costs a deletion rather than an apology.
 *
 * @param {object} input - The message.
 * @param {string} input.cvId - The CV to attach.
 * @param {string} input.to - The recipient's address.
 * @param {string} input.subject - The subject line.
 * @param {string} input.body - The letter.
 * @param {boolean} [input.attachCv] - Whether to attach the CV as a PDF.
 * @returns {Promise<{draftId: string, messageId: string|null,
 *   attached: boolean, gmailUrl: string}>}
 */
export async function createGmailDraft(input) {
  const { data } = await api.post('/api/gmail/drafts', input);
  return data.data;
}

/**
 * Sends the letter for real.
 *
 * `confirm` is sent as a separate field and checked again on the server.
 * The dialog in the UI stops a misclick; the flag stops anything that
 * reaches the API without one.
 *
 * @param {object} input - As `createGmailDraft`.
 * @returns {Promise<{messageId: string, attached: boolean}>}
 */
export async function sendGmailMessage(input) {
  const { data } = await api.post('/api/gmail/send', { ...input, confirm: true });
  return data.data;
}

/**
 * Lists the drafts in the connected mailbox, newest first.
 *
 * Every draft, not only the ones written here: the scope we hold cannot
 * tell them apart, and hiding the user's own drafts from them would be
 * the wrong way to resolve that.
 *
 * @returns {Promise<{drafts: Array<{id: string, messageId: string|null,
 *   to: string, subject: string, date: string, snippet: string}>, email: string}>}
 */
export async function listGmailDrafts() {
  const { data } = await api.get('/api/gmail/drafts');
  return data.data;
}

/**
 * Sends a draft that is already in the mailbox.
 *
 * The safer of the two send paths: the letter being sent is the one the
 * user has just read back in their own Gmail, not one assembled in the
 * same breath as the click.
 *
 * @param {string} draftId - The Gmail draft id.
 * @returns {Promise<{messageId: string}>}
 */
export async function sendGmailDraft(draftId) {
  const { data } = await api.post(`/api/gmail/drafts/${draftId}/send`, { confirm: true });
  return data.data;
}

/**
 * Deletes a draft. Permanent at Google's end — there is no bin for it.
 *
 * @param {string} draftId - The Gmail draft id.
 * @returns {Promise<{id: string}>}
 */
export async function deleteGmailDraft(draftId) {
  const { data } = await api.delete(`/api/gmail/drafts/${draftId}`);
  return data.data;
}

/**
 * Lists the letters sent from this application.
 *
 * Read from the activity log rather than from the mailbox: the Gmail
 * permission here cannot see a Sent folder. So this is what went out
 * from this app, not everything the user has ever sent.
 *
 * @returns {Promise<{sent: Array<{id: string, to: string, subject: string,
 *   messageId: string|null, attached: boolean, sentAt: string}>}>}
 */
export async function listGmailSent() {
  const { data } = await api.get('/api/gmail/sent');
  return data.data;
}
