/**
 * Every weight and threshold used by the two algorithms, in one place.
 *
 * Keeping them here rather than scattered through the code means the
 * scoring model can be explained, defended and adjusted without reading
 * the implementation — which matters for a project that has to be
 * justified in a viva.
 *
 * The completeness/quality split is 40/60 as specified: a CV that merely
 * has every section filled in is not a good CV, so most of the marks are
 * reserved for how well it is written.
 */

/** CV Strength Score: 40 points for completeness, 60 for content quality. */
export const STRENGTH_CONFIG = {
  completeness: {
    /** Name, headline, email and phone all present. */
    personalDetails: 8,
    /** A photo has been uploaded. */
    photo: 3,
    /** A professional summary exists. */
    summary: 7,
    /** At least one education entry. */
    education: 6,
    /** At least one experience entry or project. */
    experienceOrProject: 8,
    /** At least MIN_SKILLS skills listed. */
    skills: 5,
    /** At least one link or a postal address. */
    contactChannels: 3,
  },

  quality: {
    /** Summary length within the target word range. */
    summaryLength: 10,
    /** Experience and project descriptions start with action verbs. */
    actionVerbs: 14,
    /** Achievements contain numbers, percentages or amounts. */
    quantifiedAchievements: 14,
    /** Email and phone are plausibly formatted. */
    contactFormat: 6,
    /** No end date falls before its start date. */
    dateConsistency: 6,
    /** Descriptions are neither too short nor too long. */
    descriptionDepth: 10,
  },

  /**
   * The foundation gate.
   *
   * Without this, a brand-new CV scores well into double figures before
   * the user has typed anything: the builder copies the account name and
   * email in, which earns part of the personal-details mark and the email
   * half of the contact-format mark. Thirteen out of a hundred for an
   * empty form is flattery, and it makes the number useless as a measure
   * of progress.
   *
   * So the earned total is scaled by how much of a CV actually exists.
   * The four components below are what makes a document a CV at all; with
   * none of them present the score is scaled to a tenth, and it rises
   * linearly to full weight once all four are there.
   *
   * It scales rather than zeroes so the score still moves as soon as the
   * user does something, which is the point of showing it while they
   * type.
   */
  foundation: {
    /** Scale applied when none of the four components exist. */
    minFactor: 0.1,
  },

  thresholds: {
    /** Skills needed for full marks on the skills criterion. */
    minSkills: 5,
    /** Target word count for the professional summary. */
    summaryMinWords: 30,
    summaryMaxWords: 120,
    /** Words below which a description is too thin to be useful. */
    descriptionMinWords: 12,
    /** Words above which a description has become an essay. */
    descriptionMaxWords: 120,
    /**
     * Share of entries that must open with an action verb for full marks.
     * Raised from 0.7: on a two-role CV, 0.7 meant one good line carried
     * the criterion.
     */
    actionVerbTargetRatio: 0.8,
    /**
     * Share of entries that must quantify something for full marks.
     * Raised from 0.5, which gave full marks for quantifying half of what
     * you did — a low bar for the criterion that separates a strong CV
     * from a list of duties.
     */
    quantifiedTargetRatio: 0.65,
  },
};

/**
 * CV–Job Match Analyser.
 *
 * The overall score combines two measures that answer different
 * questions. Cosine similarity asks "does this CV read like this job?",
 * covering language, seniority and domain. Skill coverage asks "does it
 * name the specific tools the advert asks for?".
 *
 * Skill coverage is weighted slightly higher (55/45) because a missing
 * named tool is the concrete, actionable gap — it is something the
 * candidate can go and fix, whereas similarity is diffuse. The split is
 * close to even because neither alone is sufficient: a CV stuffed with
 * the right keywords but describing unrelated work should not score well,
 * and that is precisely what similarity catches.
 */
