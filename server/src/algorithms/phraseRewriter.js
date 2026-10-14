/**
 * Sentence-level rewriting for the Job-Tailored CV Rewrite.
 *
 * A recruiter — and the screening software in front of them — reads the
 * first word of every bullet point. "Responsible for managing the release
 * process" and "Managed the release process" say the same thing, but only
 * the second opens with an action verb, which is what the strength scorer
 * and every CV guide ask for.
 *
 * This module does that conversion, and nothing more ambitious. It is all
 * our own code: no NLP library, no language model. That puts a hard limit
 * on what it can safely do, and the limit is deliberate:
 *
 *   - It only rewrites when the replacement verb comes from the user's
 *     own sentence. "Responsible for **managing** X" already contains the
 *     verb, so it becomes "Managed X".
 *   - When a weak opener is followed by a noun rather than a verb
 *     ("Responsible for the till"), there is no verb to promote. Inventing
 *     one would be writing the user's CV for them, so the line is left
 *     exactly as it is and reported as a suggestion instead.
 *
 * Everything here is pure: a string in, a string out.
 */
import { ACTION_VERBS } from '../data/actionVerbs.js';

/**
 * Openers that push the real verb out of first position.
 *
 * Longest first, so "was responsible for" is matched before
 * "responsible for" can match inside it.
 */
const WEAK_OPENERS = [
  'i was responsible for',
  'was responsible for',
  'i am responsible for',
  'am responsible for',
  'responsible for',
  'responsibilities included',
  'responsibilities include',
  'duties included',
  'duties include',
  'tasks included',
  'tasks include',
  'my role involved',
  'role involved',
  'role included',
  'involved in',
  'worked on',
  'worked with',
  'helped to',
  'helped with',
  'in charge of',
  'tasked with',
];

/**
 * Verbs whose past tense is not formed by adding "-ed".
 *
 * Only the ones that actually turn up in CVs are listed. An irregular
 * verb that is missing simply falls through to the regular rule, which
 * produces something slightly wrong rather than something broken — and
 * the user is shown the rewrite before it is saved.
 */
const IRREGULAR_PAST = new Map(
  Object.entries({
    lead: 'led',
    build: 'built',
    write: 'wrote',
    run: 'ran',
    make: 'made',
    take: 'took',
    teach: 'taught',
    bring: 'brought',
    begin: 'began',
    choose: 'chose',
    cut: 'cut',
    deal: 'dealt',
    drive: 'drove',
    find: 'found',
    give: 'gave',
    grow: 'grew',
    hold: 'held',
    keep: 'kept',
    meet: 'met',
    oversee: 'oversaw',
    rebuild: 'rebuilt',
    rewrite: 'rewrote',
    sell: 'sold',
    send: 'sent',
    set: 'set',
    speak: 'spoke',
    spend: 'spent',
    undertake: 'undertook',
    win: 'won',
  }),
);

/**
 * Turns a gerund ("managing") back into its base verb ("manage").
 *
 * Four rules, applied in order:
 *
 *   1. Strip "-ing".
 *   2. Undo a doubled final consonant: "planning" -> "plann" -> "plan".
 *   3. Ask the project's own action-verb list whether the result is a
 *      real verb, and whether adding back a silent "e" would make one.
 *   4. Fall back to restoring the silent "e" on the consonant clusters
 *      that reliably need it.
 *
 * Rule 3 is what makes this reliable without a dictionary of irregular
 * gerunds. "writing" strips to "writ", which is not a verb, but "write"
 * is — so "write" is the answer. "editing" strips to "edit", which *is*
 * a verb, so it is left alone and never becomes "edite". A spelling rule
 * alone cannot tell those two apart; the word list can.
 *
 * Rules 2 and 3-with-an-"e" are mutually exclusive, because English
 * never does both: a verb either doubles its consonant ("sit" ->
 * "sitting") or drops a silent "e" ("write" -> "writing"). Tracking
 * which happened is what stops "sitting" becoming "site".
 *
 * @param {string} word - A lowercased word that ends in "ing".
 * @returns {string|null} The base verb, or null if this is not a gerund.
 */
