/**
 * The focus line for the job-tailored rewrite.
 *
 * Picks the few terms an advert is really about and states them in one
 * sentence at the end of the summary.
 */

import { processText, cvToText } from '../textProcessor.js';
import { buildSurfaceForms } from '../jobMatcher.js';
import { escapeForRegExp } from './vocabulary.js';

/**
 * Words adverts use about the job advert itself rather than the work
 * ("join our team", "a plus"). They can carry TF-IDF weight, but listing
 * "Join" as a focus area for the role reads as nonsense.
 */
export const ADVERT_FILLER = new Set([
  'join',
  'joining',
  'team',
  'teams',
  'plus',
  'bonus',
  'years',
  'year',
  'based',
  'looking',
  'seeking',
  'hiring',
  'salary',
  'benefits',
  'office',
  'location',
  'full',
  'time',
  'part',
  'remote',
  'hybrid',
  'please',
  'send',
  'email',
  'skills',
  'skill',
  'knowledge',
  'ability',
  'understanding',
  'strong',
  'good',
  // Verbs: what the job is about is a focus area, a bare verb is not.
  'present',
  'prepare',
  'analyse',
  'analyze',
  'build',
  'develop',
  'manage',
  'support',
  'ensure',
  'provide',
  'create',
  'work',
  'help',
  'make',
]);

/** The fixed opening of the alignment sentence, so it is easy to spot and delete. */
export const FOCUS_PREFIX = 'Focus for this role:';

/**
 * The advert's own words for the work, which this CV never uses.
 *
 * Taken from the relevance profile — the advert's highest-weighted
 * terms — minus everything the CV already says. Stems are mapped back
 * to a readable word with `buildSurfaceForms`, the same way the match
 * analyser turns "manag" back into "managing" before showing it to a
 * user.
 *
 * Very short terms are dropped: a three-letter word carrying TF-IDF
 * weight on a corpus this size is usually an artefact, and listing it
 * would make the sentence look like noise.
 *
 * @param {object} draft - The draft as it currently stands.
 * @param {string} jobText - The advert.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @returns {string[]} Display words, most heavily weighted first.
 */
export function advertVocabulary(draft, jobText, profile) {
  const cvTerms = new Set(processText(cvToText(draft)));
  const surfaceForms = buildSurfaceForms(jobText);

  const words = [];
  const seen = new Set();

  // The profile is already ordered by weight, highest first.
  for (const term of profile.weights.keys()) {
    if (cvTerms.has(term)) continue;

    const word = term.includes('_') ? term.split('_').join(' ') : (surfaceForms.get(term) ?? term);

    if (word.length < 4 || seen.has(word) || ADVERT_FILLER.has(word.toLowerCase())) continue;

    seen.add(word);
    words.push(word);
  }

  // A phrase and its parts both carry weight, so "content marketing",
  // "content" and "marketing" can all arrive. Listing all three reads
  // as padding and wastes two of the twelve slots, so the parts of a
  // phrase already in the list are dropped.
  const phrases = words.filter((word) => word.includes(' '));

  return words
    .filter(
      (word) => word.includes(' ') || !phrases.some((phrase) => phrase.split(' ').includes(word)),
    )
    .map((word) => displayCase(word, jobText));
}

/**
 * How a term is shown in the focus line: the advert's own capitals for an
 * acronym ("IFRS", not "Ifrs"), otherwise title case.
 * @param {string} word - The term, lowercased.
 * @param {string} jobText - The advert.
 * @returns {string} The term as it should be displayed.
 */
export function displayCase(word, jobText) {
  const upper = word.toUpperCase();
  const isAcronymInAdvert = new RegExp(String.raw`\b${escapeForRegExp(upper)}\b`).test(jobText);
  return isAcronymInAdvert ? upper : capitaliseWords(word);
}

/**
 * Title-cases a term for display: "content marketing" -> "Content Marketing".
 *
 * The terms come out of the pipeline lowercased, and a sentence listing
 * "seo, content marketing and analytics" reads as though it were typed
 * carelessly rather than as a deliberate list of the advert's language.
 *
 * @param {string} words - One term, possibly of several words.
 * @returns {string} The term, capitalised.
 */
export function capitaliseWords(words) {
  return words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The alignment sentence on its own.
 * @param {string[]} focus - The terms to name.
 * @returns {string} The sentence.
 */
export function focusSentence(focus) {
  // Commas rather than "a, b and c": this is a list of the advert's
  // terms, and dressing it up as prose would disguise what it is.
  return `${FOCUS_PREFIX} ${focus.join(', ')}.`;
}

/**
 * Puts the alignment sentence at the end of the summary, replacing any
 * earlier version of itself.
 *
 * Replacing rather than appending matters, because the loop calls this
 * once per batch: appending would leave the summary with three or four
 * "Focus for this role" sentences, each a superset of the last.
 *
 * @param {string} summary - The summary so far.
 * @param {string[]} focus - Every term chosen up to now.
 * @returns {string} The summary with exactly one alignment sentence.
 */
export function withFocusSentence(summary, focus) {
  return `${withoutFocusSentence(summary)} ${focusSentence(focus)}`.trim();
}

/**
 * A summary with the alignment sentence taken back off it.
 *
 * Used in two places. Inside the target pass it is how one batch of
 * terms replaces the last rather than piling up after it. At the start
 * of `tailorCV` it is how a draft that was already tailored once is
 * read: the sentence is this module's own writing, not the user's, so
 * re-tailoring a saved draft must rebuild it from the advert rather
 * than treat it as CV content and build a second one on top.
 *
 * @param {string} summary - A summary that may carry the sentence.
 * @returns {string} The summary without it.
 */
export function withoutFocusSentence(summary) {
  return String(summary ?? '')
    .split(FOCUS_PREFIX)[0]
    .trim();
}

/**
 * Reads the "Focus for this role" line back out of a summary.
 *
 * The expanded summary is rebuilt from the source CV, which never had
 * that line, so it has to be carried across by hand or the target pass's
 * work is silently undone.
 *
 * @param {string} summary - The summary the focus line may be in.
 * @returns {string[]} The focus terms, or an empty list.
 */
export function focusOf(summary) {
  const sentence = String(summary ?? '')
    .split(/(?<=\.)\s+/)
    .find((part) => part.startsWith(FOCUS_PREFIX));

  if (!sentence) return [];

  return sentence
    .slice(FOCUS_PREFIX.length)
    .replace(/\.$/, '')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
}
