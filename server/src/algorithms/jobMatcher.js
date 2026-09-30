/**
 * CV–Job Match Analyser — the ATS simulation.
 *
 * An applicant tracking system reads a CV and a job advert as two bags of
 * words and decides how alike they are. This module does the same thing,
 * and does it with our own code: the text pipeline, the TF-IDF weighting
 * and the cosine similarity are all in `algorithms/`, and nothing here
 * calls an NLP library.
 *
 * The score has two halves, because one number alone would be misleading:
 *
 *   1. **Cosine similarity** over TF-IDF vectors asks *"does this CV read
 *      like this job?"* — the language, the domain, the seniority.
 *   2. **Skill coverage** asks *"does it name the specific tools the
 *      advert asks for?"*
 *
 * Either on its own can be fooled. A CV stuffed with the right keywords
 * but describing unrelated work scores well on coverage and badly on
 * similarity; a CV in the right field that never names a tool does the
 * reverse. Combining them (weights in `config/scoringConfig.js`) is what
 * makes the result hard to game.
 *
 * Everything here is pure: a CV and some text in, a result object out. No
 * database, no network. The controller supplies the corpus.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATCH_CONFIG } from '../config/scoringConfig.js';
import { processText, cvToText, normaliseText, tokenise, stem } from './textProcessor.js';
import { documentFrequency, tfidfVector, topTerms } from './tfidf.js';
import { cosineSimilarity } from './cosineSimilarity.js';
import { findSkills, canonicalSkill } from '../data/skillsDictionary.js';

/**
 * The seed adverts, read from disk rather than imported.
 *
 * `import ... with { type: 'json' }` would be shorter, but it is newer
 * than the ECMAScript version the project's linter is configured for.
 * Reading the file is plain, portable and does the same thing once.
 *
 * @type {Array<{title: string, field: string, text: string}>}
 */
const seedJobDescriptions = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/seedJobDescriptions.json'),
    'utf8',
  ),
);

/**
 * The seed corpus, processed once when the module loads.
 *
 * TF-IDF needs a corpus to decide which words are ordinary and which are
 * distinctive, and that corpus has to exist before the first user ever
 * runs an analysis. The ~30 sample adverts in `data/seedJobDescriptions.json`
 * are that starting point; real adverts analysed later are added to it by
 * the caller, so the weights improve as the system is used.
 *
 * Processing them on every request would repeat the same work for every
 * user, so it is done once at module load.
 *
 * @type {string[][]}
 */
const SEED_DOCUMENTS = seedJobDescriptions.map((entry) => processText(entry.text));

/**
 * Maps stemmed terms back to a readable word.
 *
 * The pipeline stems, so the job's strongest terms come out as "manag",
 * "develop" and "respons". Showing those to a user would be nonsense, so
 * this records the surface form each stem came from and reports that
 * instead.
 *
 * Where several words share a stem, the shortest is kept. That gives the
 * base word whenever the base word survives stemming unchanged ("test"
 * from "test, tested, testing"), and the least inflected form otherwise
 * ("managing" rather than "management" for the stem "manag"). It is a
 * display choice only — the matching itself is always done on the stem.
 *
 * @param {string} text - The raw text the terms came from.
 * @returns {Map<string, string>} Stem to the word it will be shown as.
 */
export function buildSurfaceForms(text) {
  const forms = new Map();

  for (const token of tokenise(normaliseText(text))) {
    const stemmed = stem(token);
    const existing = forms.get(stemmed);
    if (!existing || token.length < existing.length) {
      forms.set(stemmed, token);
    }
  }

  return forms;
}

/**
 * Words that are never worth reporting as a keyword gap.
 *
 * These are not stop words: they survive the stop-word list, and they
 * genuinely carry TF-IDF weight, because on a corpus this size a word
 * appearing in one advert and no other looks distinctive whatever it
 * means. But "this advert uses the word *eye* and yours does not" is not
 * advice anybody can act on.
 *
 * So they are filtered **at reporting time only**. The vectors, the
 * similarity and the score are all computed with them still in, which
 * matters: they do describe the advert's tone, and removing them would
 * change the score to make a display problem go away. This hides them
 * from the suggestion list and nothing else.
 */
