/**
 * Ranking positions against what somebody typed.
 *
 * A user searching for a job to prepare for types "front end dev", not
 * "Frontend Developer". A plain substring match finds nothing, so the
 * query and the position are both put through the same preprocessing the
 * job matcher uses — protected terms, tokens, stems — and compared on
 * the result. That is how "dev" reaches "Developer" and "front end"
 * reaches "Frontend".
 *
 * No fuzzy-matching library is used (CLAUDE.md rule 1), and none is
 * needed: the vocabulary here is job titles, which is small and regular.
 */
import { processText } from './textProcessor.js';

/**
 * What a hit in each field is worth.
 *
 * A word in the title is strong evidence; the same word buried in a
 * description is weak, because a description mentions many things the
 * position is not. The gap between them is deliberately wide.
 */
export const FIELD_WEIGHTS = {
  title: 10,
  tags: 4,
  industry: 2,
  description: 1,
};

/** A whole-phrase title match outscores any accumulation of word hits. */
export const EXACT_TITLE_BONUS = 25;

/**
 * Strips everything but letters and digits.
 *
 * This is what lets "front end dev" reach "Frontend Developer". Stemming
 * alone cannot: the query is two tokens where the title is one, so no
 * term is shared and the score would be zero. Comparing the compacted
 * forms — "frontenddev" inside "frontenddeveloper" — closes a gap that
 * would otherwise make the search look broken for one of the commonest
 * ways people write a job title.
 *
 * @param {string} value - Any text.
 * @returns {string} Lowercased, with separators removed.
 */
export function compact(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * The searchable terms of one position, by field.
 * @param {object} position - The position.
 * @returns {Record<string, Set<string>>} Stemmed terms per field.
 */
export function indexPosition(position) {
  return {
    title: new Set(processText(position.title ?? '')),
    tags: new Set(processText((position.tags ?? []).join(' '))),
    industry: new Set(processText(position.industry ?? '')),
    description: new Set(processText(position.description ?? '')),
  };
}

/**
 * Scores one position against a already-processed query.
 *
 * @param {object} position - The position.
 * @param {string[]} queryTerms - The query's stemmed terms.
 * @param {string} rawQuery - The query as typed, for the exact check.
 * @returns {number} Its score; zero means no match at all.
 */
export function scorePosition(position, queryTerms, rawQuery = '') {
  const compactQuery = compact(rawQuery);
  const compactTitle = compact(position.title);

  // Checked before the term loop, because a query may compact into the
  // title while sharing no stemmed term with it at all — which is
  // exactly the "front end dev" case.
  const titleContainsQuery = compactQuery.length >= 3 && compactTitle.includes(compactQuery);

  if (queryTerms.length === 0) return titleContainsQuery ? EXACT_TITLE_BONUS : 0;

  const index = indexPosition(position);
  let score = titleContainsQuery ? EXACT_TITLE_BONUS : 0;

  for (const term of queryTerms) {
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      if (index[field].has(term)) {
        score += weight;
        // One field is enough for this term: counting it again in the
        // description would let a wordy position outrank a precise one.
        break;
      }
    }
  }

  return score;
}

/**
 * Ranks positions against a query.
 *
 * An empty query returns everything in alphabetical order rather than
 * nothing, because the search box starts empty and a user who has not
 * typed yet should still see what is on offer.
 *
 * @param {Array<object>} positions - The positions to rank.
 * @param {string} query - What the user typed.
 * @returns {Array<object>} Matching positions, best first.
 */
export function searchPositions(positions, query = '') {
  if (!query.trim()) {
    return [...positions].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  }

  const queryTerms = processText(query);

  // A query of nothing but stop words ("the", "a") has no usable terms,
  // and matching on the compacted form alone would be noise.
  if (queryTerms.length === 0 && compact(query).length < 3) return [];

  return positions
    .map((position) => ({ position, score: scorePosition(position, queryTerms, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || (a.position.title ?? '').localeCompare(b.position.title ?? ''),
    )
    .map((entry) => entry.position);
}

export default searchPositions;
