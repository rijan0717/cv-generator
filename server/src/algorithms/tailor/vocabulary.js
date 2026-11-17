/**
 * Vocabulary alignment for the job-tailored rewrite.
 *
 * Says a skill the way the advert says it, and promotes the verb the
 * user already wrote. Neither transformation invents words.
 */

import { normaliseText, tokenise } from '../textProcessor.js';
import { SKILLS, findSkills } from '../../data/skillsDictionary.js';
import { rewriteDescription, polishSentence } from '../phraseRewriter.js';

/**
 * Builds the list of word swaps this advert justifies.
 *
 * A CV that says "JS" and an advert that says "JavaScript" are talking
 * about the same thing, and a human reader knows it. A keyword match
 * does not: it reads the two as different words and scores the CV down
 * for a difference that is purely spelling. Saying it the advert's way
 * costs the user nothing and is the single clearest example of what
 * tailoring a CV is for.
 *
 * This can only ever swap between aliases of the **same** dictionary
 * entry, so it cannot change what a sentence means — "JS" and
 * "JavaScript" are the same skill by definition of the dictionary.
 *
 * Two restrictions keep it safe:
 *
 *   - Only skills the advert actually asks for. Rewriting vocabulary the
 *     advert never mentions would be churn.
 *   - Only single-word swaps. The dictionary lists "api" as an alias of
 *     "REST API", and turning "cut API response time by 40%" into "cut
 *     REST API response time by 40%" changes a sentence the user wrote
 *     into one they did not. A one-word-for-one-word swap cannot.
 *
 * @param {string} jobText - The advert.
 * @returns {Map<string, string>} Lowercased alias to its replacement.
 */
export function buildVocabularyMap(jobText) {
  const wanted = findSkills(jobText, tokenise(normaliseText(jobText)));
  const swaps = new Map();

  for (const entry of SKILLS) {
    if (!wanted.has(entry.name)) continue;

    // A canonical name of two or more words cannot be a one-word swap.
    if (/\s/.test(entry.name)) continue;

    for (const alias of entry.aliases) {
      // Single characters match far too much to be worth swapping, and
      // an alias that is already the canonical spelling is not a swap.
      if (alias.length < 2 || /\s/.test(alias)) continue;
      if (alias === entry.name.toLowerCase()) continue;

      swaps.set(alias, entry.name);
    }
  }

  return swaps;
}

/** Escapes a string so it can be used inside a regular expression. */
export function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrites a piece of CV text to use the advert's spelling of a skill.
 *
 * `\b` is no use here, because these aliases contain the punctuation
 * that `\b` treats as a boundary: "c++", "c#" and ".net" all begin or
 * end on a non-word character, so `\b` would refuse to match them.
 *
 * The boundaries are therefore spelled out, and each side needs two
 * conditions rather than one. The obvious rule — "not next to a letter
 * or digit" — is wrong in both directions when a skill name contains a
 * dot:
 *
 *   - "Node.js" would match the alias "node", because what follows it
 *     is a full stop, giving "Node.js.js".
 *   - "Vue.js" would match the alias "js", because what precedes it is
 *     a full stop, giving "Vue.JavaScript".
 *
 * So a match is also refused when it is joined to more text by a ".",
 * "+" or "#" — the three characters a skill name is built from.
 *
 * @param {string} text - A description or achievement.
 * @param {Map<string, string>} swaps - From `buildVocabularyMap`.
 * @returns {{text: string, swaps: string[]}} The text and what changed.
 */
export function alignVocabulary(text, swaps) {
  let result = String(text ?? '');
  if (!result.trim() || swaps.size === 0) return { text: result, swaps: [] };

  const applied = [];

  for (const [alias, replacement] of swaps) {
    const pattern = new RegExp(
      `(?<![a-zA-Z0-9])(?<![a-zA-Z0-9][.+#])(${escapeForRegExp(alias)})` +
        '(?![a-zA-Z0-9])(?![.+#][a-zA-Z0-9])',
      'gi',
    );

    let matched = false;
    result = result.replace(pattern, (found) => {
      // The CV already says it the advert's way: nothing to do.
      if (found === replacement) return found;
      matched = true;
      return replacement;
    });

    if (matched) applied.push(`${alias} → ${replacement}`);
  }

  return { text: result, swaps: applied };
}

/**
 * Both text transformations applied to one line, in order: promote the
 * verb the user wrote, then say the skills the advert's way.
 *
 * That order matters. Promoting the verb changes the first word;
 * aligning the vocabulary changes words in the middle. Doing it the
 * other way round would work too, but this way the verb rule only ever
 * sees text the user actually wrote.
 *
 * @param {string} line - One achievement or bullet.
 * @param {Map<string, string>} swaps - From `buildVocabularyMap`.
 * @param {{present?: boolean}} [options] - Passed to the verb rewriter.
 * @returns {{text: string, changed: boolean, reasons: string[],
 *            refusal: string}}
 */
export function polishLine(line, swaps, options = {}) {
  const verb = polishSentence(line, options);
  const aligned = alignVocabulary(verb.text, swaps);

  const reasons = [];
  if (verb.changed) reasons.push(...verb.reasons);
  if (aligned.swaps.length > 0) {
    reasons.push(`Used this advert's wording: ${aligned.swaps.join(', ')}.`);
  }

  return {
    text: aligned.text,
    changed: verb.changed || aligned.swaps.length > 0,
    reasons,
    // A rewrite the module refused to make, which the caller passes on
    // to the user as advice instead.
    refusal: verb.changed ? '' : verb.refusal,
  };
}

/**
 * The same two transformations over a multi-line description.
 *
 * @param {string} description - The description field.
 * @param {Map<string, string>} swaps - From `buildVocabularyMap`.
 * @param {{present?: boolean}} [options] - Passed to the verb rewriter.
 * @returns {{text: string, changed: boolean, reasons: string[],
 *            refusal: string}}
 */
export function polishDescription(description, swaps, options = {}) {
  const verb = rewriteDescription(description, options);
  const aligned = alignVocabulary(verb.text, swaps);

  const reasons = verb.changed ? [...verb.reasons] : [];
  if (aligned.swaps.length > 0) {
    reasons.push(`Used this advert's wording: ${aligned.swaps.join(', ')}.`);
  }

  return {
    text: aligned.text,
    changed: verb.changed || aligned.swaps.length > 0,
    reasons,
    refusal: verb.changed ? '' : (verb.reasons[0] ?? ''),
  };
}

// --- Skills ----------------------------------------------------------------
