/**
 * Remembers that the user dismissed the review prompt.
 *
 * Kept apart from the ReviewPrompt component so that module exports only a
 * component, which is what React Fast Refresh needs.
 *
 * Every access is guarded: localStorage throws in a private window with site
 * data blocked, and failing to remember a dismissal must never break a
 * download.
 */
const SKIP_KEY = 'cvg-review-skipped';

/**
 * Records that the user skipped the prompt.
 * @returns {void}
 */
export function markReviewSkipped() {
  try {
    localStorage.setItem(SKIP_KEY, String(Date.now()));
  } catch {
    // Not remembering is survivable: they simply get asked again.
  }
}

/**
 * Whether the user has already dismissed the prompt.
 * @returns {boolean}
 */
export function hasSkippedReview() {
  try {
    return localStorage.getItem(SKIP_KEY) !== null;
  } catch {
    return false;
  }
}
