/**
 * Job-Tailored CV Rewrite.
 *
 * The user has one CV they keep up to date. A particular advert asks for
 * a particular slice of it. This module produces a *draft* second CV that
 * puts that slice first, in the advert's own vocabulary — which is what
 * "tailoring a CV" means when a careers adviser says it, and what an
 * applicant tracking system is actually measuring when it ranks you.
 *
 * It is our own code throughout. No language model is involved, and that
 * constraint shapes the whole design: a program that cannot write English
 * must not pretend to. So the rewrite is built from four operations that
 * are honest without being creative:
 *
 *   1. **Re-ordering.** Put the most relevant achievements, projects,
 *      skills and sections first. Nothing is invented; the same facts are
 *      read in a different order.
 *   2. **Re-wording.** Promote the verb the user already wrote to the
 *      front of the line ("Responsible for managing X" -> "Managed X").
 *      Handled by `phraseRewriter.js`, which refuses to rewrite whenever
 *      the verb would have to come from somewhere other than the user.
 *   3. **Re-spelling.** Where the CV and the advert name the same skill
 *      differently, use the advert's spelling ("JS" -> "JavaScript").
 *      Only ever between aliases of one dictionary entry, so it cannot
 *      change what a sentence means.
 *   4. **Assembling.** Build a professional summary out of facts the CV
 *      already states — job title, years, skills, one quantified result,
 *      highest qualification — joined by fixed connecting phrases.
 *
 * Where it cannot act honestly it says so instead. A bullet with no verb
 * to promote, and a role that quantifies nothing, come back as advice in
 * `notes` rather than as a change — the module will not choose a verb or
 * invent a figure on the user's behalf.
 *
 * What it deliberately will not do is add a skill the CV never mentions.
 * A skill the advert asks for and the CV proves *somewhere* (described in
 * a role but missing from the skills list) is added, because the evidence
 * is the user's own. A skill with no evidence at all is only ever
 * *suggested*, and the user decides.
 *
 * Nothing here touches the database and nothing here is saved. The caller
 * returns the draft to the user, who edits it and then chooses to keep it
 * as a new CV.
 *
 * "Relevance" throughout means one thing: the share of the advert's
 * highest-weighted TF-IDF vocabulary that a piece of text covers. The
 * weighting is the same `tfidf.js` the match analyser uses, so a change
 * the tailor makes and the score the analyser reports cannot disagree
 * about what this advert is asking for.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAILOR_CONFIG } from '../config/scoringConfig.js';
import { processText, cvToText, normaliseText, tokenise } from './textProcessor.js';
import { documentFrequency, tfidfVector, topTerms } from './tfidf.js';
import { skillsFromSection } from './jobMatcher.js';
import { hasQuantifiedResult } from './cvStrengthScorer.js';
import { SKILLS, findSkills } from '../data/skillsDictionary.js';
import { rewriteDescription, rewriteAsAction, tidy } from './phraseRewriter.js';

/**
 * The same seed adverts the match analyser weights against.
 *
 * Read here rather than imported from `jobMatcher.js`, which keeps its
 * processed copy private. Duplicating one file read at module load is a
 * much smaller cost than widening that module's surface — and it is read
 * once, when the process starts, not per request.
 *
 * @type {string[][]}
 */
const SEED_DOCUMENTS = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/seedJobDescriptions.json'),
    'utf8',
  ),
).map((entry) => processText(entry.text));

/** Sections the draft copies across unchanged, in CV order. */
const CARRIED_FIELDS = [
  'templateKey',
  'personal',
  'education',
  'certifications',
  'languages',
  'references',
  'referencesOnRequest',
];

