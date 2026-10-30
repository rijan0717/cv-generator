import { describe, it, expect } from 'vitest';
import {
  termCounts,
  termFrequency,
  documentFrequency,
  inverseDocumentFrequency,
  tfidfVector,
  buildCorpus,
  topTerms,
} from '../../src/algorithms/tfidf.js';

/**
 * Tests for the TF-IDF weighting.
 *
 * The formulas these check are the ones written up in docs/algorithms.md
 * and defended in the report's section 3.3:
 *
 *   tf(t, d) = count(t in d) / totalTerms(d)
 *   idf(t)   = ln((1 + N) / (1 + df(t))) + 1
 *   w(t, d)  = tf(t, d) * idf(t)
 *
 * The smoothing is the part worth testing hardest. On a corpus of about
 * thirty seed adverts the textbook `ln(N / df)` would hand a weight of
 * exactly zero to any term appearing in every document — silently
 * discarding a common but real skill — and divide by zero on an unseen
 * one. Several tests below exist only to prove neither can happen.
 */

describe('termCounts', () => {
  it('counts each term', () => {
    const counts = termCounts(['react', 'node', 'react']);
    expect(counts.get('react')).toBe(2);
    expect(counts.get('node')).toBe(1);
  });

  it('returns an empty map for no terms', () => {
    expect(termCounts([]).size).toBe(0);
  });
});

describe('termFrequency', () => {
  /**
   * A worked example. In ["react", "node", "react", "sql"]:
   *   tf(react) = 2/4 = 0.5
   *   tf(node)  = 1/4 = 0.25
   */
  it('divides each count by the document length', () => {
    const tf = termFrequency(['react', 'node', 'react', 'sql']);
    expect(tf.get('react')).toBeCloseTo(0.5, 10);
    expect(tf.get('node')).toBeCloseTo(0.25, 10);
  });

  it('sums to 1 across the document', () => {
    const tf = termFrequency(['a', 'b', 'b', 'c', 'c', 'c']);
    const total = [...tf.values()].reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  /**
   * Normalising by length is what stops a long CV beating a short one for
   * being long: the same term used twice is worth more in fifty words
   * than in five hundred.
   */
  it('gives a term less weight in a longer document', () => {
    const short = termFrequency(['react', 'node']);
    const long = termFrequency(['react', 'node', 'sql', 'aws', 'docker', 'linux']);
    expect(short.get('react')).toBeGreaterThan(long.get('react'));
  });

  it('returns an empty map rather than dividing by zero', () => {
    expect(termFrequency([]).size).toBe(0);
  });
});

describe('documentFrequency', () => {
  it('counts a term once per document however often it appears', () => {
    const df = documentFrequency([['react', 'react', 'react'], ['react', 'node'], ['sql']]);

    expect(df.get('react')).toBe(2);
    expect(df.get('node')).toBe(1);
    expect(df.get('sql')).toBe(1);
  });

  it('returns an empty map for an empty corpus', () => {
    expect(documentFrequency([]).size).toBe(0);
  });
});

describe('inverseDocumentFrequency', () => {
  /**
   * A worked example with N = 3 and df(react) = 2:
   *   idf = ln((1 + 3) / (1 + 2)) + 1
   *       = ln(4 / 3) + 1
   *       ≈ 1.2877
   */
  it('matches the smoothed formula', () => {
    const df = new Map([['react', 2]]);
    const expected = Math.log(4 / 3) + 1;
    expect(inverseDocumentFrequency('react', df, 3)).toBeCloseTo(expected, 10);
  });

  it('weights a rare term above a common one', () => {
    const df = new Map([
      ['team', 30],
      ['kubernetes', 1],
    ]);

    expect(inverseDocumentFrequency('kubernetes', df, 30)).toBeGreaterThan(
      inverseDocumentFrequency('team', df, 30),
    );
  });

  /**
   * The reason for the trailing `+ 1`. A term in every single document
   * would score ln(1) = 0 under the textbook formula and be discarded.
   */
  it('never returns zero, even for a term in every document', () => {
    const df = new Map([['team', 30]]);
    expect(inverseDocumentFrequency('team', df, 30)).toBeGreaterThan(0);
    expect(inverseDocumentFrequency('team', df, 30)).toBeCloseTo(1, 10);
  });

  /** The reason for the `1 +` on the denominator: no division by zero. */
  it('handles a term the corpus has never seen', () => {
    const idf = inverseDocumentFrequency('unseen', new Map(), 30);
    expect(Number.isFinite(idf)).toBe(true);
    expect(idf).toBeGreaterThan(0);
  });

  it('handles an empty corpus without producing NaN', () => {
    const idf = inverseDocumentFrequency('anything', new Map(), 0);
    expect(Number.isNaN(idf)).toBe(false);
  });
});

describe('tfidfVector', () => {
  it('multiplies term frequency by inverse document frequency', () => {
    const df = new Map([
      ['react', 1],
      ['node', 2],
    ]);

    const vector = tfidfVector(['react', 'node'], df, 2);

    expect(vector.get('react')).toBeCloseTo(0.5 * (Math.log(3 / 2) + 1), 10);
    expect(vector.get('node')).toBeCloseTo(0.5 * (Math.log(3 / 3) + 1), 10);
  });

  it('gives every term a weight above zero', () => {
    const { vectors } = buildCorpus([
      ['react', 'node'],
      ['react', 'node'],
    ]);

    for (const weight of vectors[0].values()) {
      expect(weight).toBeGreaterThan(0);
    }
  });

  it('returns an empty vector for an empty document', () => {
    expect(tfidfVector([], new Map(), 3).size).toBe(0);
  });
});

describe('buildCorpus', () => {
  it('returns one vector per document, with the corpus size', () => {
    const corpus = [['react'], ['node'], ['sql']];
    const { vectors, totalDocuments, df } = buildCorpus(corpus);

    expect(vectors).toHaveLength(3);
    expect(totalDocuments).toBe(3);
    expect(df.get('react')).toBe(1);
  });

  it('weights a distinctive term above a ubiquitous one in the same document', () => {
    // "team" is in all three adverts; "kubernetes" in only this one.
    const { vectors } = buildCorpus([
      ['team', 'kubernetes'],
      ['team', 'excel'],
      ['team', 'photoshop'],
    ]);

    expect(vectors[0].get('kubernetes')).toBeGreaterThan(vectors[0].get('team'));
  });

  it('copes with an empty corpus', () => {
    const { vectors, totalDocuments } = buildCorpus([]);
    expect(vectors).toEqual([]);
    expect(totalDocuments).toBe(0);
  });
});

describe('topTerms', () => {
  it('returns the highest weighted terms, heaviest first', () => {
    const vector = new Map([
      ['low', 0.1],
      ['high', 0.9],
      ['mid', 0.5],
    ]);

    expect(topTerms(vector, 2).map((entry) => entry.term)).toEqual(['high', 'mid']);
  });

  it('returns everything when the limit exceeds the vector', () => {
    expect(topTerms(new Map([['only', 1]]), 25)).toHaveLength(1);
  });

  it('returns nothing for an empty vector', () => {
    expect(topTerms(new Map())).toEqual([]);
  });
});
