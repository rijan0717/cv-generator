/**
 * Summary composition for the job-tailored rewrite.
 *
 * Writes the opening paragraph from facts already on the CV: how long
 * the user has worked, what they have done, and how close that is to
 * what the advert asks for. Nothing here invents a claim.
 */

import { TAILOR_CONFIG } from '../../config/scoringConfig.js';
import { hasQuantifiedResult } from '../cvStrengthScorer.js';
import { polishSentence, tidy } from '../phraseRewriter.js';
import { relevanceOf } from './relevance.js';

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
export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Turns "2021-09" into a count of months, so two dates can be subtracted.
 * @param {string} value - A "YYYY-MM" string.
 * @returns {number|null} Months since year zero, or null if unparseable.
 */
export function monthNumber(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

/** @param {string} text @returns {number} The number of words. */
export function wordCount(text) {
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
export function phrasePicker(cv) {
  const seedText = cv.personal?.fullName || cv.title || '';
  let hash = 0;
  for (const char of seedText) hash = (hash * 31 + char.charCodeAt(0)) % 1000003;

  let calls = 0;
  return (options) => options[(hash + calls++) % options.length];
}

/**
 * Words in a job title that state seniority.
 */
export const SENIORITY_WORDS = new Set([
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
export const GENERIC_TITLE_WORDS = new Set([
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
export function sharesTitleWord(title, cv) {
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
 * The parts of a CV that are evidence of what someone actually does.
 *
 * `cvToText` is the whole document, which is right for scoring a match:
 * a screening system reads all of it. It is wrong for deciding what
 * field a CV is from, for two reasons, and both of them are the summary.
 *
 * The first is circularity. The rewrite writes the summary itself, in
 * the advert's language by design, so a draft saved from one rewrite and
 * tailored again came back reading like the advert — and was then judged
 * to be from the advert's field on the strength of a paragraph this
 * module had written for that advert. Each pass licensed a larger one.
 *
 * The second holds even for a summary the user wrote: a summary is what
 * someone says about themselves, and a sentence of ambition costs
 * nothing. Roles, projects, skills and qualifications are the part of a
 * CV that has to be true.
 *
 * @param {object} cv - The source CV.
 * @returns {string} Its evidence, as one string.
 */
export function evidenceText(cv) {
  const parts = [];

  for (const entry of cv.experience ?? []) {
    parts.push(entry?.position, entry?.company, entry?.description, ...(entry?.achievements ?? []));
  }

  for (const project of cv.projects ?? []) {
    parts.push(
      project?.name,
      project?.role,
      project?.description,
      ...(project?.technologies ?? []),
    );
  }

  for (const entry of cv.education ?? []) {
    parts.push(entry?.degree, entry?.fieldOfStudy, entry?.institution, entry?.description);
  }

  for (const cert of cv.certifications ?? []) parts.push(cert?.name, cert?.issuer);

  // Skills a previous rewrite assumed are left out: they are on the CV,
  // and the draft is scored with them, but they are not evidence of
  // anything — and letting them answer this question is how one
  // rewrite's assumptions become the licence for the next one's.
  for (const skill of cv.skills ?? []) {
    if (!skill?.assumed) parts.push(skill?.name);
  }

  return parts.filter(Boolean).join(' \n ');
}

/**
 * How close the CV already is to the advert's field.
 *
 * Everything the rewrite does honestly — re-ordering, re-wording,
 * listing evidenced skills — works on material the CV already contains,
 * so it is safe whatever the advert says: the worst case is that it
 * finds nothing to do. The two levers in `reachTarget` are different.
 * They write a skill the CV cannot evidence, and a sentence in the
 * advert's words rather than the user's, and both get *more* aggressive
 * the further the CV is from the advert — because the further it is,
 * the more work there is to do to reach the target.
 *
 * That is exactly backwards, and this function is what turns it the
 * right way round. The further the CV is from the advert, the less the
 * target pass is allowed to do; from a different field altogether, it
 * does nothing and the shortfall is reported instead.
 *
 * Distance is measured the same way everything else in this module is:
 * the share of the advert's highest-weighted vocabulary that the
 * original CV covers. A job title in common promotes a CV off the
 * bottom rung, because "Sales Assistant" applying to "Sales Executive"
 * is plainly the same field even when the two adverts word the work
 * differently.
 *
 * @param {object} source - The CV the rewrite started from.
 * @param {string} title - The (softened) advertised title.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @returns {{level: 'same'|'adjacent'|'different', overlap: number,
 *            sharesTitle: boolean, allowance: number}}
 *   `allowance` is the share of each target-pass ceiling this level may use.
 */
export function fieldFit(source, title, profile) {
  const { sameFieldOverlap, adjacentFieldOverlap, allowance } = TAILOR_CONFIG.fieldFit;

  const overlap = relevanceOf(evidenceText(source), profile);
  const shares = sharesTitleWord(title, source);

  let level;
  if (overlap >= sameFieldOverlap) level = 'same';
  else if (overlap >= adjacentFieldOverlap || shares) level = 'adjacent';
  else level = 'different';

  return { level, overlap, sharesTitle: shares, allowance: allowance[level] };
}

/**
 * The achievement most worth quoting: one that contains a number.
 *
 * @param {object} cv - The source CV.
 * @returns {string} The achievement, or an empty string if there is none.
 */
export function strongestAchievement(cv) {
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
export function listPhrase(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** @param {string} text @returns {string} The text, ending in a full stop. */
export function endWithFullStop(text) {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// --- Vocabulary ------------------------------------------------------------
