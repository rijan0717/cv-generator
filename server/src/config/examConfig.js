/**
 * Every number the exam algorithms use, in one place.
 *
 * Kept together, and separate from the code that applies them, for the
 * same reason `scoringConfig.js` is: a weighting scheme has to be
 * explainable and adjustable without reading the algorithm, and a number
 * buried in a function is neither.
 */

/** Weights for choosing which questions go into a paper. */
export const PAPER_WEIGHTS = {
  /** What every eligible question starts with. */
  base: 1,

  /**
   * Added for a question the user has answered **wrongly** before.
   *
   * This is the Leitner idea in one line: a retake should return to what
   * somebody failed rather than re-ask what they already know. The bonus
   * is the largest of the three because it is the only one that makes a
   * second attempt more useful than the first.
   */
  wrongBonus: 1.5,

  /**
   * Added for a question the user has never been asked.
   *
   * Keeps a large bank in circulation. Without it the same questions
   * would surface every time, because nothing else distinguishes an
   * unseen question from one that was answered correctly long ago.
   */
  freshBonus: 0.6,

  /**
   * Subtracted for a question asked in the user's most recent attempt.
   *
   * A retake taken straight after a failure should not be the same paper
   * with the options shuffled. Floored at a small positive number rather
   * than zero, so a position with barely enough questions can still
   * build a paper.
   */
  recencyPenalty: 0.7,

  /** No weight ever falls below this, so every question stays reachable. */
  minimumWeight: 0.05,

  /**
   * What a question's weight is multiplied by once another question on
   * the same topic has been picked.
   *
   * This is what spreads a paper across a position rather than letting
   * one topic dominate. At 0.35 a second question on an already-used
   * topic needs to be nearly three times as attractive as a fresh topic
   * to beat it — strong enough to spread the paper, weak enough that a
   * bank covering only two topics still works.
   */
  topicDamping: 0.35,

  /**
   * The same idea applied to the level, for a mixed paper.
   *
   * An exam now draws from junior, mid and senior together, so without
   * this the level with the largest bank would fill most of it. Damped
   * more gently than topics — there are only three levels, so a harsher
   * factor would force an unnaturally rigid rotation.
   */
  levelDamping: 0.6,
};

/** How a finished paper is marked and reported. */
export const SCORING = {
  /** Topics at or below this percentage are reported as weak. */
  weakTopicThreshold: 50,

  /** At most this many topics are named in the suggestions. */
  maxWeakTopics: 3,
};

export default { PAPER_WEIGHTS, SCORING };