export const MATCH_CONFIG = {
  weights: {
    cosineSimilarity: 0.45,
    skillCoverage: 0.55,
  },

  /** How many of the job's highest-weighted terms to report on. */
  topKeywords: 25,

  /** Keywords reported back to the user, matched and missing. */
  maxMatchedKeywords: 20,
  maxMissingKeywords: 15,

  /**
   * Cosine similarity between two documents of different kinds is
   * naturally low — a CV is written in the first person about the past,
   * an advert in the second person about the future. Raw values of
   * 0.15 to 0.35 are typical for a genuinely good match, so reporting
   * them unscaled would tell every user their CV is terrible.
   *
   * This maps the realistic range onto 0–1 so the reported figure is
   * meaningful. The raw value is stored alongside it, so nothing is
   * hidden.
   */
  similarityScaling: {
    /**
     * At or below this, the scaled score is 0. Raised from 0.05: two
     * unrelated documents in the same language still share enough ordinary
     * vocabulary to clear 0.05, so that floor handed out points for
     * nothing.
     */
    floor: 0.08,
    /**
     * At or above this, the scaled score is 1. Raised from 0.55 so that
     * full marks mean the CV really does read like the advert.
     */
    ceiling: 0.62,
  },

  /**
   * A ceiling tied to skill coverage.
   *
   * The weighted sum alone lets a CV that names none of the advert's
   * tools still reach the mid-forties on similarity, because it talks
   * about the same kind of work in the same kind of language. No
   * screening system would agree: the named requirements are the part it
   * checks hardest.
   *
   * So the score is capped at `base` when coverage is zero, rising to 100
   * at full coverage. It only ever lowers a score — a CV that covers the
   * skills is unaffected — and it applies solely when the advert names
   * skills the dictionary recognises.
   */
  coverageCap: {
    /** Highest score allowed when none of the named skills appear. */
    base: 45,
  },

  /**
   * Bands used to describe a score in words.
   *
   * Each raised by five points, so "Strong match" now means what it says.
   */
  bands: [
    { min: 85, label: 'Excellent match' },
    { min: 70, label: 'Strong match' },
    { min: 55, label: 'Moderate match' },
    { min: 35, label: 'Weak match' },
    { min: 0, label: 'Poor match' },
  ],
};

/**
 * Totals, derived rather than written down, so they cannot drift out of
 * step with the weights above.
 */
export const STRENGTH_TOTALS = {
  completeness: Object.values(STRENGTH_CONFIG.completeness).reduce((a, b) => a + b, 0),
  quality: Object.values(STRENGTH_CONFIG.quality).reduce((a, b) => a + b, 0),
};

STRENGTH_TOTALS.overall = STRENGTH_TOTALS.completeness + STRENGTH_TOTALS.quality;

/**
 * The page-fill model, used by `algorithms/pageFill.js`.
 *
 * A tailored CV that stops half way down the page looks unfinished
 * whatever it says. These numbers let the rewrite notice that and do
 * something about it, and they live here so the model can be explained
 * and adjusted in one place rather than hidden in the measurement code.
 *
 * The geometry is real: A4 is 297mm tall, the templates use a 20mm
 * margin, and a point is 0.3528mm. The rest are estimates calibrated
 * against the five templates at their default settings.
 */
export const PAGE_FILL_CONFIG = {
  /** 297mm of page less the top and bottom margins the templates use. */
  usableHeightMm: 257,

  /** Millimetres per typographic point. Fixed by definition. */
  pointToMm: 0.3528,

  /** The line height the templates set on body text. */
  lineHeight: 1.45,

  /**
   * Body size per font-size setting, matching `FONT_SIZES` in
   * `client/src/templates/templateUtils.js`. The two must agree: if the
   * client renders at a size the server did not measure, the fill
   * estimate describes a page nobody is looking at.
   */
  fontSizePt: { small: 9.5, medium: 10.5, large: 11.5 },

  /**
   * Roughly how many words fit on a line of prose, per font size. Words
   * rather than characters, because the six fonts on offer differ enough
   * in width that character counting would only look more precise.
   */
  wordsPerLine: { small: 15, medium: 13, large: 12 },

  /** Extra lines the gap above a section heading is worth. */
  spacingLines: { compact: 0.5, normal: 0.85 },

  /** The gap between two entries of the same section, in lines. */
  entryGapLines: 0.4,

  /** Contact details that fit on one line under the name. */
  contactPerLine: 3,

  /** Skills or languages that fit on one line as chips. */
  chipsPerLine: 4,

  /**
   * Templates that put some sections in a side column, and which ones.
   *
   * It changes the arithmetic completely. In a single-column template the
   * page is as tall as the sum of its sections; in these two it is as
   * tall as the *taller column*, because the sidebar sits beside the main
   * content rather than under it. Treating a two-column CV as one column
   * overstates how full the page is by however much is in the sidebar —
   * which is exactly the case this whole model exists to catch.
   *
   * Taken from `SIDEBAR_SECTIONS` in `ModernTemplate.jsx` and
   * `RAIL_SECTIONS` in `ExecutiveTemplate.jsx`. If a template's layout
   * changes, this changes with it.
   */
  sideColumns: {
    modern: ['skills', 'languages', 'certifications'],
    executive: ['education', 'skills', 'languages', 'certifications'],
  },

  /**
   * How full a page should be before the rewrite stops trying to fill it.
   *
   * Not 1.0. A CV ending exactly at the bottom margin is a CV one word
   * away from spilling onto a second page, and the user is about to edit
   * it. Nine tenths reads as a full page with room to type.
   */
  targetRatio: 0.9,

  /**
   * The most the summary may grow to when the page is short.
   *
   * Every sentence in it is built from a fact already on the CV, so a
   * longer one invents nothing — but a summary that runs past this stops
   * being a summary. When this is not enough to fill the page, the honest
   * answer is that the CV needs more content, which is what the rewrite
   * then says.
   */
  expandedSummaryMaxWords: 110,

  /** Skills the expanded summary may name, up from the usual six. */
  expandedSummarySkills: 10,
};

