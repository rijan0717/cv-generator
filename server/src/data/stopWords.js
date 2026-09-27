/**
 * Stop words: words too common to carry meaning when comparing a CV with a
 * job description.
 *
 * Written by hand rather than imported from a library, because the project
 * requires the matching logic to be our own. The list is deliberately
 * conservative: removing too much is worse than removing too little, since
 * a word dropped here can never contribute to a match.
 *
 * Note what is **not** in the list. Words like "lead", "support", "test",
 * "design" and "manage" are ordinary English but are exactly the terms a
 * job description uses to describe the work, so they must survive.
 */

/** @type {Set<string>} */
export const STOP_WORDS = new Set([
  // Articles and determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every',
  'some', 'any', 'all', 'both', 'either', 'neither', 'such', 'no',

  // Pronouns
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose', 'which', 'what',

  // Be, have, do
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',

  // Modals
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might',
  'must', 'ought',

  // Prepositions and conjunctions
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'without', 'by', 'from',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'into', 'onto', 'upon', 'about', 'against', 'between', 'through',
  'during', 'before', 'after', 'above', 'below', 'across', 'behind',
  'and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'as', 'if',
  'than', 'then', 'while', 'where', 'when', 'why', 'how',

  // Adverbs and fillers that add no signal
  'not', 'only', 'very', 'too', 'also', 'just', 'more', 'most', 'less',
  'least', 'much', 'many', 'other', 'others', 'same', 'own', 'here',
  'there', 'now', 'ever', 'never', 'always', 'often', 'well',

  // CV and advert boilerplate
  'etc', 'eg', 'ie', 'per', 'via', 'within', 'across',
  'role', 'job', 'position', 'candidate', 'applicant', 'company',
  'please', 'apply', 'applying', 'opportunity', 'looking', 'seeking',
  'ideal', 'successful', 'preferred', 'desirable', 'essential',
  'responsibilities', 'requirements', 'duties', 'including', 'include',
  'includes', 'able', 'ability', 'work', 'working', 'years', 'year',
  'month', 'months', 'day', 'days', 'week', 'weeks', 'time', 'new',
  'good', 'strong', 'excellent', 'great', 'best', 'high', 'level',
]);

/**
 * Reports whether a token should be discarded before matching.
 *
 * Single characters and pure numbers are dropped along with the list
 * above: "5" on its own tells us nothing about whether a CV suits a job,
 * although "5" inside "5 years" is picked up separately by the strength
 * scorer when it looks for quantified achievements.
 *
 * @param {string} token - A lowercased token.
 * @returns {boolean} True when the token should be removed.
 */
export function isStopWord(token) {
  if (!token || token.length < 2) return true;
  if (/^\d+$/.test(token)) return true;
  return STOP_WORDS.has(token);
}

export default STOP_WORDS;