const UNACTIONABLE_WORDS = new Set(
  [
    // Describing the vacancy rather than the work
    'job',
    'role',
    'vacancy',
    'position',
    'candidate',
    'applicant',
    'apply',
    'application',
    'salary',
    'benefit',
    'opportunity',
    'join',
    'hiring',
    'looking',
    'seeking',
    'require',
    'required',
    'prefer',
    'preferred',
    'essential',
    'desirable',
    'advantage',
    'welcome',
    'expect',
    'expected',
    // Describing a person in the abstract
    'experience',
    'year',
    'skill',
    'ability',
    'able',
    'knowledge',
    'strong',
    'good',
    'excellent',
    'confident',
    'willing',
    'eager',
    'keen',
    'friendly',
    'busy',
    'hardworking',
    'person',
    'people',
    'colleague',
    'eye',
    'habit',
    // Filler that says nothing about the work
    'work',
    'working',
    'company',
    'business',
    'day',
    'time',
    'full',
    'part',
    'end',
    'new',
    'high',
    'level',
    'feature',
    'thing',
    'way',
    'know',
    'finished',
    'readable',
    'actually',
    'simply',
    'directly',
    'closely',
    'matter',
    'want',
    'need',
    'help',
    'make',
    'take',
    'come',
    'see',
    'give',
  ].map(stem),
);

/**
 * Turns a raw cosine similarity into a figure worth showing a user.
 *
 * Two documents of different kinds never score highly against each other:
 * a CV is written in the first person about the past, an advert in the
 * second person about the future. A genuinely strong match sits somewhere
 * around 0.15–0.35 raw, so reporting the raw value would tell almost
 * every user their CV is hopeless.
 *
 * This maps the realistic band (floor to ceiling in MATCH_CONFIG) onto
 * 0–1 linearly. The raw value is returned alongside it and stored, so the
 * scaling is visible rather than hidden.
 *
 * @param {number} raw - Cosine similarity, 0 to 1.
 * @returns {number} The scaled value, 0 to 1.
 */
export function scaleSimilarity(raw) {
  const { floor, ceiling } = MATCH_CONFIG.similarityScaling;

  if (raw <= floor) return 0;
  if (raw >= ceiling) return 1;

  return (raw - floor) / (ceiling - floor);
}

/**
 * Combines the two measures into the headline score out of 100.
 *
 * Shared by the full analysis and the board's quick scoring, so the
 * number a user sees on a job card can never disagree with the number
 * they see when they open the analysis.
 *
 * @param {number} scaledSimilarity - Scaled cosine similarity, 0 to 1.
 * @param {number|null} skillCoverage - Coverage, or null when the advert
 *   named no skill the dictionary knows.
 * @returns {number} The score, 0 to 100.
 */
function combineScore(scaledSimilarity, skillCoverage) {
  const { weights, coverageCap } = MATCH_CONFIG;

  // With no known skill in the advert there is nothing to cover, so
  // similarity carries the whole score rather than the user being
  // punished for a gap in our dictionary.
  if (skillCoverage === null) return Math.round(scaledSimilarity * 100);

  const weighted =
    (scaledSimilarity * weights.cosineSimilarity + skillCoverage * weights.skillCoverage) * 100;

  // The cap: naming none of the advert's tools limits the score to
  // `base`, however well the CV reads, and the limit lifts to 100 as
  // coverage does. It can only ever lower the weighted score.
  const cap = coverageCap.base + (100 - coverageCap.base) * skillCoverage;

  return Math.round(Math.min(weighted, cap));
}

/**
 * The words used to describe a score.
 * @param {number} score - The match score out of 100.
 * @returns {string} A band label such as "Strong match".
 */
export function matchBand(score) {
  const band = MATCH_CONFIG.bands.find((entry) => score >= entry.min);
  return band ? band.label : 'Poor match';
}

/**
 * Collects the skills named in a CV's skills section.
 *
 * Deliberately the skills section alone, not the whole CV. Coverage is
 * meant to answer "would a recruiter scanning your skills list see what
 * the advert asked for?", and a tool mentioned once inside a paragraph
 * three jobs ago does not pass that test. Where it *is* mentioned
 * elsewhere the analysis says so separately, as a suggestion.
 *
 * @param {object} cv - A CV document.
 * @returns {Set<string>} Canonical skill names.
 */
export function skillsFromSection(cv) {
  const named = new Set();

  for (const skill of cv?.skills ?? []) {
    const canonical = canonicalSkill(skill?.name);
    if (canonical) named.add(canonical);
  }

  return named;
}

/**
 * Builds the advice shown under the score.
 *
 * Suggestions are ordered by how much they would change the outcome:
 * missing skills first, because adding a tool the user genuinely has is
 * the cheapest possible fix, then wording, then length.
 *
 * @param {object} facts - What the analysis found.
 * @returns {string[]} Suggestions, most useful first.
 */
