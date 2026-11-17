/**
 * Relevance scoring for the job-tailored rewrite.
 *
 * Builds the weighted yardstick from one advert, scores a piece of CV
 * text against it, and sorts a section by it without disturbing ties.
 */

import { TAILOR_CONFIG } from '../../config/scoringConfig.js';
import { processText } from '../textProcessor.js';
import { documentFrequency, tfidfVector, topTerms } from '../tfidf.js';
import { SEED_DOCUMENTS } from './seedCorpus.js';

/**
 * Builds the yardstick every piece of the CV is measured against.
 *
 * Only the advert's highest-weighted terms are kept. The long tail of a
 * TF-IDF vector on a corpus this size is mostly accident — a word used
 * once in one document looks distinctive whatever it means — and letting
 * it decide which of your roles is most relevant produces orderings no
 * one can explain.
 *
 * @param {string} jobText - The advert.
 * @param {string[]} priorJobDescriptions - Adverts analysed previously,
 *   which the caller loads from the database to grow the corpus.
 * @returns {{weights: Map<string, number>, totalWeight: number}}
 */
export function buildJobProfile(jobText, priorJobDescriptions = []) {
  const jobTerms = processText(jobText);

  // The advert belongs in its own corpus, for the same reason it does in
  // the match analyser: a term found in no document at all would be
  // weighted as if it were uniquely distinctive.
  const corpus = [...SEED_DOCUMENTS, ...priorJobDescriptions.map((text) => processText(text))];
  corpus.push(jobTerms);

  const vector = tfidfVector(jobTerms, documentFrequency(corpus), corpus.length);
  const top = topTerms(vector, TAILOR_CONFIG.relevanceTerms);

  return {
    weights: new Map(top.map(({ term, weight }) => [term, weight])),
    // Used as the denominator, so a relevance of 1 would mean a piece of
    // text covering the advert's entire vocabulary.
    totalWeight: top.reduce((sum, { weight }) => sum + weight, 0),
  };
}

/**
 * How much of the advert a piece of the CV speaks to, from 0 to 1.
 *
 * Distinct terms, not repeated ones: saying "Node.js" eight times in one
 * bullet point does not make the bullet eight times more relevant, and
 * counting it that way would reward keyword stuffing — exactly the thing
 * the rest of the project is built to detect.
 *
 * @param {string} text - Any piece of CV text.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @returns {number} The share of the advert's weighted vocabulary covered.
 */
export function relevanceOf(text, profile) {
  if (!profile.totalWeight) return 0;

  const seen = new Set();
  let earned = 0;

  for (const term of processText(text)) {
    if (seen.has(term)) continue;
    seen.add(term);
    earned += profile.weights.get(term) ?? 0;
  }

  return earned / profile.totalWeight;
}

/**
 * How finely relevance is compared when ordering entries.
 *
 * Relevance is rounded into bands of this size before anything is
 * sorted, so two entries a thousandth apart count as equal rather than
 * one jumping above the other. Without it the ordering changes on noise,
 * and a user who re-runs the rewrite sees a different CV for no reason
 * they can see.
 */
export const RELEVANCE_BAND = 0.01;

/**
 * Sorts a list by relevance, highest first, without disturbing ties.
 *
 * Three keys, in order:
 *
 *   1. Relevance band — how much of the advert the entry speaks to.
 *   2. The tie-break, which is how the caller separates two entries the
 *      advert has no opinion about. For achievements that is whether the
 *      line quantifies anything, because a number is the strongest line
 *      on any CV and the strength scorer already says so.
 *   3. The order the user had them in. `Array.prototype.sort` is stable,
 *      so entries equal on both keys simply stay put — on a CV where
 *      nothing is more relevant than anything else, the user's own
 *      ordering is the best answer available.
 *
 * @template T
 * @param {T[]} items - What to sort.
 * @param {(item: T) => string} toText - How to read an item's text.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @param {(item: T) => number} [tieBreak] - Higher sorts first.
 * @returns {Array<{item: T, relevance: number, originalIndex: number}>}
 */
export function rankByRelevance(items, toText, profile, tieBreak = () => 0) {
  return items
    .map((item, originalIndex) => {
      const relevance = relevanceOf(toText(item), profile);
      return {
        item,
        originalIndex,
        relevance,
        band: Math.round(relevance / RELEVANCE_BAND),
        tie: tieBreak(item),
      };
    })
    .sort((a, b) => b.band - a.band || b.tie - a.tie);
}

/**
 * Whether a ranking actually moved anything.
 * @param {Array<{originalIndex: number}>} ranked - A ranked list.
 * @returns {boolean} True when the order changed.
 */
export function orderChanged(ranked) {
  return ranked.some((entry, index) => entry.originalIndex !== index);
}

// --- Summary ---------------------------------------------------------------
