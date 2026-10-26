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
 * A skill the advert asks for and the CV proves *somewhere* (described in
 * a role but missing from the skills list) is added, because the evidence
 * is the user's own. A skill with no evidence at all is only ever
 * *suggested*, and the user decides.
 *
 * The one exception is the target pass (step 8, `reachTarget`). The
 * feature is specified to produce a CV that clears a `targetScore`
 * match, and on a CV that the honest steps leave short of it, the only
 * lever left is to list skills the CV cannot evidence. So it adds them —
 * the fewest that get over the line, re-scoring after each one, and
 * never more than `maxAssumed`. They come back under `assumedSkills`
 * rather than mixed in with the rest, and the review screen labels every
 * one as an assumption for the user to confirm or delete. On a CV in the
 * right field the pass adds nothing at all: the honest steps are
 * normally worth more than it is.
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
import { TAILOR_CONFIG, PAGE_FILL_CONFIG } from '../config/scoringConfig.js';
import { processText, cvToText, normaliseText, tokenise } from './textProcessor.js';
import { documentFrequency, tfidfVector, topTerms } from './tfidf.js';
import { skillsFromSection, analyseMatch, buildSurfaceForms } from './jobMatcher.js';
import { hasQuantifiedResult } from './cvStrengthScorer.js';
import { estimateFill } from './pageFill.js';
import { SKILLS, findSkills } from '../data/skillsDictionary.js';
import { rewriteDescription, polishSentence, tidy } from './phraseRewriter.js';

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
 * It counts the months actually worked, so the summary never overstates
 * the user's career — the one thing a generated summary must never do:
 *   1. Turn each role into a [start, end] range of month numbers.
 *   2. Sort the ranges by start and merge any that overlap, so two jobs
 *      held at the same time are counted once.
 *   3. Add up the merged ranges. A gap between jobs falls between two
 *      ranges and so is not counted.
 *
 * @param {Array<object>} experience - The experience section.
 * @returns {number} Whole years, or 0 when the dates do not support a figure.
 */
