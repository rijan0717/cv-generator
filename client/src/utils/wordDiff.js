/**
 * Word-level difference between two sentences, for highlighting what the
 * CV rewrite changed.
 *
 * Own implementation of the classic longest-common-subsequence (LCS) diff:
 *   1. Split both texts into words (spaces kept with the word before them,
 *      so joining the pieces back gives the original text).
 *   2. Fill an LCS table: cell [i][j] is the length of the longest run of
 *      words the first i words of `before` and first j words of `after`
 *      have in common, in order.
 *   3. Walk the table back from the end. A word in both is "same"; a word
 *      only in `before` was "removed"; one only in `after` was "added".
 *   4. Merge neighbouring pieces of the same type, so the result is a few
 *      readable runs rather than one piece per word.
 *
 * Words are compared case-insensitively and without punctuation, so
 * "Responsible" vs "responsible," is not reported as a change.
 */

/** Longer texts are not diffed: the table grows with the product of lengths. */
const MAX_WORDS = 400;

/**
 * @param {string} text
 * @returns {string[]} Words, each with its trailing whitespace.
 */
function tokenise(text) {
  return String(text ?? '').match(/\S+\s*/g) ?? [];
}

/** @param {string} word @returns {string} The comparable form of a word. */
function key(word) {
  return word.toLowerCase().replace(/[^a-z0-9%+#]/g, '');
}

/**
 * @param {string} before - The original text.
 * @param {string} after - The rewritten text.
 * @returns {Array<{type: 'same'|'added'|'removed', text: string}>|null}
 *   The runs, or null when a text is too long to diff.
 */
export function wordDiff(before, after) {
  const a = tokenise(before);
  const b = tokenise(after);
  if (a.length > MAX_WORDS || b.length > MAX_WORDS) return null;

  // Step 2: the LCS table, built from the end so step 3 can walk forwards.
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        key(a[i]) === key(b[j])
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  // Step 3: walk it.
  const pieces = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      pieces.push({ type: 'same', text: b[j] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      pieces.push({ type: 'removed', text: a[i] });
      i += 1;
    } else {
      pieces.push({ type: 'added', text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) pieces.push({ type: 'removed', text: a[i++] });
  while (j < b.length) pieces.push({ type: 'added', text: b[j++] });

  // Step 4: merge runs of the same type.
  const runs = [];
  for (const piece of pieces) {
    const last = runs.at(-1);
    if (last && last.type === piece.type) last.text += piece.text;
    else runs.push({ ...piece });
  }
  return runs;
}

/**
 * The share of the original's words that survived, from 0 to 1. Used to
 * decide whether an inline diff is readable or the text was replaced
 * wholesale (then showing before and after separately is clearer).
 *
 * @param {Array<{type: string, text: string}>} runs - From `wordDiff`.
 * @returns {number}
 */
export function similarity(runs) {
  const count = (type) =>
    runs.filter((run) => run.type === type).reduce((n, run) => n + tokenise(run.text).length, 0);
  const same = count('same');
  const total = same + count('removed');
  return total === 0 ? 0 : same / total;
}