export function gerundToBase(word) {
  const lower = String(word ?? '').toLowerCase();

  // "king", "thing", "ring" are not gerunds. Below six characters the
  // odds of a false positive outweigh anything gained.
  if (!lower.endsWith('ing') || lower.length < 6) return null;

  let base = lower.slice(0, -3);
  let undoubled = false;

  // "planning" -> "plann" -> "plan". Not applied to "ss", because
  // "assessing" -> "assess" is already correct.
  if (
    base.length > 2 &&
    base.at(-1) === base.at(-2) &&
    !'aeiou'.includes(base.at(-1)) &&
    base.at(-1) !== 's'
  ) {
    base = base.slice(0, -1);
    undoubled = true;
  }

  // A verb we already know, left exactly as it is: "edit", "run", "test".
  if (isKnownVerb(base)) return base;

  // "writ" is not a verb but "write" is: the gerund dropped a silent "e".
  if (!undoubled && isKnownVerb(`${base}e`)) return `${base}e`;

  // Outside the word list, fall back to spelling alone:
  // "managing" -> "manag" -> "manage", "routing" -> "rout" -> "route".
  if (!undoubled && /(?:ag|at|iv|iz|is|us|bl|ur|uc|in|lv|rg|rv|dl|pl|ut)$/.test(base)) {
    base = `${base}e`;
  }

  return base;
}

/**
 * The past tense of a base verb.
 *
 * Irregulars come from the table above; everything else follows the
 * ordinary English rules.
 *
 * @param {string} base - A lowercased base verb, e.g. "manage".
 * @returns {string} The past tense, e.g. "managed".
 */
export function toPastTense(base) {
  const word = String(base ?? '').toLowerCase();
  if (!word) return '';

  const irregular = IRREGULAR_PAST.get(word);
  if (irregular) return irregular;

  // "manage" -> "managed": the "e" is already there.
  if (word.endsWith('e')) return `${word}d`;

  // "simplify" -> "simplified", but "play" -> "played": only a consonant
  // before the "y" changes it to "i".
  if (word.endsWith('y') && word.length > 2 && !'aeiou'.includes(word.at(-2))) {
    return `${word.slice(0, -1)}ied`;
  }

  // "plan" -> "planned": a short consonant-vowel-consonant word doubles
  // its final consonant. "w", "x" and "y" never do.
  if (
    word.length <= 5 &&
    /[^aeiou][aeiou][^aeiouwxy]$/.test(word) &&
    !['ed', 'ing'].some((suffix) => word.endsWith(suffix))
  ) {
    return `${word}${word.at(-1)}ed`;
  }

  return `${word}ed`;
}

/**
 * Capitalises the first letter and tidies the spacing.
 *
 * @param {string} text - Any sentence.
 * @returns {string} The same sentence, presentable.
 */