export function yearsOfExperience(experience = []) {
  // Step 1: one range per dated role.
  const ranges = [];

  for (const entry of experience) {
    const start = monthNumber(entry?.startDate);
    if (start === null) continue;

    const end = entry?.isCurrent ? monthNumber(today()) : monthNumber(entry?.endDate);
    const finish = end ?? monthNumber(today());
    if (finish >= start) ranges.push([start, finish]);
  }

  if (ranges.length === 0) return 0;

  // Step 2: merge overlapping ranges.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0].slice()];
  for (const [start, end] of ranges.slice(1)) {
    const last = merged.at(-1);
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  // Step 3: total months worked.
  const months = merged.reduce((total, [start, end]) => total + (end - start), 0);
  return Math.floor(months / 12);
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
 * Every clause is sourced: every noun, verb, number and skill comes from
 * the user's own CV or from the advert's job title. What this module adds
 * is only the connecting language — and so that two CVs do not read like
 * the same form filled in twice, each sentence has a few interchangeable
 * phrasings. The phrasing is picked from a hash of the person's name, so it
 * differs between people but stays the same every time one CV is rewritten.
 *
 * Step by step:
 *   1. **Who they are.** Their role (the advert's title, softened so it
 *      never claims more seniority than the CV shows) and the years they
 *      have actually worked — gaps between jobs are not counted.
 *   2. **What they work with.** Up to `maxSkillsNamed` skills, the
 *      advert's first, with the one the advert weights most named as the
 *      main strength.
 *   3. **Proof.** The most relevant quantified achievement, quoted as
 *      written — rewording a number risks changing it.
 *   4. **Qualifications.** The first education entry.
 *   5. **Intent.** The role being applied for, by its advertised title.
 *
 * Sentences are added in that order and stop at `maxWords`. The first two
 * are never dropped. If the CV does not hold enough for `minWords`, a short
 * summary is returned and the caller says so rather than padding it.
 *
 * The two ceilings are options because the page-fill step raises them: a
 * CV that leaves half the page blank is better served by a summary that
 * says everything it can source, and a longer sourced summary invents
 * nothing.
 *
 * @param {object} cv - The source CV.
 * @param {{targetTitle: string, appliedRole?: string, namedSkills: string[],
 *          maxWords?: number, maxSkillsNamed?: number}} context
 *   `targetTitle` is the (softened) title used to describe the person;
 *   `appliedRole` the job's own title, used in the closing sentence.
 * @returns {{text: string, sentences: string[], short: boolean}}
 */
export function buildSummary(
  cv,
  {
    targetTitle,
    appliedRole = targetTitle,
    namedSkills,
    maxWords = TAILOR_CONFIG.summary.maxWords,
    maxSkillsNamed = TAILOR_CONFIG.summary.maxSkillsNamed,
  },
) {
  const sentences = [];
  const pick = phrasePicker(cv);

  // 1. Who they are.
  const role = tidy(targetTitle || cv.personal?.headline || cv.experience?.[0]?.position || '');
  const years = yearsOfExperience(cv.experience);
  const roles = (cv.experience ?? []).filter((entry) => entry?.position).length;

  if (role && years >= 1) {
    sentences.push(
      pick([
        `${role} with ${years}+ years of hands-on experience.`,
        `${role} bringing ${years}+ years of practical experience.`,
        roles > 1
          ? `${role} with ${years}+ years' experience across ${roles} roles.`
          : `${role} with ${years}+ years of professional experience.`,
      ]),
    );
  } else if (role) {
    sentences.push(`${role}.`);
  } else if (years >= 1) {
    sentences.push(`Professional with ${years}+ years of hands-on experience.`);
  }

  // 2. What they work with. Already ordered so the advert's skills lead.
  const skills = namedSkills.slice(0, maxSkillsNamed);
  if (skills.length >= 3) {
    const [lead, ...others] = skills;
    sentences.push(
      pick([
        `Works across ${listPhrase(others)}, with particular strength in ${lead}.`,
        `Core skills include ${listPhrase(skills)}.`,
        `Experienced with ${listPhrase(others)}, and strongest in ${lead}.`,
      ]),
    );
  } else if (skills.length > 0) {
    sentences.push(`Skilled in ${listPhrase(skills)}.`);
  }

  // 3. Proof, quoted as written. Lower-cased only when it opens with a
  //    capitalised verb, so names and acronyms keep their capitals.
  const proof = strongestAchievement(cv);
  if (proof) {
    const asClause = /^[A-Z][a-z]/.test(proof)
      ? proof.charAt(0).toLowerCase() + proof.slice(1)
      : proof;
    sentences.push(
      endWithFullStop(
        pick([
          `Notable result: ${asClause}`,
          `Recent highlight: ${asClause}`,
          `Track record includes: ${asClause}`,
        ]),
      ),
    );
  }

  // 4. Qualifications, from the first education entry.
  const education = (cv.education ?? []).find((entry) => entry?.degree || entry?.fieldOfStudy);
  if (education) {
    const degree = education.degree || 'a qualification';
    const field = education.fieldOfStudy ? ` in ${education.fieldOfStudy}` : '';
    const place = education.institution ? ` from ${education.institution}` : '';
    sentences.push(tidy(`Holds ${withArticle(degree)}${field}${place}.`));
  }

  // 5. Intent, by the advertised title — this is what they are applying for.
  if (appliedRole) {
    const applied = tidy(appliedRole);
    sentences.push(
      pick([
        `Looking to bring these strengths to ${withArticle(applied)} role.`,
        `Keen to apply this experience as ${withArticle(applied)}.`,
        `Ready to contribute as ${withArticle(applied)} from day one.`,
      ]),
    );
  }

  // Trim from the end until the summary fits. The first two sentences are
  // never dropped: without them there is no summary, only supporting detail.
  const kept = [];
  for (const sentence of sentences) {
    const candidate = [...kept, sentence].join(' ');
    if (kept.length >= 2 && wordCount(candidate) > maxWords) break;
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
 * Returns a function that picks one phrasing from a list.
 *
 * The choice comes from a simple string hash of the person's name (or the
 * CV title), offset by a counter, so each sentence of one summary uses a
 * different position in its list while the whole summary stays the same
 * on every rewrite of that CV. Deterministic on purpose: a rewrite that
 * changed its wording every time it ran would be impossible to test, and
 * confusing to the user.
 *
 * @param {object} cv - The source CV.
 * @returns {(options: string[]) => string}
 */
function phrasePicker(cv) {
  const seedText = cv.personal?.fullName || cv.title || '';
  let hash = 0;
  for (const char of seedText) hash = (hash * 31 + char.charCodeAt(0)) % 1000003;

  let calls = 0;
  return (options) => options[(hash + calls++) % options.length];
}

/**
 * Words in a job title that state seniority.
 */
const SENIORITY_WORDS = new Set([
  'senior',
  'sr',
  'lead',
  'principal',
  'staff',
  'head',
  'chief',
  'director',
]);

/**
 * The advert's job title, softened so it never claims more seniority than
 * the CV shows.
 *
 * "Senior QA Engineer" stays as it is for someone whose CV already holds a
 * senior or lead title. For someone whose titles are "QA Engineer" and
 * "Junior Analyst", the seniority word is dropped and the headline reads
 * "QA Engineer" — still the advert's wording, without a claim the
 * candidate would have to defend at interview. If dropping the word would
 * leave something that is not a title ("Head of Sales" -> "of Sales"), the
 * CV's own headline is used instead.
 *
 * @param {string} jobTitle - The advertised title.
 * @param {object} cv - The source CV.
 * @returns {{title: string, removed: string[]}}
 */
export function softenTitle(jobTitle, cv) {
  const title = String(jobTitle ?? '').trim();
  if (!title) return { title: '', removed: [] };

  const ownWords = new Set(
    [cv.personal?.headline, ...(cv.experience ?? []).map((entry) => entry?.position)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/[^a-z]+/),
  );

  const words = title.split(/\s+/);
  const removed = words.filter((word) => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    return SENIORITY_WORDS.has(lower) && !ownWords.has(lower);
  });

  if (removed.length === 0) return { title, removed: [] };

  const softened = words
    .filter((word) => !removed.includes(word))
    .join(' ')
    .trim();
  const usable = softened && !/^(of|for|and|&)\b/i.test(softened);
  const fallback = cv.personal?.headline?.trim() || cv.experience?.[0]?.position?.trim() || '';

  return { title: usable ? softened : fallback, removed };
}

/** Words that appear in many job titles and say nothing about the job. */
const GENERIC_TITLE_WORDS = new Set([
  'junior',
  'trainee',
  'intern',
  'assistant',
  'associate',
  'of',
  'and',
  'the',
]);

/**
 * Whether a title shares a meaningful word with a title on the CV.
 *
 * "Financial Analyst" and "Accountant" share nothing, so a summary must not
 * call an accountant a financial analyst "with 7+ years of experience".
 * "QA Engineer" and "Junior QA Engineer" share "qa" and "engineer".
 *
 * @param {string} title - The (softened) advertised title.
 * @param {object} cv - The source CV.
 * @returns {boolean} True when the CV supports the title.
 */
function sharesTitleWord(title, cv) {
  const wordsOf = (text) =>
    String(text ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (word) => word.length > 1 && !GENERIC_TITLE_WORDS.has(word) && !SENIORITY_WORDS.has(word),
      );

  const own = new Set(
    [cv.personal?.headline, ...(cv.experience ?? []).map((entry) => entry?.position)].flatMap(
      wordsOf,
    ),
  );

  return wordsOf(title).some((word) => own.has(word));
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
      // Quoted after the same clean-up the bullets get ("Was able to
      // reduce" -> "Reduced"), so the summary never repeats filler the
      // rewrite has just removed. The number itself is never touched.
      if (hasQuantifiedResult(achievement)) return polishSentence(achievement).text;
    }
  }
  return '';
}

