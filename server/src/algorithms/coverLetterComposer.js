/**
 * Cover letter composer — our own module, no LLM (CLAUDE.md rules 1 and 2).
 *
 * The letter is assembled from the CV's own words. Nothing here writes a
 * claim the user did not already make: every sentence either repeats a
 * fact from the CV or is a fixed connective from `coverLetterConfig.js`.
 * Where a fact is missing the sentence is dropped and a note is returned
 * saying so, because a cover letter that overstates its writer is worse
 * than a short one.
 *
 * The method, end to end:
 *   1. Gather the facts the letter can draw on (`gatherFacts`).
 *   2. If an advert was pasted, weight it with TF-IDF so the letter leads
 *      with the experience that advert actually asks for.
 *   3. Fill four paragraph skeletons — opening, evidence, fit, close —
 *      picking for each the first variant whose placeholders can all be
 *      filled.
 *   4. Build the subject line and the sign-off.
 *   5. Return the letter together with the facts used and the notes.
 *
 * Every function is pure: no database, no network, no clock beyond the
 * one `yearsOfExperience` already uses. That keeps it unit-testable and
 * keeps the controller responsible for I/O, as elsewhere in the project.
 */
import { COVER_LETTER_CONFIG as CONFIG } from '../config/coverLetterConfig.js';
import { buildJobProfile, relevanceOf, yearsOfExperience, withArticle } from './cvTailor.js';
import { hasQuantifiedResult } from './cvStrengthScorer.js';
import { polishSentence, splitSentences, tidy } from './phraseRewriter.js';
import { normaliseText, tokenise } from './textProcessor.js';
import { findSkills } from '../data/skillsDictionary.js';

// --- Small helpers ---------------------------------------------------------

/**
 * Fills a skeleton's `{placeholders}` from a values object.
 *
 * Returns null when any placeholder has no value, which is what makes the
 * "first variant that fits" rule work: the caller tries the richest
 * skeleton first and falls through to a shorter one rather than printing
 * a sentence with a hole in it.
 *
 * @param {string} template - A skeleton from the config.
 * @param {Record<string, string|number>} values - Placeholder values.
 * @returns {string|null} The filled sentence, or null if a value is missing.
 */
export function fill(template, values) {
  let missing = false;

  const text = String(template).replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      missing = true;
      return '';
    }
    return String(value).trim();
  });

  return missing ? null : text;
}

/**
 * Picks the first skeleton in the list that can be filled.
 *
 * @param {string[]} templates - Variants, richest first.
 * @param {Record<string, string|number>} values - Placeholder values.
 * @returns {string|null} The filled sentence, or null if none fit.
 */
