import api from './axios.js';

/**
 * The public "rewrite your CV" funnel.
 *
 * Three calls, and the order matters: upload opens a session, rewrite
 * runs against one advert, claim needs a logged-in account and is the
 * only one that returns the rewritten CV. Until then the server holds
 * it — the browser is never sent the draft, so there is nothing here
 * that could accidentally render it.
 */

/** Where the session token is kept across the trip to the login page. */
const TOKEN_KEY = 'cvg.publicRewrite';

/**
 * Remembers the session so it survives registering and coming back.
 *
 * Only the token is stored, never anything that was read or written —
 * it is a handle to a record on the server, useless on its own.
 *
 * @param {{token: string, jobTitle: string}} session - What to remember.
 */
export function rememberSession(session) {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    // A browser with storage blocked still works; the visitor just has
    // to claim the rewrite before leaving the page.
  }
}

/**
 * The remembered session, if there is one.
 * @returns {{token: string, jobTitle: string}|null}
 */
export function rememberedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Where to send someone who has just signed up, if a rewrite is waiting.
 *
 * The funnel sends a visitor off to register in the middle of the job,
 * and a brand-new account goes through the welcome step before it lands
 * anywhere — so "take them back to where they were" cannot be left to
 * the usual `from` state. The pages that decide where a new user starts
 * ask this first, and the rewrite page collects the token when it loads.
 *
 * @returns {string|null} The path to land on, or null for the usual one.
 */
export function pendingRewritePath() {
  return rememberedSession()?.token ? '/rewrite-cv' : null;
}

/** Forgets the session, once it is claimed or found to be expired. */
export function forgetSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do: an unreadable store is also an unwritable one.
  }
}

/**
 * Reads a dropped CV and ranks the open jobs against it.
 *
 * @param {File} file - The CV the visitor dropped.
 * @returns {Promise<{token: string, readAs: string, strengthScore: number,
 *                    results: Array<object>}>}
 */
export async function uploadForRewrite(file) {
  const form = new FormData();
  form.append('document', file);

  // Named explicitly for the same reason as the other uploads: the shared
  // instance defaults to JSON, and Axios would turn the FormData into a
  // JSON object, so the file would never reach multer.
  const { data } = await api.post('/api/public/rewrite/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.data;
}

/**
 * Rewrites the uploaded CV for one advert.
 *
 * Returns the scores and a count of each kind of change. It does **not**
 * return the rewritten CV: that is held on the server until the visitor
 * has an account to put it in.
 *
 * @param {string} token - The session token from the upload.
 * @param {string} jobId - The advert to rewrite against.
 * @returns {Promise<object>} The summary of what the rewrite did.
 */
export async function rewriteForJob(token, jobId) {
  const { data } = await api.post(`/api/public/rewrite/${token}/job/${jobId}`);
  return data.data;
}

/**
 * Saves the held rewrite to the logged-in account.
 *
 * @param {string} token - The session token.
 * @returns {Promise<{cv: object, changes: Array<object>, comparison: object}>}
 */
export async function claimRewrite(token) {
  const { data } = await api.post(`/api/public/rewrite/${token}/claim`);
  return data.data;
}