/**
 * Job-Tailored CV Rewrite.
 *
 * The rewrite never invents experience. Everything it writes is assembled
 * from facts already in the user's CV, re-ordered and re-worded against
 * the advert's own vocabulary. These numbers decide how far it goes.
 */
export const TAILOR_CONFIG = {
  /**
   * How many of the advert's highest-weighted terms are used when
   * measuring how relevant a single CV entry is.
   *
   * The whole job vector would work too, but its long tail is mostly
   * noise on a corpus this size: a word used once in one advert carries
   * real weight, and letting it decide whether a role is relevant makes
   * the ordering look arbitrary. The top slice is the part that actually
   * describes the job.
   */
  relevanceTerms: 60,

  summary: {
    /**
     * The generated summary aims for this range, which is the same range
     * the strength scorer rewards. Writing to a different target would
     * mean the tailor and the scorer disagreed about a good summary.
     */
    minWords: STRENGTH_CONFIG.thresholds.summaryMinWords,
    maxWords: STRENGTH_CONFIG.thresholds.summaryMaxWords,

    /** Skills named in the opening sentences. More reads as a list. */
    maxSkillsNamed: 6,
  },

  skills: {
    /**
     * Skills the advert asks for that the CV proves elsewhere but does
     * not list. These are added automatically, because the evidence is
     * already in the user's own words. Capped so a broad advert cannot
     * flood the section.
     */
    maxAutoAdded: 8,

    /**
     * Skills the advert asks for that appear nowhere in the CV. These
     * are only ever *suggested* — adding them automatically would be
     * putting words in the user's mouth about what they can do.
     */
    maxSuggested: 10,

    /**
     * How many unevidenced skills the target pass below may assume.
     *
     * A hard ceiling on the one part of the rewrite that states
     * something the CV does not support. Six is enough to rescue a
     * near-miss; beyond that the honest answer is that the CV does not
     * fit the advert, and no amount of re-ordering changes that.
     */
    maxAssumed: 6,
  },

  /**
   * The match score the rewrite aims for.
   *
   * On a CV in the right field this is reached without the target pass
   * doing anything: re-ordering, re-wording and listing the skills the
   * CV already evidences is usually worth thirty or forty points on its
   * own. The pass exists for the case where it is not enough.
   *
   * When it is not, the rewrite adds the smallest number of the
   * advert's remaining skills that gets over the line, **one at a time,
   * re-scoring after each**, and stops the moment it is there. Every
   * skill added this way is reported separately from the rest and
   * labelled in the UI as assumed, because it is the only thing the
   * rewrite puts on a CV that the CV does not already support. The user
   * removes any they do not have, and the score falls again — which is
   * the honest behaviour.
   */
  targetScore: 80,

  /**
   * The ceiling on the alignment sentence (lever two of `reachTarget`).
   *
   * Twelve of the advert's words is already a long sentence; past that
   * it stops reading as a line on a CV and starts reading as a list of
   * keywords, which is the thing the match analyser exists to catch.
   */
  maxFocusTerms: 12,

  /**
   * How many terms are added between re-scores. One at a time would be
   * a dozen extra analyses per request for a point or two of precision
   * in a sentence the user is about to edit anyway.
   */
  focusBatchSize: 3,

  /**
   * Sections that may be re-ordered by relevance.
   *
   * `summary` is excluded because it belongs at the top whatever it
   * says, and `references` because it belongs at the bottom. The rest
   * are ordered by how much of the advert they speak to.
   */
  reorderableSections: ['experience', 'projects', 'skills', 'education', 'certifications'],

  /**
   * How much more relevant one section must be than another before they
   * are swapped.
   *
   * Without a margin, two sections that are effectively equal swap places
   * on a rounding difference, which looks like the feature misbehaving.
   */
  sectionSwapMargin: 0.02,
};
