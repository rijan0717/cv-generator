/**
 * TF-IDF weighting, written from scratch.
 *
 * The purpose is to decide how much each word matters. Counting words
 * alone would let common ones dominate: nearly every job description says
 * "team", so a CV matching on "team" tells us almost nothing, while a CV
 * matching on "kubernetes" tells us a great deal.
 *
 * TF-IDF expresses exactly that. A term's weight rises with how often it
 * appears in this document, and falls with how many documents in the
 * corpus contain it at all.
 *
 *   tf(t, d)  = count(t in d) / totalTerms(d)
 *   idf(t)    = ln((1 + N) / (1 + df(t))) + 1
 *   w(t, d)   = tf(t, d) * idf(t)
 *
 * The IDF formula is the **smoothed** variant, and the smoothing is not
 * cosmetic. The textbook form is `ln(N / df(t))`, which has two failures
 * that matter badly on a small corpus like ours:
 *
 *   - A term appearing in *every* document gives `ln(1) = 0`, so its
 *     weight vanishes entirely. With ~30 seed job descriptions that is
 *     easy to trigger, and a common-but-real skill would be discarded.
 *   - An unseen term gives `df = 0` and a division by zero.
 *
 * Adding 1 to the numerator and denominator avoids the division, and the
 * trailing `+ 1` guarantees every weight stays above zero. No term is ever
 * silently thrown away.
 */

/**
 * Counts how many times each term appears.
 * @param {string[]} terms - Processed terms for one document.
 * @returns {Map<string, number>} Raw counts by term.
 */
export function termCounts(terms) {
  const counts = new Map();

  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return counts;
}

/**
 * Term frequency, normalised by document length.
 *
 * Dividing by the total is what stops a long CV beating a short one purely
 * for being long: a term used twice in fifty words matters more than the
 * same term used twice in five hundred.
 *
 * @param {string[]} terms - Processed terms for one document.
 * @returns {Map<string, number>} Term frequency by term.
 */
export function termFrequency(terms) {
  const counts = termCounts(terms);
  const total = terms.length;
  const tf = new Map();

  if (total === 0) return tf;

  for (const [term, count] of counts) {
    tf.set(term, count / total);
  }

  return tf;
}

/**
 * Document frequency: in how many documents does each term appear?
 *
 * Counted once per document however often the term occurs inside it,
 * which is what "document frequency" means.
 *
 * @param {string[][]} corpus - Each document as its list of terms.
 * @returns {Map<string, number>} Document frequency by term.
 */
export function documentFrequency(corpus) {
  const df = new Map();

  for (const document of corpus) {
    for (const term of new Set(document)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  return df;
}

/**
 * Smoothed inverse document frequency for one term.
 *
 * @param {string} term - The term.
 * @param {Map<string, number>} df - Document frequencies.
 * @param {number} totalDocuments - Size of the corpus.
 * @returns {number} The IDF weight, always greater than zero.
 */
export function inverseDocumentFrequency(term, df, totalDocuments) {
  const documentsWithTerm = df.get(term) ?? 0;
  return Math.log((1 + totalDocuments) / (1 + documentsWithTerm)) + 1;
}

/**
 * Builds the TF-IDF vector for one document.
 *
 * @param {string[]} terms - The document's processed terms.
 * @param {Map<string, number>} df - Document frequencies for the corpus.
 * @param {number} totalDocuments - Size of the corpus.
 * @returns {Map<string, number>} Weight by term.
 */
export function tfidfVector(terms, df, totalDocuments) {
  const tf = termFrequency(terms);
  const vector = new Map();

  for (const [term, frequency] of tf) {
    vector.set(term, frequency * inverseDocumentFrequency(term, df, totalDocuments));
  }

  return vector;
}

/**
 * Builds TF-IDF vectors for a whole corpus in one pass.
 *
 * @param {string[][]} corpus - Each document as its list of terms.
 * @returns {{vectors: Map<string, number>[], df: Map<string, number>,
 *            totalDocuments: number}}
 */
export function buildCorpus(corpus) {
  const df = documentFrequency(corpus);
  const totalDocuments = corpus.length;

  return {
    vectors: corpus.map((terms) => tfidfVector(terms, df, totalDocuments)),
    df,
    totalDocuments,
  };
}

/**
 * Returns the highest-weighted terms in a vector.
 *
 * Used to decide which job description keywords are worth reporting as
 * matched or missing: the top terms by weight are the ones that
 * characterise the advert.
 *
 * @param {Map<string, number>} vector - A TF-IDF vector.
 * @param {number} [limit] - How many terms to return.
 * @returns {Array<{term: string, weight: number}>} Sorted, highest first.
 */
export function topTerms(vector, limit = 25) {
  return [...vector.entries()]
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
