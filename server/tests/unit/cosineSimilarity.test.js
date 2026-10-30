import { describe, it, expect } from 'vitest';
import cosineSimilarity, { dotProduct, magnitude } from '../../src/algorithms/cosineSimilarity.js';

/**
 * Tests for the cosine similarity between two sparse term vectors.
 *
 *   cos(A, B) = (A · B) / (||A|| × ||B||)
 *
 * The claim the report makes in section 3.3 is that measuring the *angle*
 * rather than the distance is what makes a short CV comparable with a long
 * one. The scale-invariance test below is that claim, checked: doubling
 * every weight in a vector must not change the result at all.
 */

/** Builds a vector from pairs, to keep the tests readable. */
function vector(entries) {
  return new Map(entries);
}

describe('dotProduct', () => {
  it('sums the products of the terms present in both', () => {
    // 2*4 + 3*5 = 23. "sql" is in neither pair, so it contributes nothing.
    const a = vector([
      ['react', 2],
      ['node', 3],
    ]);
    const b = vector([
      ['react', 4],
      ['node', 5],
      ['sql', 9],
    ]);

    expect(dotProduct(a, b)).toBe(23);
  });

  it('is zero when the vectors share no terms', () => {
    expect(dotProduct(vector([['react', 1]]), vector([['excel', 1]]))).toBe(0);
  });

  it('gives the same answer whichever way round the arguments go', () => {
    const a = vector([
      ['react', 2],
      ['node', 3],
    ]);
    const b = vector([['react', 4]]);

    expect(dotProduct(a, b)).toBe(dotProduct(b, a));
  });

  it('is zero against an empty vector', () => {
    expect(dotProduct(vector([['react', 1]]), vector([]))).toBe(0);
  });
});

describe('magnitude', () => {
  it('is the square root of the sum of the squares', () => {
    // sqrt(3² + 4²) = 5
    expect(
      magnitude(
        vector([
          ['a', 3],
          ['b', 4],
        ]),
      ),
    ).toBeCloseTo(5, 10);
  });

  it('is zero for an empty vector', () => {
    expect(magnitude(vector([]))).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for two identical vectors', () => {
    const a = vector([
      ['react', 0.5],
      ['node', 0.2],
    ]);

    expect(cosineSimilarity(a, new Map(a))).toBeCloseTo(1, 10);
  });

  it('is 0 when the vectors share no terms', () => {
    const cv = vector([
      ['react', 1],
      ['node', 1],
    ]);
    const job = vector([
      ['welding', 1],
      ['forklift', 1],
    ]);

    expect(cosineSimilarity(cv, job)).toBe(0);
  });

  /**
   * The whole reason for using the angle. A CV twice as long has larger
   * weights throughout, and Euclidean distance would mark it down for
   * that alone. The angle is unchanged, so the score is too.
   */
  it('ignores magnitude: scaling a vector does not change the score', () => {
    const job = vector([
      ['react', 0.4],
      ['node', 0.3],
      ['sql', 0.1],
    ]);
    const cv = vector([
      ['react', 0.2],
      ['node', 0.1],
    ]);
    const doubled = vector([
      ['react', 0.4],
      ['node', 0.2],
    ]);

    expect(cosineSimilarity(cv, job)).toBeCloseTo(cosineSimilarity(doubled, job), 10);
  });

  it('scores a partial overlap between 0 and 1', () => {
    const a = vector([
      ['react', 1],
      ['node', 1],
    ]);
    const b = vector([
      ['react', 1],
      ['sql', 1],
    ]);

    const score = cosineSimilarity(a, b);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    // One shared term out of two in each: 1 / (√2 × √2) = 0.5
    expect(score).toBeCloseTo(0.5, 10);
  });

  it('rates the closer of two candidates higher', () => {
    const job = vector([
      ['react', 0.5],
      ['node', 0.4],
      ['sql', 0.1],
    ]);
    const strong = vector([
      ['react', 0.5],
      ['node', 0.4],
    ]);
    const weak = vector([
      ['sql', 0.1],
      ['excel', 0.9],
    ]);

    expect(cosineSimilarity(strong, job)).toBeGreaterThan(cosineSimilarity(weak, job));
  });

  /**
   * An empty vector has no direction, so there is no angle to measure.
   * Returning 0 rather than NaN matters: a NaN would propagate silently
   * through the weighted match score and surface as a blank percentage.
   */
  it('returns 0 rather than NaN for an empty vector', () => {
    expect(cosineSimilarity(vector([]), vector([['react', 1]]))).toBe(0);
    expect(cosineSimilarity(vector([['react', 1]]), vector([]))).toBe(0);
    expect(cosineSimilarity(vector([]), vector([]))).toBe(0);
  });

  it('returns 0 for a missing vector rather than throwing', () => {
    expect(cosineSimilarity(undefined, vector([['react', 1]]))).toBe(0);
    expect(cosineSimilarity(null, null)).toBe(0);
  });

  it('returns 0 when every weight is zero', () => {
    // A zero vector has zero magnitude, which would divide by zero.
    expect(cosineSimilarity(vector([['react', 0]]), vector([['react', 0]]))).toBe(0);
  });

  it('never returns more than 1, despite floating-point error', () => {
    const a = vector([
      ['x', 0.1 + 0.2],
      ['y', 0.3],
    ]);

    expect(cosineSimilarity(a, new Map(a))).toBeLessThanOrEqual(1);
  });

  it('is symmetric', () => {
    const a = vector([
      ['react', 0.5],
      ['node', 0.2],
    ]);
    const b = vector([
      ['react', 0.3],
      ['sql', 0.6],
    ]);

    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});
