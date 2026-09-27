/**
 * Cosine similarity between two sparse term vectors, written from scratch.
 *
 * Once a CV and a job description are TF-IDF vectors, the question is how
 * alike they are. Cosine similarity answers it by measuring the **angle**
 * between the two vectors rather than the distance between their points:
 *
 *   cos(A, B) = (A · B) / (||A|| × ||B||)
 *
 * The angle is the right thing to measure here, and the reason is length.
 * A two-page CV has larger values throughout than a half-page one simply
 * because it contains more words. Euclidean distance would call the short
 * CV a poor match for that reason alone. The angle ignores magnitude
 * entirely and asks only whether the two documents emphasise the same
 * terms in the same proportions — which is exactly the question being
 * asked.
 *
 * The result runs from 0 (nothing in common) to 1 (identical
 * proportions). TF-IDF weights are never negative, so it cannot go below
 * zero.
 *
 * The vectors are Maps rather than arrays because they are sparse: a
 * vocabulary of thousands of terms, of which any one document uses a few
 * dozen. Iterating the smaller Map keeps the dot product proportional to
 * the terms actually present rather than to the size of the vocabulary.
 */

/**
 * The dot product of two sparse vectors.
 *
 * Only terms present in both contribute, so the smaller vector is
 * iterated and the larger one looked up.
 *
 * @param {Map<string, number>} a - First vector.
 * @param {Map<string, number>} b - Second vector.
 * @returns {number} The dot product.
 */
export function dotProduct(a, b) {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];

  let total = 0;
  for (const [term, weight] of smaller) {
    const other = larger.get(term);
    if (other !== undefined) total += weight * other;
  }

  return total;
}

/**
 * The Euclidean length (L2 norm) of a vector.
 * @param {Map<string, number>} vector - The vector.
 * @returns {number} Its magnitude.
 */
export function magnitude(vector) {
  let sumOfSquares = 0;
  for (const weight of vector.values()) {
    sumOfSquares += weight * weight;
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * Cosine similarity between two vectors.
 *
 * An empty vector has no direction, so there is no angle to measure. That
 * returns 0 rather than NaN: an empty CV genuinely matches nothing, and a
 * NaN would propagate silently into the final score.
 *
 * @param {Map<string, number>} a - First vector.
 * @param {Map<string, number>} b - Second vector.
 * @returns {number} Similarity from 0 to 1.
 */
export function cosineSimilarity(a, b) {
  if (!a?.size || !b?.size) return 0;

  const magnitudeA = magnitude(a);
  const magnitudeB = magnitude(b);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  const similarity = dotProduct(a, b) / (magnitudeA * magnitudeB);

  // Floating-point arithmetic can push the result a fraction past 1.
  // Clamping keeps a percentage from ever reading 100.0000001%.
  return Math.min(1, Math.max(0, similarity));
}

export default cosineSimilarity;
