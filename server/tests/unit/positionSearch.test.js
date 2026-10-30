import { describe, it, expect } from 'vitest';
import { searchPositions, scorePosition } from '../../src/algorithms/positionSearch.js';
import { processText } from '../../src/algorithms/textProcessor.js';

/**
 * Tests for ranking positions against a search.
 *
 * The behaviour worth protecting is that a user types what they say out
 * loud — "front end dev" — and still finds "Frontend Developer". That
 * works only because the query and the position go through the same
 * preprocessing, so these tests are really checking that the two halves
 * stay joined up.
 */

const positions = [
  {
    title: 'Frontend Developer',
    description: 'Builds the parts of a web application people see.',
    industry: 'Information Technology',
    tags: ['react', 'css', 'javascript'],
  },
  {
    title: 'Manual QA Tester',
    description: 'Designs and runs test cases by hand before release.',
    industry: 'Information Technology',
    tags: ['testing', 'bug reports'],
  },
  {
    title: 'Accounts Assistant',
    description: 'Supports a finance team with bookkeeping and reconciliations.',
    industry: 'Accounting and Finance',
    tags: ['ledger', 'bookkeeping'],
  },
];

describe('searchPositions', () => {
  it('returns everything, alphabetically, for an empty query', () => {
    // The search box starts empty; showing nothing would hide the feature.
    const results = searchPositions(positions, '');
    expect(results.map((position) => position.title)).toEqual([
      'Accounts Assistant',
      'Frontend Developer',
      'Manual QA Tester',
    ]);
  });

  it('finds a position by its exact title', () => {
    const results = searchPositions(positions, 'Frontend Developer');
    expect(results[0].title).toBe('Frontend Developer');
  });

  it('matches a shortened word through stemming', () => {
    // "dev" does not appear in any title; "Developer" stems towards it.
    const results = searchPositions(positions, 'developer');
    expect(results[0].title).toBe('Frontend Developer');
  });

  it('matches a phrase written as two words', () => {
    // "front end" is normalised to "frontend" before tokenising.
    const results = searchPositions(positions, 'front end');
    expect(results[0].title).toBe('Frontend Developer');
  });

  it('finds a position by one of its tags', () => {
    const results = searchPositions(positions, 'bookkeeping');
    expect(results[0].title).toBe('Accounts Assistant');
  });

  it('finds a position by its industry', () => {
    const results = searchPositions(positions, 'finance');
    expect(results.map((position) => position.title)).toContain('Accounts Assistant');
  });

  it('returns nothing when nothing matches', () => {
    expect(searchPositions(positions, 'welding')).toEqual([]);
  });

  it('ranks a title hit above a description hit', () => {
    const results = searchPositions(positions, 'test');
    // "Tester" is in one title; "test cases" only in a description.
    expect(results[0].title).toBe('Manual QA Tester');
  });

  it('ignores case', () => {
    expect(searchPositions(positions, 'FRONTEND')[0].title).toBe('Frontend Developer');
  });

  it('copes with an empty list of positions', () => {
    expect(searchPositions([], 'anything')).toEqual([]);
  });
});

describe('scorePosition', () => {
  it('scores zero for a query with no usable terms', () => {
    // "the" is a stop word, so nothing survives preprocessing.
    expect(scorePosition(positions[0], processText('the'), 'the')).toBe(0);
  });

  it('scores a whole-title match above a single word', () => {
    const whole = scorePosition(
      positions[0],
      processText('Frontend Developer'),
      'Frontend Developer',
    );
    const part = scorePosition(positions[0], processText('developer'), 'developer');

    expect(whole).toBeGreaterThan(part);
  });

  it('copes with a position missing optional fields', () => {
    const sparse = { title: 'Nightshift Cleaner' };
    expect(() => scorePosition(sparse, processText('cleaner'), 'cleaner')).not.toThrow();
    expect(scorePosition(sparse, processText('cleaner'), 'cleaner')).toBeGreaterThan(0);
  });
});