/**
 * Puts "a" or "an" in front of a phrase, chosen by how it is said.
 *
 * Without this the summary wrote "a Accountant role" and "a MSc". The rule:
 *   1. An acronym (a first word in capitals, like "MSc" or "HR") goes by
 *      the sound of its first letter: "an MSc", "an HR Officer", "a BBA".
 *   2. Otherwise a vowel takes "an" — except words said with a "you"
 *      sound ("a University", "a User Researcher").
 *
 * @param {string} phrase - e.g. "Accountant", "MSc", "Senior Developer".
 * @returns {string} The phrase with its article, e.g. "an Accountant".
 */
export function withArticle(phrase) {
  const text = String(phrase ?? '').trim();
  const firstWord = text.split(/\s+/)[0] ?? '';

  // Step 1: acronyms, read letter by letter. "MSc" and "BBA" both count:
  // two or more capitals at the start.
  if (/^[A-Z]{2,}|^[A-Z][a-z]?[A-Z]/.test(firstWord)) {
    return `${'AEFHILMNORSX'.includes(firstWord[0]) ? 'an' : 'a'} ${text}`;
  }

  // Step 2: ordinary words.
  const lower = firstWord.toLowerCase();
  const soundsLikeYou = /^(uni|use|usu|eu)/.test(lower);
  return `${/^[aeiou]/.test(lower) && !soundsLikeYou ? 'an' : 'a'} ${text}`;
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

  // The dictionary only knows exact spellings, so "accounts payable" and
  // "budgets" did not count as evidence for Accounting and Budgeting, and
  // the rewrite then told an accountant that her CV never mentions
  // accounting. Comparing stems as well catches these. Very short stems
  // are skipped, because "go" or "r" would be found in almost any text.
  const cvTerms = new Set(processText(cvText));
  for (const skill of jobSkills) {
    const stems = processText(skill);
    if (stems.length > 0 && stems.every((stem) => stem.length >= 4 && cvTerms.has(stem))) {
      evidenced.add(skill);
    }
  }

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
 * The eight steps, in order:
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
 *   8. Score the draft, and if it falls short of the target, add the
 *      fewest unevidenced skills that clear it (see `reachTarget`).
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
  // The advert's title, minus any seniority word the CV does not support
  // ("Senior QA Engineer" -> "QA Engineer" for someone with no senior role).
  const headline = softenTitle(jobTitle, source);

  if (headline.title && draft.personal.headline !== headline.title) {
    record({
      section: 'personal',
      field: 'headline',
      kind: 'replaced',
      before: draft.personal.headline ?? '',
      after: headline.title,
      reason:
        'The headline is the first line a screening system reads. Matching it to the ' +
        'advertised job title is the single cheapest thing you can change.' +
        (headline.removed.length > 0
          ? ` "${headline.removed.join(' ')}" was left out, because no role on your CV ` +
            'shows that level yet — a claim you would have to defend at interview.'
          : ''),
    });
    draft.personal.headline = headline.title;
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

  // The user's own spelling is used wherever they have one, so a CV that
  // lists "MS Excel" is not described as having both "MS Excel" and
  // "Excel".
  const ownSkills = (source.skills ?? []).filter((skill) => skill?.name);
  const ownSpelling = (name) =>
    ownSkills.find((skill) => canonicalOf(skill) === name)?.name ?? name;

  const namedSkills = [
    ...skillResult.promoted.map(ownSpelling),
    ...skillResult.added,
    ...ownSkills
      .filter((skill) => !alreadyNamed.has(canonicalOf(skill)))
      .map((skill) => skill.name),
  ];

  // The summary's opening sentence states years of experience, so it must
  // name a role the person has actually held. The advert's title is used
  // only when the CV's own titles share a word with it ("QA Engineer" for
  // someone who was a "Junior QA Engineer"); otherwise their own title is
  // used and the advert's title appears only as the role being applied for.
  const summaryContext = {
    targetTitle: sharesTitleWord(headline.title, source)
      ? headline.title
      : source.personal?.headline || source.experience?.[0]?.position || headline.title,
    appliedRole: jobTitle,
    namedSkills,
  };
  const summary = buildSummary(source, summaryContext);

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

  // --- Step 8: reach the target score -------------------------------------
  const target = reachTarget(draft, jobText, skillResult.suggested, {
    priorJobDescriptions,
    profile,
    record,
    // The *source* CV decides whether there is anything to tailor. By
    // this point the draft always has a summary, because step 6 built
    // one out of the job title alone — so asking the draft would answer
    // "yes" for a completely empty CV.
    source,
  });

  if (!target.reached) {
    notes.push(
      `The best honest match for this advert is ${target.score}%, short of the ` +
        `${TAILOR_CONFIG.targetScore}% target. The score weighs how much your CV *reads* like ` +
        'the advert as well as which skills it names, and listing more skills cannot fix the ' +
        'first of those. Describing this kind of work in your own roles is what closes it.',
    );
  }

  // --- Step 9: fill the page ----------------------------------------------
  // Last, because it measures the finished draft: run any earlier and it
  // would be sizing a document the target pass had not written yet.
  const pageFill = fillPage(draft, { source, summaryContext, record, notes });

  return {
    draft,
    changes,
    suggestedSkills: target.stillSuggested,
    assumedSkills: target.assumed,
    focusTerms: target.focus,
    matchScore: target.score,
    targetReached: target.reached,
    pageFill,
    notes,
  };
}

/**
 * Whether there is enough on a CV for tailoring to mean anything.
 *
 * An empty CV scores zero against every advert, so the target pass
 * would bolt its full allowance of assumed skills onto a document with
 * no experience, no summary and nothing else in it. That is not a
 * tailored CV, it is a list of the advert's requirements — and it would
 * be the one case where the feature produced something entirely
 * unsupported by the user.
 *
 * It is asked of the **source** CV, never the draft: by the time the
 * target pass runs, step 6 has given the draft a summary built out of
 * the job title alone, so the draft of a completely empty CV would
 * answer "yes".
 *
 * @param {object} source - The CV the rewrite started from.
 * @returns {boolean} True when there is something to tailor.
 */
function hasContentToTailor(source) {
  return Boolean(
    source?.summary?.trim() ||
    source?.experience?.length ||
    source?.projects?.length ||
    source?.skills?.length,
  );
}

/**
 * Adds the fewest unevidenced skills needed to clear the target score.
 *
 * This is the one place the rewrite states something the CV does not
 * support, so it is deliberately the smallest and loudest part of the
 * module:
 *
 *   - **Smallest.** Skills are added one at a time, the draft is
 *     re-scored after each, and the loop stops the instant the target is
 *     reached. A CV already over the line gets nothing added at all,
 *     which on a CV in the right field is the usual outcome — the honest
 *     steps are normally worth more than this one.
 *   - **Loudest.** What it adds comes back as `assumed`, separately from
 *     everything else, and the review screen labels each one as an
 *     assumption for the user to confirm or remove. Removing one lowers
 *     the score again, which is the behaviour that keeps the number
 *     meaningful.
 *
 * The advert's most heavily weighted skills are tried first, so if only
 * one is needed it is the one the advert cares most about.
 *
 * **The target is not always reachable, and the pass does not pretend
 * otherwise.** The match score weighs how much the CV *reads* like the
 * advert (scaled cosine similarity, 45%) as well as which skills it
 * names (coverage, 55%), so a CV from another field can cover every
 * named skill and still sit in the seventies — listing skills cannot
 * make a shop CV read like a backend advert. When the queue runs out
 * below the target the pass stops, reports `reached: false`, and the
 * caller tells the user why. Inventing experience to close that gap is
 * the one thing this module will not do.
 *
 * Scoring uses `analyseMatch` — the same analyser the match page uses —
 * rather than a private copy of the formula, so the score the rewrite
 * optimises against and the score the user is shown are the same number
 * by construction.
 *
 * @param {object} draft - The draft so far. Its skills array is replaced.
 * @param {string} jobText - The advert.
 * @param {string[]} suggested - Skills the advert wants and the CV cannot
 *   evidence, from `tailorSkills`.
 * @param {{priorJobDescriptions: string[], profile: object,
 *          record: (change: object) => void}} context
 * @returns {{assumed: string[], stillSuggested: string[], score: number,
 *            reached: boolean}}
 */
function reachTarget(draft, jobText, suggested, context) {
  const { priorJobDescriptions, profile, record, source } = context;

  let score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  const target = TAILOR_CONFIG.targetScore;

  if (score >= target || !hasContentToTailor(source)) {
    return {
      assumed: [],
      focus: [],
      stillSuggested: suggested,
      score,
      reached: score >= target,
    };
  }

  // Most-wanted first, so a single addition is the most useful one.
  const queue = [...suggested].sort((a, b) => relevanceOf(b, profile) - relevanceOf(a, profile));

  const assumed = [];

  while (queue.length > 0 && score < target && assumed.length < TAILOR_CONFIG.skills.maxAssumed) {
    const name = queue.shift();

    draft.skills = [...draft.skills, { name, level: 'Intermediate' }];
    assumed.push(name);

    score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  }

  // --- Lever two: speak the advert's language ----------------------------
  //
  // Coverage is only 55% of the score. The other 45% asks how much the CV
  // *reads* like the advert, and on a CV that already names every skill
  // the advert wants, listing more cannot move it at all — which is why
  // the first lever alone leaves some CVs stuck in the fifties.
  //
  // The lever that does move it is vocabulary: the advert's own phrases
  // for the work ("organic search", "cost per acquisition", "channel
  // performance"). Mirroring an advert's language is ordinary CV advice
  // and what every ATS rewards, but it is also the point at which this
  // module writes a line the user did not, so it is done in the open:
  // one clearly-named sentence at the end of the summary, listing the
  // terms, recorded as its own change, and sitting in the summary box
  // the user edits before saving. Nothing is slipped into their roles.
  //
  // Terms are added a few at a time and the draft re-scored after each
  // batch, so the sentence stays as short as the target allows.
  const focus = [];
  const candidates = advertVocabulary(draft, jobText, profile);

  while (candidates.length > 0 && score < target && focus.length < TAILOR_CONFIG.maxFocusTerms) {
    focus.push(...candidates.splice(0, TAILOR_CONFIG.focusBatchSize));
    draft.summary = withFocusSentence(draft.summary, focus);

    score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  }

  if (focus.length > 0) {
    record({
      section: 'summary',
      kind: 'aligned',
      after: focusSentence(focus),
      reason:
        `Added to reach a ${target}% match. These are the advert's own words for the work, ` +
        "which your CV never uses — and matching an advert's language is most of what a " +
        'screening system measures. Keep only the ones that describe work you have actually ' +
        'done, and reword the sentence so it sounds like you.',
    });
  }

  for (const name of assumed) {
    record({
      section: 'skills',
      kind: 'assumed',
      after: name,
      reason:
        `Added to reach a ${target}% match. Your CV does not mention ${name} anywhere, so ` +
        'this is an assumption, not something the rewrite found. Remove it if you do not ' +
        'have it — the score will fall, and it should.',
    });
  }

  return { assumed, focus, stillSuggested: queue, score, reached: score >= target };
}

/**
 * Words adverts use about the job advert itself rather than the work
 * ("join our team", "a plus"). They can carry TF-IDF weight, but listing
 * "Join" as a focus area for the role reads as nonsense.
 */
const ADVERT_FILLER = new Set([
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
const FOCUS_PREFIX = 'Focus for this role:';

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
function advertVocabulary(draft, jobText, profile) {
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
function displayCase(word, jobText) {
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
function capitaliseWords(words) {
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
function focusSentence(focus) {
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
function withFocusSentence(summary, focus) {
  const withoutPrevious = String(summary ?? '')
    .split(FOCUS_PREFIX)[0]
    .trim();

  return `${withoutPrevious} ${focusSentence(focus)}`.trim();
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

/**
 * Fills the page, as far as the user's own material allows.
 *
 * A rewrite that leaves half an A4 page blank has produced a document
 * that looks unfinished whatever it says, and the rest of this file had
 * no way of noticing. This step measures the draft against a page and,
 * when it falls short, pulls the levers it legitimately has — in order,
 * stopping the moment the page is full.
 *
 * The order is content first, then presentation:
 *
 *   1. **Show what is already there.** A section hidden in the settings
 *      but full of content is the cheapest thing on the page to find.
 *   2. **Let the summary run longer.** `buildSummary` normally stops at
 *      the word count the strength scorer rewards. Every sentence it
 *      could have added is built from a fact already on the CV, so
 *      raising the ceiling lengthens the summary without inventing
 *      anything — it only stops holding facts back.
 *   3. **Set the type larger.** Same words, more page. Nothing is
 *      claimed by an 11.5pt CV that was not claimed at 9.5pt.
 *
 * What it will **not** do is write experience the user does not have.
 * That is the line this whole module is built around, and a blank half
 * page is not a good enough reason to cross it: an employer reading an
 * invented paragraph is being deceived, and the candidate is the one who
 * has to defend it at interview. Where the levers run out, the step says
 * exactly what is missing and leaves the writing to the person whose CV
 * it is.
 *
 * @param {object} draft - The draft, modified in place.
 * @param {object} context - `{ source, summaryContext, record, notes }`.
 * @returns {object} The final fill estimate.
 */
function fillPage(draft, { source, summaryContext, record, notes }) {
  const before = estimateFill(draft);
  if (before.isFull) return { ...before, startRatio: before.ratio };

  // --- Lever 1: sections that are hidden but have something in them ----
  const hidden = draft.settings.hiddenSections ?? [];
  const revealed = hidden.filter(
    (key) =>
      (estimateFill({ ...draft, settings: { ...draft.settings, hiddenSections: [] } }).sections[
        key
      ] ?? 0) > 0,
  );

  if (revealed.length > 0) {
    draft.settings.hiddenSections = hidden.filter((key) => !revealed.includes(key));
    record({
      section: 'settings',
      field: 'hidden sections',
      kind: 'reordered',
      after: revealed.join(', '),
      reason:
        `Your CV fills about ${Math.round(before.ratio * 100)}% of a page, and ` +
        `${listPhrase(revealed)} ${revealed.length === 1 ? 'was' : 'were'} hidden ` +
        'despite having content. Shown again so the page is not half empty.',
    });
  }

  if (estimateFill(draft).isFull) {
    return { ...estimateFill(draft), startRatio: before.ratio };
  }

  // --- Lever 2: let the summary say everything it can source -----------
  const longer = buildSummary(source, {
    ...summaryContext,
    maxWords: PAGE_FILL_CONFIG.expandedSummaryMaxWords,
    maxSkillsNamed: PAGE_FILL_CONFIG.expandedSummarySkills,
  });

  if (longer.text && longer.text.length > (draft.summary ?? '').length) {
    const previous = draft.summary;
    const focus = focusOf(previous);
    draft.summary = focus.length > 0 ? withFocusSentence(longer.text, focus) : longer.text;

    record({
      section: 'summary',
      kind: 'replaced',
      before: previous,
      after: draft.summary,
      reason:
        'Lengthened because the page was half empty. Every extra sentence is built from ' +
        'something already on your CV — your qualification, your skills, your own ' +
        'achievement — so nothing here is invented, it is only no longer left out.',
    });
  }

  if (estimateFill(draft).isFull) {
    return { ...estimateFill(draft), startRatio: before.ratio };
  }

  // --- Lever 3: larger type --------------------------------------------
  const sizes = ['small', 'medium', 'large'];
  const startedAt = draft.settings.fontSize ?? 'medium';
  let index = Math.max(0, sizes.indexOf(startedAt));

  while (index < sizes.length - 1 && !estimateFill(draft).isFull) {
    index += 1;
    draft.settings.fontSize = sizes[index];
  }

  if (draft.settings.fontSize !== startedAt) {
    record({
      section: 'settings',
      field: 'font size',
      kind: 'replaced',
      before: startedAt,
      after: draft.settings.fontSize,
      reason:
        'Set larger so the content fills the page rather than stopping half way down. ' +
        'This changes nothing about what your CV says — change it back in the builder ' +
        'if you prefer the smaller setting.',
    });
  }

  const after = estimateFill(draft);

  // --- What is left is content, and only the user can write it ---------
  if (!after.isFull) {
    notes.push(
      `Your CV fills about ${Math.round(after.ratio * 100)}% of an A4 page. The rewrite has ` +
        'gone as far as it honestly can — it will not invent experience you do not have, so ' +
        `the rest is yours to write. ${whatWouldFillIt(draft, after)}`,
    );
  }

  return { ...after, startRatio: before.ratio };
}

/**
 * The most useful thing the user could add, given what is thin.
 *
 * Specific advice, not "add more": the sections are ranked by what a
 * reader of a CV actually misses, and the first one that is empty or
 * nearly empty is named. A prompt a user can act on in a minute is worth
 * more than an accurate description of the problem.
 *
 * @param {object} draft - The draft as it stands.
 * @param {object} fill - Its fill estimate.
 * @returns {string} One sentence of advice.
 */
function whatWouldFillIt(draft, fill) {
  const roles = (draft.experience ?? []).length;
  const thinRoles = (draft.experience ?? []).filter(
    (role) => (role?.achievements ?? []).filter(Boolean).length < 2,
  );

  if (roles === 0) {
    return 'Adding a role, or a project you built, would fill most of what is missing.';
  }

  if (thinRoles.length > 0) {
    const named = thinRoles[0].position || 'your most recent role';
    return (
      `Two or three more bullet points under ${named} — what you did, and what changed ` +
      'because you did it — would fill most of it.'
    );
  }

  if ((draft.projects ?? []).length === 0) {
    return 'A projects section is usually the quickest way to fill the rest.';
  }

  if ((draft.certifications ?? []).length === 0) {
    return 'Certifications or training would fill some of the rest.';
  }

  return `About ${Math.ceil(fill.shortfallLines)} more lines of content would fill it.`;
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
function focusOf(summary) {
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