function buildSuggestions({
  missingSkills,
  mentionedButNotListed,
  missingKeywords,
  scaledSimilarity,
  cvTermCount,
}) {
  const suggestions = [];

  if (mentionedButNotListed.length > 0) {
    suggestions.push(
      `You describe ${mentionedButNotListed.slice(0, 3).join(', ')} in your experience but ` +
        'do not list it in your skills section. An ATS reads that section first — add it.',
    );
  }

  if (missingSkills.length > 0) {
    suggestions.push(
      `This advert asks for ${missingSkills.slice(0, 5).join(', ')}, which your CV does not ` +
        'mention. Add the ones you genuinely have, and consider learning the rest.',
    );
  }

  if (missingKeywords.length > 0) {
    suggestions.push(
      `Words this advert leans on that your CV never uses: ${missingKeywords
        .slice(0, 6)
        .join(', ')}. Where they describe work you have actually done, use the advert's wording.`,
    );
  }

  if (scaledSimilarity < 0.4) {
    suggestions.push(
      'Your CV reads quite differently from this advert. Rewrite your summary and your most ' +
        'recent role in the language the advert uses.',
    );
  }

  if (cvTermCount < 80) {
    suggestions.push(
      'There is very little text in this CV for an ATS to read. Fuller descriptions of what ' +
        'you did in each role would give it more to match on.',
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('This CV covers the advert well. No specific gaps were found.');
  }

  return suggestions;
}

/**
 * Analyses one CV against one job description.
 *
 * The six steps, in order:
 *
 *   1. Process both texts into terms (lowercase, protect technical terms,
 *      strip punctuation, tokenise, remove stop words, stem, add bigrams).
 *   2. Build the corpus — the seed adverts plus any real adverts the
 *      caller passes in — and take its document frequencies.
 *   3. Weight both documents with TF-IDF against that corpus.
 *   4. Cosine similarity between the two vectors, then scale it.
 *   5. Keyword gap: the advert's highest-weighted terms, split into those
 *      the CV uses and those it does not.
 *   6. Skill coverage from the dictionary, then combine into one score.
 *
 * @param {object} cv - The CV document being analysed.
 * @param {string} jobDescription - The advert text.
 * @param {{priorJobDescriptions?: string[]}} [options] - Adverts analysed
 *   previously, which the caller loads from the database to grow the corpus.
 * @returns {object} The full analysis.
 */
export function analyseMatch(cv, jobDescription, options = {}) {
  const { priorJobDescriptions = [] } = options;

  // --- Step 1: process both documents ------------------------------------
  const jobText = String(jobDescription ?? '');
  const cvText = cvToText(cv ?? {});

  const jobTerms = processText(jobText);
  const cvTerms = processText(cvText);

  // --- Step 2: the corpus -------------------------------------------------
  // The job being analysed is part of its own corpus. Leaving it out would
  // give its terms a document frequency of zero, inflating every weight.
  const corpus = [...SEED_DOCUMENTS, ...priorJobDescriptions.map((text) => processText(text))];
  corpus.push(jobTerms);

  const df = documentFrequency(corpus);
  const totalDocuments = corpus.length;

  // --- Step 3: TF-IDF vectors --------------------------------------------
  const jobVector = tfidfVector(jobTerms, df, totalDocuments);
  const cvVector = tfidfVector(cvTerms, df, totalDocuments);

  // --- Step 4: similarity -------------------------------------------------
  const rawSimilarity = cosineSimilarity(cvVector, jobVector);
  const scaledSimilarity = scaleSimilarity(rawSimilarity);

  // --- Step 5: keyword gap ------------------------------------------------
  const surfaceForms = buildSurfaceForms(jobText);
  const cvTermSet = new Set(cvTerms);

  /**
   * Shows a term the way a human would write it. Bigrams are stored with
   * an underscore, which has to come back out.
   * @param {string} term - A stemmed term or bigram.
   * @returns {string} The display form.
   */
  const display = (term) =>
    term.includes('_') ? term.split('_').join(' ') : (surfaceForms.get(term) ?? term);

  const matchedKeywords = [];
  const missingKeywords = [];

  for (const { term, weight } of topTerms(jobVector, MATCH_CONFIG.topKeywords)) {
    // Filtered here rather than earlier, so the score is unaffected.
    if (UNACTIONABLE_WORDS.has(term)) continue;

    const entry = { keyword: display(term), weight: Math.round(weight * 10000) / 10000 };
    if (cvTermSet.has(term)) matchedKeywords.push(entry);
    else missingKeywords.push(entry);
  }

  // --- Step 6: skill coverage --------------------------------------------
  // The dictionary's aliases are whole words ("kubernetes", "javascript"),
  // so it is matched against unstemmed tokens. Passing the stemmed terms
  // here would silently lose every skill the stemmer shortens.
  const jobSkills = findSkills(jobText, tokenise(normaliseText(jobText)));
  const cvSkills = skillsFromSection(cv ?? {});
  const cvTextSkills = findSkills(cvText, tokenise(normaliseText(cvText)));

  const matchedSkills = [];
  const missingSkills = [];
  const mentionedButNotListed = [];

  for (const skill of jobSkills) {
    if (cvSkills.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
      // Named somewhere in the CV, just not in the skills section. Worth
      // separating, because the fix is one click rather than a career move.
      if (cvTextSkills.has(skill)) mentionedButNotListed.push(skill);
    }
  }

  const skillCoverage = jobSkills.size === 0 ? null : matchedSkills.length / jobSkills.size;
  const matchScore = combineScore(scaledSimilarity, skillCoverage);

  return {
    matchScore,
    band: matchBand(matchScore),

    cosineSimilarity: Math.round(rawSimilarity * 10000) / 10000,
    scaledSimilarity: Math.round(scaledSimilarity * 10000) / 10000,
    skillCoverage: skillCoverage === null ? null : Math.round(skillCoverage * 1000) / 1000,

    matchedKeywords: matchedKeywords.slice(0, MATCH_CONFIG.maxMatchedKeywords),
    missingKeywords: missingKeywords.slice(0, MATCH_CONFIG.maxMissingKeywords),

    matchedSkills,
    missingSkills,
    mentionedButNotListed,

    suggestions: buildSuggestions({
      missingSkills,
      mentionedButNotListed,
      missingKeywords: missingKeywords.map((entry) => entry.keyword),
      scaledSimilarity,
      cvTermCount: cvTerms.length,
    }),

    // Kept so the numbers in the report can be checked by hand.
    corpusSize: totalDocuments,
  };
}

/**
 * Scores one CV against many jobs at once, for the badges on the board.
 *
 * This exists for cost, not for convenience. Calling `analyseMatch` in a
 * loop would rebuild the document frequencies and re-weight the CV once
 * per job — twelve times over for a single page of the board. Here the
 * corpus is built once, the CV is weighted once, and only the per-job
 * vector changes.
 *
 * Scoring every job in the same corpus is also the more defensible
 * choice: the adverts on one page are then weighted against identical
 * document frequencies, so their scores are directly comparable. That is
 * exactly what a user does with them — they read the column and compare.
 *
 * Only the figures a badge needs are returned. A user who wants the
 * keyword gap opens the full analysis, which stores its result.
 *
 * @param {object} cv - The CV to score.
 * @param {Array<{id: string, text: string}>} jobs - The adverts.
 * @param {{priorJobDescriptions?: string[]}} [options]
 * @returns {Array<{id: string, matchScore: number, band: string,
 *                  skillCoverage: number|null}>}
 */
export function scoreJobsAgainstCV(cv, jobs, options = {}) {
  const { priorJobDescriptions = [] } = options;

  if (!jobs?.length) return [];

  const cvText = cvToText(cv ?? {});
  const cvTerms = processText(cvText);
  const cvSkills = skillsFromSection(cv ?? {});

  const jobTermLists = jobs.map((job) => processText(job.text));

  // Every advert being scored belongs in the corpus, for the same reason
  // a single analysis includes its own: a term found nowhere in the
  // corpus would otherwise be weighted as if it were unique.
  const corpus = [
    ...SEED_DOCUMENTS,
    ...priorJobDescriptions.map((text) => processText(text)),
    ...jobTermLists,
  ];

  const df = documentFrequency(corpus);
  const totalDocuments = corpus.length;

  const cvVector = tfidfVector(cvTerms, df, totalDocuments);

  return jobs.map((job, index) => {
    const jobVector = tfidfVector(jobTermLists[index], df, totalDocuments);
    const scaled = scaleSimilarity(cosineSimilarity(cvVector, jobVector));

    const jobSkills = findSkills(job.text, tokenise(normaliseText(job.text)));
    const matched = [...jobSkills].filter((skill) => cvSkills.has(skill));
    const coverage = jobSkills.size === 0 ? null : matched.length / jobSkills.size;

    const matchScore = combineScore(scaled, coverage);

    return {
      id: job.id,
      matchScore,
      band: matchBand(matchScore),
      skillCoverage: coverage === null ? null : Math.round(coverage * 1000) / 1000,
    };
  });
}

export default analyseMatch;
