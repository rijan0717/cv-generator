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
    /** Share of entries that must open with an action verb for full marks. */
    actionVerbTargetRatio: 0.7,
    /** Share of entries that must quantify something for full marks. */
    quantifiedTargetRatio: 0.5,
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
    /** At or below this, the scaled score is 0. */
    floor: 0.05,
    /** At or above this, the scaled score is 1. */
    ceiling: 0.55,
  },

  /** Bands used to describe a score in words. */
  bands: [
    { min: 80, label: 'Excellent match' },
    { min: 65, label: 'Strong match' },
    { min: 50, label: 'Moderate match' },
    { min: 30, label: 'Weak match' },
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
