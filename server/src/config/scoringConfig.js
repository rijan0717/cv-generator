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