// --- Relevance -------------------------------------------------------------

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
const RELEVANCE_BAND = 0.01;

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
function rankByRelevance(items, toText, profile, tieBreak = () => 0) {
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
function orderChanged(ranked) {
  return ranked.some((entry, index) => entry.originalIndex !== index);
}

// --- Summary ---------------------------------------------------------------

/**
 * Years of experience, worked out from the dates already on the CV.
 *
 * Dates are stored as "YYYY-MM" strings by the builder. An entry marked
 * as current, or with no end date, runs to today.
 *
 * The span is measured from the earliest start to the latest end rather
 * than by adding the roles up, because overlapping roles would otherwise
 * be double-counted and the summary would overstate the user's career —
 * the one thing a generated summary must never do.
 *
 * @param {Array<object>} experience - The experience section.
 * @returns {number} Whole years, or 0 when the dates do not support a figure.
 */
export function yearsOfExperience(experience = []) {
  const months = [];

  for (const entry of experience) {
    const start = monthNumber(entry?.startDate);
    if (start === null) continue;

    const end = entry?.isCurrent ? monthNumber(today()) : monthNumber(entry?.endDate);
    months.push([start, end ?? monthNumber(today())]);
  }

  if (months.length === 0) return 0;

  const earliest = Math.min(...months.map(([start]) => start));
  const latest = Math.max(...months.map(([, end]) => end));

  return Math.max(0, Math.floor((latest - earliest) / 12));
}

/** Today as "YYYY-MM". @returns {string} */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Turns "2021-09" into a count of months, so two dates can be subtracted.
 * @param {string} value - A "YYYY-MM" string.
 * @returns {number|null} Months since year zero, or null if unparseable.
 */
function monthNumber(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

/** @param {string} text @returns {number} The number of words. */
function wordCount(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Builds a professional summary out of facts the CV already states.
 *
 * Every clause is sourced, and the source is named in the comment beside
 * it. The connecting words ("with", "Skilled in", "Holds a") are the only
 * language this module contributes; every noun, verb, number and skill
 * comes from the user's own CV or from the advert's job title.
 *
 * Sentences are added in order of how much they are worth to a reader,
 * and stop once the target length is reached. If the CV does not contain
 * enough to reach the minimum, a short summary is returned and the caller
 * reports that rather than padding it out with filler.
 *
 * @param {object} cv - The source CV.
 * @param {{targetTitle: string, namedSkills: string[]}} context
 * @returns {{text: string, sentences: string[], short: boolean}}
 */
export function buildSummary(cv, { targetTitle, namedSkills }) {
  const sentences = [];

  // 1. Who they are. The advert's job title when there is one, because
  //    that is the role being applied for; otherwise their own headline.
  const role = tidy(targetTitle || cv.personal?.headline || '');
  const years = yearsOfExperience(cv.experience);

  if (role) {
    sentences.push(years >= 1 ? `${role} with ${years}+ years' experience.` : `${role}.`);
  } else if (years >= 1) {
    sentences.push(`Professional with ${years}+ years' experience.`);
  }

  // 2. What they work with. Already ordered by the caller so the skills
  //    this advert asks for come first.
  const skills = namedSkills.slice(0, TAILOR_CONFIG.summary.maxSkillsNamed);
  if (skills.length > 0) {
    sentences.push(`Skilled in ${listPhrase(skills)}.`);
  }

  // 3. Proof. The most relevant achievement that quantifies something,
  //    quoted as written — a number the user put there is the strongest
  //    line in any CV, and rewording it would risk changing it.
  const proof = strongestAchievement(cv);
  if (proof) sentences.push(endWithFullStop(proof));

  // 4. Qualifications, from the first education entry.
  const education = (cv.education ?? []).find((entry) => entry?.degree || entry?.fieldOfStudy);
  if (education) {
    const field = education.fieldOfStudy ? ` in ${education.fieldOfStudy}` : '';
    const place = education.institution ? ` from ${education.institution}` : '';
    sentences.push(tidy(`Holds a ${education.degree || 'qualification'}${field}${place}.`));
  }

  // 5. What they are applying for. Last, because it is the only sentence
  //    about the future rather than about evidence.
  if (targetTitle) {
    sentences.push(`Now seeking a ${tidy(targetTitle)} role.`);
  }

  // Trim from the end until the summary fits. The first two sentences are
  // never dropped: without them there is no summary, only supporting detail.
  const kept = [];
  for (const sentence of sentences) {
    const candidate = [...kept, sentence].join(' ');
    if (kept.length >= 2 && wordCount(candidate) > TAILOR_CONFIG.summary.maxWords) break;
    kept.push(sentence);
  }

  const text = kept.join(' ');

  return {
    text,
    sentences: kept,
    short: wordCount(text) < TAILOR_CONFIG.summary.minWords,
  };
}

/**
 * The achievement most worth quoting: one that contains a number.
 *
 * @param {object} cv - The source CV.
 * @returns {string} The achievement, or an empty string if there is none.
 */
function strongestAchievement(cv) {
  for (const entry of cv.experience ?? []) {
    for (const achievement of entry?.achievements ?? []) {
      if (hasQuantifiedResult(achievement)) return tidy(achievement);
    }
  }
  return '';
}

/**
 * Joins a list the way a person writes one: "a, b and c".
 * @param {string[]} items - The items.
 * @returns {string} The joined phrase.
 */
function listPhrase(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** @param {string} text @returns {string} The text, ending in a full stop. */
function endWithFullStop(text) {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// --- Vocabulary ------------------------------------------------------------

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
function escapeForRegExp(value) {
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
function polishLine(line, swaps, options = {}) {
  const verb = rewriteAsAction(line, options);
  const aligned = alignVocabulary(verb.text, swaps);

  const reasons = [];
  if (verb.changed && verb.reason) reasons.push(verb.reason);
  if (aligned.swaps.length > 0) {
    reasons.push(`Used this advert's wording: ${aligned.swaps.join(', ')}.`);
  }

  return {
    text: aligned.text,
    changed: verb.changed || aligned.swaps.length > 0,
    reasons,
    // A rewrite the module refused to make, which the caller passes on
    // to the user as advice instead.
    refusal: verb.changed ? '' : verb.reason,
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
function polishDescription(description, swaps, options = {}) {
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

/**
 * Works out what should happen to the skills section.
 *
 * Three groups come out of this, and the difference between them is the
 * whole ethical question the feature raises:
 *
 *   - **Promoted.** Skills the user already lists that this advert asks
 *     for. Moved to the front; nothing added.
 *   - **Added.** Skills the advert asks for that the CV describes
 *     somewhere — in a role, a project, a certification — but never puts
 *     in the skills list. Added, because the user has already claimed
 *     them in their own words and a screening system reads the list.
 *   - **Suggested.** Skills the advert asks for that appear nowhere at
 *     all. Never added. Returned for the user to consider.
 *
 * @param {object} cv - The source CV.
 * @param {string} jobText - The advert.
 * @returns {{skills: Array<object>, promoted: string[], added: string[],
 *            suggested: string[]}}
 */
export function tailorSkills(cv, jobText) {
  const jobSkills = findSkills(jobText, tokenise(normaliseText(jobText)));
  const listed = skillsFromSection(cv);

  const cvText = cvToText(cv);
  const evidenced = findSkills(cvText, tokenise(normaliseText(cvText)));

  const promoted = [];
  const added = [];
  const suggested = [];

  for (const skill of jobSkills) {
    if (listed.has(skill)) promoted.push(skill);
    else if (evidenced.has(skill)) added.push(skill);
    else suggested.push(skill);
  }

  const toAdd = added.slice(0, TAILOR_CONFIG.skills.maxAutoAdded);

  // Skills this advert asks for come first, then everything else in the
  // order the user had them. A recruiter reads the first line of the
  // section; this puts the answer to their question there.
  const wanted = new Set(promoted);
  const existing = cv.skills ?? [];

  const skills = [
    ...existing.filter((skill) => wanted.has(canonicalOf(skill))),
    ...existing.filter((skill) => !wanted.has(canonicalOf(skill))),
    // A level has to be chosen for an added skill and the CV does not say
    // what it should be. "Intermediate" is the builder's own default and
    // the least likely to overstate anything; the user sets it properly
    // in the review step.
    ...toAdd.map((name) => ({ name, level: 'Intermediate' })),
  ];

  return {
    skills,
    promoted,
    added: toAdd,
    suggested: suggested.slice(0, TAILOR_CONFIG.skills.maxSuggested),
  };
}

/**
 * The canonical name of a skill entry, falling back to what was typed.
 * @param {{name?: string}} skill - A skills-section entry.
 * @returns {string} The canonical name, or the raw name.
 */
function canonicalOf(skill) {
  const raw = skill?.name ?? '';
  const found = findSkills(raw, tokenise(normaliseText(raw)));
  return found.size === 1 ? [...found][0] : raw;
}

// --- The rewrite -----------------------------------------------------------

/**
 * Produces a tailored draft of one CV for one advert.
 *
 * The seven steps, in order:
 *
 *   1. Weight the advert, giving the relevance yardstick.
 *   2. Point the headline at the advertised role.
 *   3. Re-order and extend the skills section (see `tailorSkills`).
 *   4. Re-word experience so each line opens with a verb and names each
 *      skill the advert's way, and put each role's most relevant
 *      achievements first.
 *   5. Do the same for projects, and order the projects themselves by
 *      relevance — unlike roles, projects have no expected order.
 *   6. Assemble a summary from facts already on the CV.
 *   7. Order the sections so the most relevant one is read first.
 *
 * Experience entries are never re-ordered. A CV is read in reverse
 * chronological order and a reader uses that to judge a career; shuffling
 * roles by keyword would make a recent job look like an old one. Only the
 * achievements *within* a role move.
 *
 * @param {object} cv - The CV to tailor. Not modified.
 * @param {string} jobText - The advert.
 * @param {{jobTitle?: string, priorJobDescriptions?: string[]}} [options]
 * @returns {{draft: object, changes: Array<object>, suggestedSkills: string[],
 *            notes: string[]}}
 */
export function tailorCV(cv, jobText, options = {}) {
  const { jobTitle = '', priorJobDescriptions = [] } = options;

  // --- Step 1: the yardstick ---------------------------------------------
  const profile = buildJobProfile(jobText, priorJobDescriptions);

  const changes = [];
  const notes = [];

  /**
   * Records one change for the review screen.
   * @param {object} change - What changed, and why.
   */
  const record = (change) => changes.push(change);

  // `toObject` is present on a Mongoose document and absent on the plain
  // object the tests and the upload flow pass in.
  const source = typeof cv?.toObject === 'function' ? cv.toObject() : { ...cv };

  const draft = {};
  for (const field of CARRIED_FIELDS) draft[field] = source[field];
  draft.settings = { ...(source.settings ?? {}) };
  draft.personal = { ...(source.personal ?? {}) };

  // --- Step 2: the headline ----------------------------------------------
  if (jobTitle && draft.personal.headline !== jobTitle) {
    record({
      section: 'personal',
      field: 'headline',
      kind: 'replaced',
      before: draft.personal.headline ?? '',
      after: jobTitle,
      reason:
        'The headline is the first line a screening system reads. Matching it to the ' +
        'advertised job title is the single cheapest thing you can change.',
    });
    draft.personal.headline = jobTitle;
  }

  // --- Step 3: skills -----------------------------------------------------
  const skillResult = tailorSkills(source, jobText);
  draft.skills = skillResult.skills;

  if (skillResult.promoted.length > 0 && (source.skills ?? []).length > 1) {
    record({
      section: 'skills',
      kind: 'reordered',
      after: skillResult.promoted.join(', '),
      reason: 'Moved the skills this advert asks for to the front of the section.',
    });
  }

  for (const name of skillResult.added) {
    record({
      section: 'skills',
      kind: 'added',
      after: name,
      reason:
        `This advert asks for ${name}, and your CV describes it elsewhere but does not ` +
        'list it. Added so a screening system reading only the skills section can see it.',
    });
  }

  // --- Step 4: experience -------------------------------------------------
  const vocabulary = buildVocabularyMap(jobText);

  draft.experience = (source.experience ?? []).map((entry) => {
    const role = { ...entry };
    const present = Boolean(entry.isCurrent);
    const label = entry.position || 'A role';

    const rewritten = polishDescription(entry.description, vocabulary, { present });
    if (rewritten.changed) {
      record({
        section: 'experience',
        field: `${entry.position || 'Role'} — description`,
        kind: 'reworded',
        before: entry.description,
        after: rewritten.text,
        reason: rewritten.reasons.join(' '),
      });
      role.description = rewritten.text;
    } else if (rewritten.refusal) {
      notes.push(`${label}: ${rewritten.refusal}`);
    }

    // Where the advert cannot separate two achievements, the one with a
    // number in it goes first.
    const rankedAchievements = rankByRelevance(
      entry.achievements ?? [],
      (text) => text,
      profile,
      (text) => (hasQuantifiedResult(text) ? 1 : 0),
    );

    role.achievements = rankedAchievements.map(({ item }) => {
      const result = polishLine(item, vocabulary, { present });
      if (result.changed) {
        record({
          section: 'experience',
          field: `${entry.position || 'Role'} — achievement`,
          kind: 'reworded',
          before: item,
          after: result.text,
          reason: result.reasons.join(' '),
        });
      } else if (result.refusal) {
        notes.push(`${label}: ${result.refusal}`);
      }
      return result.text;
    });

    // The rewriter will not invent a figure, so a role that quantifies
    // nothing is reported rather than fixed. This is the single biggest
    // thing the user can do to the CV themselves, and the strength
    // scorer already weights it heavily.
    const quantifies = [role.description, ...role.achievements].some((text) =>
      hasQuantifiedResult(text),
    );

    if (!quantifies && (role.description || role.achievements.length > 0)) {
      notes.push(
        `${label}: nothing here is quantified. Add a number — how many, how much, how often, ` +
          'how much faster. A figure you put in yourself is the strongest line on any CV.',
      );
    }

    if (orderChanged(rankedAchievements)) {
      record({
        section: 'experience',
        field: entry.position || 'Role',
        kind: 'reordered',
        reason:
          'Put the achievements closest to this advert first, so the relevant ones are ' +
          'read before a recruiter stops reading.',
      });
    }

    return role;
  });

  // --- Step 5: projects ---------------------------------------------------
  const rankedProjects = rankByRelevance(
    source.projects ?? [],
    (project) =>
      [project?.name, project?.role, project?.description, ...(project?.technologies ?? [])]
        .filter(Boolean)
        .join(' '),
    profile,
  );

  draft.projects = rankedProjects.map(({ item }) => {
    const project = { ...item };
    const rewritten = polishDescription(item.description, vocabulary);

    if (rewritten.changed) {
      record({
        section: 'projects',
        field: item.name || 'Project',
        kind: 'reworded',
        before: item.description,
        after: rewritten.text,
        reason: rewritten.reasons.join(' '),
      });
      project.description = rewritten.text;
    } else if (rewritten.refusal) {
      notes.push(`${item.name || 'A project'}: ${rewritten.refusal}`);
    }

    return project;
  });

  if (orderChanged(rankedProjects)) {
    record({
      section: 'projects',
      kind: 'reordered',
      after: rankedProjects
        .map(({ item }) => item.name)
        .filter(Boolean)
        .join(', '),
      reason: 'Projects have no expected order, so the ones closest to this advert come first.',
    });
  }

  // --- Step 6: the summary ------------------------------------------------
  // Named in the order the summary should name them: the advert's skills
  // first, then the user's strongest remaining ones.
  const alreadyNamed = new Set([...skillResult.promoted, ...skillResult.added]);

  const namedSkills = [
    ...skillResult.promoted,
    ...skillResult.added,
    ...(source.skills ?? [])
      .map((skill) => skill?.name)
      .filter((name) => name && !alreadyNamed.has(name)),
  ];

  const summary = buildSummary(source, { targetTitle: jobTitle, namedSkills });

  if (summary.text && summary.text !== source.summary) {
    record({
      section: 'summary',
      kind: 'replaced',
      before: source.summary ?? '',
      after: summary.text,
      reason:
        'Rebuilt from facts already on your CV — your dates, your skills, your own ' +
        'quantified achievement — in the language of this advert. Read it before you ' +
        'save it: it is a draft, not a finished paragraph.',
    });
  }

  draft.summary = summary.text || (source.summary ?? '');

  if (summary.short) {
    notes.push(
      `The generated summary is under ${TAILOR_CONFIG.summary.minWords} words, because ` +
        'there was not enough on your CV to build a longer one honestly. Add a sentence ' +
        'or two of your own.',
    );
  }

  // --- Step 7: section order ----------------------------------------------
  draft.settings.sectionOrder = orderSections(source, draft, profile, record);

  return {
    draft,
    changes,
    suggestedSkills: skillResult.suggested,
    notes,
  };
}

/**
 * Re-orders the movable sections so the most relevant is read first.
 *
 * Only the sections listed in `TAILOR_CONFIG.reorderableSections` move,
 * and they move only among the positions they already occupy — so
 * `summary` stays at the top, `references` stays at the bottom, and a
 * hidden section stays where it was.
 *
 * A margin stops near-equal sections from swapping on a rounding
 * difference, which would look like the feature misbehaving rather than
 * like a decision.
 *
 * @param {object} source - The original CV.
 * @param {object} draft - The tailored draft, whose content is measured.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @param {(change: object) => void} record - Records the change, if any.
 * @returns {string[]} The new section order.
 */
function orderSections(source, draft, profile, record) {
  const currentOrder = source.settings?.sectionOrder?.length
    ? [...source.settings.sectionOrder]
    : null;

  // No stored order means the CV uses the model's default, which the
  // draft inherits. Imposing one here would be a change the user never
  // asked for on a CV that has never been customised.
  if (!currentOrder) return draft.settings.sectionOrder;

  const movable = currentOrder.filter((key) => TAILOR_CONFIG.reorderableSections.includes(key));
  if (movable.length < 2) return currentOrder;

  /**
   * All of a section's text, as the draft now has it.
   * @param {string} key - The section name.
   * @returns {string} Its combined text.
   */
  const sectionText = (key) => {
    const value = draft[key];
    if (!Array.isArray(value)) return String(value ?? '');

    return value
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : Object.values(entry ?? {})
              .flat()
              .filter((field) => typeof field === 'string')
              .join(' '),
      )
      .join(' ');
  };

  const { sectionSwapMargin } = TAILOR_CONFIG;

  const ranked = [...movable]
    .map((key, originalIndex) => ({
      key,
      originalIndex,
      // Rounded to the margin, so sections within one margin of each
      // other compare equal and the stable sort leaves them alone.
      band: Math.round(relevanceOf(sectionText(key), profile) / sectionSwapMargin),
    }))
    .sort((a, b) => b.band - a.band);

  if (!orderChanged(ranked)) return currentOrder;

  // Put the re-ranked sections back into the slots the movable sections
  // occupied, leaving every other section exactly where it was.
  const reordered = [...currentOrder];
  const slots = currentOrder
    .map((key, index) => (TAILOR_CONFIG.reorderableSections.includes(key) ? index : -1))
    .filter((index) => index >= 0);

  slots.forEach((slot, position) => {
    reordered[slot] = ranked[position].key;
  });

  record({
    section: 'settings',
    field: 'sectionOrder',
    kind: 'reordered',
    before: currentOrder.join(' → '),
    after: reordered.join(' → '),
    reason: 'Put the sections with the most to say about this advert nearest the top.',
  });

  return reordered;
}

export default tailorCV;