function firstThatFits(templates, values) {
  for (const template of templates) {
    const filled = fill(template, values);
    if (filled) return filled;
  }
  return null;
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

/**
 * Turns one CV line into a clause that can follow "I …".
 *
 * The line is first polished by `phraseRewriter` so it leads with a verb
 * in the right tense — the same rewriting the CV itself offers, reused
 * rather than reimplemented. Then the opening letter is lowered and the
 * closing full stop removed so the clause sits inside a sentence.
 *
 * An opening word in capitals is left alone: lowering "NHS" or "SQL"
 * would misspell the user's own words to satisfy our grammar.
 *
 * @param {string} line - One achievement or sentence from a description.
 * @param {{present?: boolean}} [options] - `present` for a current role.
 * @returns {string} The clause, e.g. "led a team of five engineers".
 */
export function toClause(line, options = {}) {
  const polished = polishSentence(line, options).text;
  if (!polished) return '';

  const withoutStop = polished.replace(/[.!?]+$/, '').trim();
  const [firstWord] = withoutStop.split(/\s+/);

  // Two or more capitals means an acronym, not a sentence opener.
  if (/^[A-Z]{2,}/.test(firstWord ?? '')) return withoutStop;

  return withoutStop.charAt(0).toLowerCase() + withoutStop.slice(1);
}

/**
 * The role the letter should speak from: the current one, or the latest.
 *
 * Sorted on the stored `YYYY-MM` strings, which compare correctly as
 * text, so no date parsing is needed. A role marked `isCurrent` wins
 * outright — it is the one the reader will ask about.
 *
 * @param {Array<object>} experience - The experience section.
 * @returns {object|null} The entry, or null when there is none.
 */
export function mostRecentExperience(experience = []) {
  const dated = experience.filter((entry) => entry?.company || entry?.position);
  if (dated.length === 0) return null;

  const current = dated.find((entry) => entry?.isCurrent);
  if (current) return current;

  return [...dated].sort((a, b) =>
    String(b?.startDate ?? '').localeCompare(String(a?.startDate ?? '')),
  )[0];
}

/**
 * Every line one CV entry offers as evidence.
 *
 * Achievements come before the description because the user wrote them as
 * achievements. A description is split into sentences first, since a
 * screening reader — and this composer — treats each as its own point.
 *
 * @param {object} entry - An experience or project entry.
 * @returns {string[]} Candidate lines, longest-first order preserved.
 */
function candidateLines(entry) {
  const { minPointCharacters, maxPointCharacters } = CONFIG.evidence;

  const lines = [...(entry?.achievements ?? []), ...splitSentences(entry?.description ?? '')];

  return lines
    .map((line) => tidy(line))
    .filter((line) => line.length >= minPointCharacters && line.length <= maxPointCharacters);
}

// --- Step 1: the facts -----------------------------------------------------

/**
 * Reads out of the CV everything the letter is allowed to draw on.
 *
 * Nothing is derived here beyond the years figure, which
 * `yearsOfExperience` computes from merged date ranges so that two jobs
 * held at once are not counted twice.
 *
 * @param {object} cv - A CV document or plain object.
 * @returns {{fullName: string, headline: string, years: number,
 *   skills: string[], latest: object|null, project: object|null}}
 */
export function gatherFacts(cv) {
  const personal = cv?.personal ?? {};

  // Strongest skills first, so a letter that can only name a few names
  // the ones the user rates highest. The order is the enum's order.
  const levelRank = { Expert: 0, Advanced: 1, Intermediate: 2, Beginner: 3 };
  const skills = [...(cv?.skills ?? [])]
    .filter((skill) => tidy(skill?.name))
    .sort((a, b) => (levelRank[a?.level] ?? 2) - (levelRank[b?.level] ?? 2))
    .map((skill) => tidy(skill.name));

  const projects = (cv?.projects ?? []).filter((project) => tidy(project?.name));

  return {
    fullName: tidy(personal.fullName ?? ''),
    headline: tidy(personal.headline ?? ''),
    years: yearsOfExperience(cv?.experience ?? []),
    skills,
    latest: mostRecentExperience(cv?.experience ?? []),
    project: projects[0] ?? null,
  };
}

// --- Step 2: what the advert asks for --------------------------------------

/**
 * The user's own skills that the advert also mentions.
 *
 * Matching is done on normalised text — the same normalisation the match
 * analyser uses, so "Node.js" in the CV finds "node.js" in the advert —
 * and the skill is reported in the **CV's** spelling, because that is the
 * user's own word for it.
 *
 * Skills the advert asks for but the CV does not list are deliberately
 * not returned: the letter must not claim them. The caller reports them
 * as advice instead.
 *
 * @param {string[]} skills - Skill names from the CV, strongest first.
 * @param {string} jobText - The advert.
 * @returns {string[]} The shared skills, in the CV's order.
 */
export function matchedSkills(skills, jobText) {
  if (!jobText) return [];

  // Padded with spaces so a whole-word check is a plain substring test.
  const advert = ` ${normaliseText(jobText)} `;

  return skills.filter((skill) => {
    const needle = normaliseText(skill);
    return needle.length > 1 && advert.includes(` ${needle} `);
  });
}

/**
 * Known skills the advert asks for that the CV does not list.
 *
 * This is the one place the composer looks beyond the CV, and it does so
 * only to produce advice. The gap never reaches the letter — naming a
 * skill the user has not claimed is precisely the invention this module
 * exists to avoid — but it is the most useful thing the user can be told
 * before sending.
 *
 * @param {string[]} skills - Skill names from the CV.
 * @param {string} jobText - The advert.
 * @returns {string[]} Canonical names of the skills asked for but absent.
 */
export function skillGaps(skills, jobText) {
  if (!jobText) return [];

  // `tokenise(normaliseText(…))`, the same pairing every other caller of
  // the dictionary uses. The tokeniser expects text that has already been
  // normalised and silently drops the leading letter of a capitalised
  // word if it has not been, so the two always travel together.
  const held = skills.join(' ');

  const asked = findSkills(jobText, tokenise(normaliseText(jobText)));
  const have = findSkills(held, tokenise(normaliseText(held)));

  return [...asked].filter((skill) => !have.has(skill));
}

/**
 * Orders candidate lines so the strongest evidence leads.
 *
 * A quantified line wins outright. A number is the one thing in a cover
 * letter a reader cannot argue with, and an unquantified line that merely
 * uses more of the advert's vocabulary is the weaker sentence however
 * well it matches — ranking by relevance first produced letters that led
 * with a restated job description instead of a result.
 *
 * Relevance to the advert then orders lines of equal strength, and the
 * user's own order breaks any remaining tie.
 *
 * @param {string[]} lines - Candidate lines.
 * @param {object|null} profile - The advert profile, or null.
 * @returns {string[]} The lines, best first.
 */
function rankEvidence(lines, profile) {
  return [...lines]
    .map((line, index) => ({
      line,
      index,
      quantified: hasQuantifiedResult(line) ? 1 : 0,
      relevance: profile ? relevanceOf(line, profile) : 0,
    }))
    .sort((a, b) => {
      if (b.quantified !== a.quantified) return b.quantified - a.quantified;
      if (profile && b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.index - b.index;
    })
    .map((scored) => scored.line);
}

// --- Steps 3 to 5: the letter ----------------------------------------------

/**
 * Composes a cover letter from a CV, and optionally an advert.
 *
 * @param {object} cv - The CV to write from.
 * @param {object} options - The request.
 * @param {string} options.companyName - Who the letter is to. Required.
 * @param {string} [options.jobTitle] - The role applied for.
 * @param {string} [options.jobDescription] - The advert, pasted in.
 * @param {string} [options.recipientName] - A named reader, if known.
 * @param {string[]} [options.priorJobDescriptions] - Adverts analysed
 *   before, which the controller loads to grow the TF-IDF corpus.
 * @returns {{subject: string, body: string, usedFacts: object, notes: string[]}}
 */
export function composeCoverLetter(cv, options = {}) {
  const {
    companyName = '',
    jobTitle = '',
    jobDescription = '',
    recipientName = '',
    priorJobDescriptions = [],
  } = options;

  const company = tidy(companyName);
  const title = tidy(jobTitle);
  const advert = String(jobDescription ?? '').trim();

  const facts = gatherFacts(cv);
  const notes = [];

  // Step 2: weight the advert, when there is one.
  const profile = advert ? buildJobProfile(advert, priorJobDescriptions) : null;
  if (!profile) notes.push(CONFIG.notes.noJobDescription);

  // --- Paragraph 1: opening ---
  const S = CONFIG.skeletons;
  const openingSentence =
    firstThatFits([S.opening.withTitle, S.opening.withoutTitle], { jobTitle: title, company }) ??
    '';

  let standing = '';
  if (facts.headline) {
    standing =
      firstThatFits([S.opening.standing, S.opening.standingNoYears], {
        headlineWithArticle: withArticle(facts.headline),
        years: facts.years > 0 ? `${facts.years} year${facts.years === 1 ? '' : 's'}` : '',
      }) ?? '';
  } else {
    notes.push(CONFIG.notes.noHeadline);
  }

  const opening = `${openingSentence}${standing}`.trim();

  // --- Paragraph 2: evidence ---
  const source = facts.latest ?? facts.project;
  if (!facts.latest && facts.project) notes.push(CONFIG.notes.noExperience);

  const ranked = source ? rankEvidence(candidateLines(source), profile) : [];
  const points = ranked
    .slice(0, CONFIG.evidence.maxPoints)
    .map((line) => toClause(line, { present: Boolean(facts.latest?.isCurrent) }))
    .filter(Boolean);

  let evidence = '';
  if (points.length > 0) {
    const lead = facts.latest
      ? firstThatFits([S.evidence.lead, S.evidence.leadNoEmployer], {
          position: tidy(facts.latest.position ?? ''),
          employer: tidy(facts.latest.company ?? ''),
          firstPoint: points[0],
        })
      : fill(S.evidence.projectLead, {
          projectName: tidy(facts.project?.name ?? ''),
          firstPoint: points[0],
        });

    const second = points[1] ? fill(S.evidence.second, { secondPoint: points[1] }) : '';
    evidence = `${lead ?? ''}${second ?? ''}`.trim();

    if (!ranked.some((line) => hasQuantifiedResult(line))) {
      notes.push(CONFIG.notes.noQuantifiedAchievement);
    }
  } else {
    notes.push(CONFIG.notes.noEvidence);
  }

  // --- Paragraph 3: fit ---
  const shared = matchedSkills(facts.skills, advert);
  const candidateSkills = (shared.length > 0 ? shared : facts.skills).slice(
    0,
    CONFIG.skills.maxNamed,
  );

  // Only the skills the letter actually names are reported as used; below
  // the minimum the paragraph is dropped, and claiming otherwise in
  // `usedFacts` would misdescribe the letter to the UI that shows it.
  const named = candidateSkills.length >= CONFIG.skills.minNamed ? candidateSkills : [];

  let fitParagraph = '';
  if (named.length > 0) {
    const template = shared.length > 0 ? S.fit.withAdvert : S.fit.withoutAdvert;
    fitParagraph = fill(template, { skills: listPhrase(named) }) ?? '';
    if (advert && shared.length === 0) notes.push(CONFIG.notes.noSkillOverlap);
  } else {
    notes.push(CONFIG.notes.fewSkills);
  }

  // Advice only — these never enter the letter. Capped at the same number
  // the letter would name, so the note stays readable.
  const gaps = skillGaps(facts.skills, advert).slice(0, CONFIG.skills.maxNamed);
  if (gaps.length > 0) {
    notes.push(fill(CONFIG.notes.skillGap, { terms: listPhrase(gaps) }) ?? '');
  }

  // --- Paragraph 4: close ---
  const paragraphs = [opening, evidence, fitParagraph].filter(Boolean);
  const wordsSoFar = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  const close = wordsSoFar > CONFIG.length.maxWords - 40 ? S.close.brief : S.close.standard;
  paragraphs.push(close);

  // Step 4: assemble.
  const greeting =
    fill(CONFIG.greeting.named, { recipientName: tidy(recipientName) }) ?? CONFIG.greeting.unnamed;

  const body = [greeting, '', paragraphs.join('\n\n'), '', CONFIG.signOff, facts.fullName]
    .join('\n')
    .trimEnd();

  const subject = firstThatFits(
    [
      CONFIG.subjectSkeletons.withTitleAndName,
      CONFIG.subjectSkeletons.withTitle,
      CONFIG.subjectSkeletons.withName,
      CONFIG.subjectSkeletons.fallback,
    ],
    { jobTitle: title, fullName: facts.fullName },
  ).slice(0, CONFIG.subject.maxCharacters);

  // Step 5: report on the finished length, rather than padding or cutting.
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < CONFIG.length.minWords) notes.push(CONFIG.notes.tooShort);
  if (wordCount > CONFIG.length.maxWords) notes.push(CONFIG.notes.tooLong);

  return {
    subject,
    body,
    usedFacts: {
      fullName: facts.fullName,
      headline: facts.headline,
      years: facts.years,
      employer: tidy(facts.latest?.company ?? ''),
      position: tidy(facts.latest?.position ?? ''),
      points,
      skills: named,
      matchedSkills: shared,
      skillGaps: gaps,
      wordCount,
    },
    notes: notes.filter(Boolean),
  };
}

export default composeCoverLetter;