export function tidy(text) {
  const trimmed = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Finds the weak opener a line begins with, if any.
 *
 * @param {string} lower - The line, lowercased and trimmed.
 * @returns {string|null} The matched opener.
 */
function findWeakOpener(lower) {
  return WEAK_OPENERS.find((opener) => lower.startsWith(`${opener} `)) ?? null;
}

/**
 * Rewrites one line so that it opens with an action verb.
 *
 * Returns the line unchanged — with `changed: false` and a reason — in
 * every case where the rewrite could not be made from the user's own
 * words. The caller shows those reasons to the user as advice rather
 * than silently doing nothing.
 *
 * @param {string} line - One description or achievement.
 * @param {{present?: boolean}} [options] - `present` writes the verb in
 *   the present tense, for a role the user still holds.
 * @returns {{text: string, changed: boolean, reason: string}}
 */
export function rewriteAsAction(line, options = {}) {
  const { present = false } = options;

  const original = tidy(line);
  if (!original) return { text: '', changed: false, reason: '' };

  const opener = findWeakOpener(original.toLowerCase());

  if (!opener) {
    return { text: original, changed: false, reason: '' };
  }

  const remainder = original.slice(opener.length).trim();
  const [firstWord, ...rest] = remainder.split(' ');

  const base = gerundToBase(firstWord);

  if (!base) {
    // No verb to promote: "Responsible for the stock room". Rewriting
    // this would mean choosing a verb the user never wrote.
    return {
      text: original,
      changed: false,
      reason:
        `Starts with "${opener}", which an ATS reads as filler. ` +
        'Rewrite it to open with what you actually did.',
    };
  }

  const verb = present ? base : toPastTense(base);
  const rewritten = tidy([verb, ...rest].join(' '));

  return {
    text: rewritten,
    changed: rewritten !== original,
    reason: `Opened with "${opener}"; rewritten to lead with "${tidy(verb)}".`,
  };
}

/**
 * Rewrites every line of a multi-line description.
 *
 * Descriptions in the builder are free text and often hold several
 * sentences, each of which a screening system reads as its own bullet.
 * Each is rewritten independently and the separators are preserved, so
 * the shape of what the user wrote survives.
 *
 * @param {string} description - The description field.
 * @param {{present?: boolean}} [options] - Passed through to each line.
 * @returns {{text: string, changed: boolean, reasons: string[]}}
 */
export function rewriteDescription(description, options = {}) {
  const source = String(description ?? '');
  if (!source.trim()) return { text: '', changed: false, reasons: [] };

  // Split on line breaks first, because a user writing bullets presses
  // Enter. Sentences within a line are then handled on their own.
  const lines = source.split(/\r?\n/);
  const reasons = [];
  let changed = false;

  const rewrittenLines = lines.map((line) => {
    if (!line.trim()) return line;

    // A leading bullet character is kept and put back afterwards, so the
    // verb check looks at the words rather than at "-".
    const bulletMatch = line.match(/^\s*([-•*]\s*)/);
    const bullet = bulletMatch ? bulletMatch[1] : '';
    const body = bullet ? line.slice(bulletMatch[0].length) : line;

    // A line often holds several sentences ("Worked on X. Performing Y."),
    // and each is a bullet to the reader, so each is polished on its own.
    const sentences = splitSentences(body).map((sentence) => {
      const result = polishSentence(sentence, options);
      if (result.changed) changed = true;
      // The same reason for two sentences is said once.
      const said = result.changed ? result.reasons : [result.refusal];
      for (const reason of said) if (reason && !reasons.includes(reason)) reasons.push(reason);
      return result.text;
    });

    return `${bullet}${sentences.join(' ')}`;
  });

  return { text: rewrittenLines.join('\n'), changed, reasons };
}

// --- Clean-up and tense ------------------------------------------------------
//
// The passes below make a line read like a CV line without changing what it
// says. Each one only removes words or changes a verb's tense; none of them
// adds a fact, a number, a skill or a verb the user did not write.

/**
 * Verbs that are not "action verbs" for scoring purposes but still need the
 * right tense. Kept here rather than in `actionVerbs.js`, because adding
 * them there would change the CV Strength Score.
 */
const EVERYDAY_VERBS = new Set([
  'work',
  'prepare',
  'participate',
  'assist',
  'use',
  'ensure',
  'provide',
  'help',
  'join',
  'report',
  'review',
  'respond',
  'monitor',
  'communicate',
]);

/**
 * Words that, straight after the first word, show the first word is a noun
 * rather than a verb: "Testing of APIs", "Reports were sent". A line like
 * that is left alone.
 */
const NOUN_SIGNALS = new Set(['of', 'is', 'was', 'are', 'were', 'and', 'or', '&', 'have', 'has']);

/** Every past form in the irregular table, so a past verb is recognised. */
const IRREGULAR_PAST_FORMS = new Set(IRREGULAR_PAST.values());

/**
 * Whether a lowercased base form is a verb this module knows.
 * @param {string} base
 * @returns {boolean}
 */
function isKnownVerb(base) {
  return ACTION_VERBS.has(base) || EVERYDAY_VERBS.has(base);
}

/**
 * Whether a lowercased word is already a past-tense verb.
 * @param {string} word
 * @returns {boolean}
 */
function isPastVerb(word) {
  return IRREGULAR_PAST_FORMS.has(word) || (word.endsWith('ed') && word.length > 4);
}

/**
 * Filler rules: [pattern, replacement, label]. A replacement function gets
 * the regular-expression match. Applied in order.
 */
const FILLER_RULES = [
  // "Was able to reduce costs" -> "Reduced costs". The verb is the user's.
  [
    /\b(?:was|were)\s+able\s+to\s+([a-z]+)/i,
    (match, verb) => (isKnownVerb(verb.toLowerCase()) ? toPastTense(verb) : match),
    '"was able to"',
  ],
  [/\bsuccessfully\s+/gi, '', '"successfully"'],
  [/\s+successfully\b/gi, '', '"successfully"'],
  [/\beffectively\s+/gi, '', '"effectively"'],
  [/\bin order to\b/gi, 'to', '"in order to"'],
  [/\butili[sz]ation\b/gi, 'use', '"utilisation"'],
  [/\butili[sz](e|es|ed|ing)\b/gi, (match, ending) => `us${ending}`, '"utilise"'],
];

/**
 * Removes a leading "I" or "We" and common filler words.
 *
 * "I developed" becomes "Developed": a CV is written without pronouns. The
 * pronoun is only removed when the next word is a verb, so "I/O testing"
 * and "We Care Foundation" are untouched.
 *
 * Step by step:
 *   1. Apply each filler rule in turn, noting which ones fired.
 *   2. Strip a leading "I" / "We" (and "have"/"had") before a verb.
 *   3. Tidy spacing and capitalisation.
 *
 * @param {string} line - One sentence.
 * @returns {{text: string, removed: string[]}} The cleaned line and what was taken out.
 */
export function removeFiller(line) {
  let text = tidy(line);
  const removed = [];

  // Step 1: the filler words.
  for (const [pattern, replacement, label] of FILLER_RULES) {
    const next = text.replace(pattern, replacement);
    if (next !== text) {
      text = next;
      if (!removed.includes(label)) removed.push(label);
    }
  }

  // Step 2: the pronoun — after the filler, so "I successfully built"
  // is seen as "I built".
  const pronoun = /^(?:i|we)\s+(?:have\s+|had\s+)?([a-z]+)\b/i.exec(text);
  if (pronoun) {
    const next = pronoun[1].toLowerCase();
    if (isPastVerb(next) || isKnownVerb(next)) {
      text = text.slice(pronoun[0].length - pronoun[1].length);
      removed.push('the opening pronoun');
    }
  }

  // Step 3: tidy.
  return { text: tidy(text), removed };
}

/**
 * Puts the opening verb in the right tense for the role.
 *
 * A finished role reads in the past tense ("Performed testing"), a current
 * one in the present ("Perform testing"). Two shapes are converted, because
 * both are unambiguous verbs:
 *   - a gerund: "Performing testing" -> "Performed" / "Perform";
 *   - for a finished role, a third-person verb: "Leads the team" -> "Led".
 * A bare base form ("Test cases for…") is left alone, because too many of
 * them are also nouns.
 *
 * @param {string} line - One sentence.
 * @param {{present?: boolean}} [options] - `present` for a current role.
 * @returns {{text: string, changed: boolean}}
 */
export function normaliseTense(line, options = {}) {
  const { present = false } = options;
  const text = tidy(line);
  const words = text.split(' ');
  const word = (words[0] ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const next = (words[1] ?? '').toLowerCase().replace(/[^a-z&]/g, '');

  if (!word || NOUN_SIGNALS.has(next)) return { text, changed: false };

  let base = null;

  // A gerund: "Performing" -> "perform".
  const fromGerund = gerundToBase(word);
  if (fromGerund && isKnownVerb(fromGerund)) {
    base = fromGerund;
  } else if (!present && word.endsWith('s') && !word.endsWith('ss')) {
    // A third-person verb: "leads" -> "lead", "carries" -> "carry".
    const candidates = word.endsWith('ies')
      ? [`${word.slice(0, -3)}y`]
      : [word.slice(0, -2), word.slice(0, -1)];
    base = candidates.find((candidate) => isKnownVerb(candidate)) ?? null;
  }

  if (!base) return { text, changed: false };

  const verb = present ? base : toPastTense(base);
  const rewritten = tidy([verb, ...words.slice(1)].join(' '));
  return { text: rewritten, changed: rewritten !== text };
}

/**
 * Every honest wording improvement for one sentence, in order:
 *   1. promote the verb out of a weak opener (`rewriteAsAction`);
 *   2. remove a leading pronoun and filler words (`removeFiller`);
 *   3. fix the tense of the opening verb (`normaliseTense`), unless step 1
 *      already wrote the verb in the right tense.
 *
 * @param {string} line - One sentence.
 * @param {{present?: boolean}} [options] - `present` for a current role.
 * @returns {{text: string, changed: boolean, reasons: string[], refusal: string}}
 */
export function polishSentence(line, options = {}) {
  const original = tidy(line);
  if (!original) return { text: '', changed: false, reasons: [], refusal: '' };

  const reasons = [];

  // Step 1: weak opener.
  const opener = rewriteAsAction(original, options);
  if (opener.changed) reasons.push(opener.reason);

  // Step 2: pronoun and filler.
  const cleaned = removeFiller(opener.text);
  if (cleaned.removed.length > 0) {
    reasons.push(`Removed ${cleaned.removed.join(', ')} — a CV line reads stronger without it.`);
  }

  // Step 3: tense.
  let text = cleaned.text;
  if (!opener.changed) {
    const tense = normaliseTense(text, options);
    if (tense.changed) {
      reasons.push(
        options.present
          ? 'Put the opening verb in the present tense, for a role you still hold.'
          : 'Put the opening verb in the past tense, for a role you have finished.',
      );
      text = tense.text;
    }
  }

  return {
    text,
    changed: text !== original,
    reasons,
    // A rewrite the opener step refused, passed on as advice.
    refusal: opener.changed ? '' : opener.reason,
  };
}

/**
 * Splits one line into its sentences, so each can be polished on its own.
 * A sentence ends at ".", "!" or "?" followed by a space and a capital.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function splitSentences(line) {
  return String(line ?? '')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter((sentence) => sentence.trim());
}

export default rewriteAsAction;
