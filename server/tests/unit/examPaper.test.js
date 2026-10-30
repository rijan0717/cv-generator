import { describe, it, expect } from 'vitest';
import {
  makeRandom,
  summariseHistory,
  weighQuestion,
  selectQuestions,
  shuffle,
  buildPaper,
  createPaper,
} from '../../src/algorithms/examPaper.js';
import { PAPER_WEIGHTS } from '../../src/config/examConfig.js';

/**
 * Tests for the exam paper builder.
 *
 * The claims this module makes are all about *which* questions appear:
 * that a paper spreads across topics, that a retake returns to what was
 * failed, and that two sittings are not identical. None of those are
 * visible from the outside — a bad paper still looks like a paper — so
 * they are checked here directly.
 */

/** Builds a pool of questions with the given topics. */
function pool(topics) {
  return topics.map((topic, index) => ({
    _id: `q${index}`,
    text: `Question ${index}`,
    topic,
    options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
    correctIndex: index % 4,
    explanation: `Because ${index}`,
  }));
}

/** Builds a pool spread evenly across the three levels. */
function mixedPool(perLevel) {
  const questions = [];

  for (const level of ['junior', 'mid', 'senior']) {
    for (let index = 0; index < perLevel; index += 1) {
      questions.push({
        _id: `${level}-${index}`,
        text: `${level} question ${index}`,
        topic: `topic${index % 4}`,
        level,
        options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
        correctIndex: 0,
        explanation: 'Because.',
      });
    }
  }

  return questions;
}

/** An attempt in which the named questions were answered wrongly. */
function attempt(ids, wrongIds = []) {
  return {
    paper: ids.map((id) => ({ question: id, correctIndex: 0 })),
    answers: ids.map((id) => (wrongIds.includes(id) ? 1 : 0)),
  };
}

describe('makeRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = makeRandom(42);
    const b = makeRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('gives a different sequence for a different seed', () => {
    expect(makeRandom(1)()).not.toBe(makeRandom(2)());
  });

  it('stays within 0 and 1', () => {
    const random = makeRandom(7);
    for (let i = 0; i < 100; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('summariseHistory', () => {
  it('records what was answered wrongly', () => {
    const history = summariseHistory([attempt(['q0', 'q1'], ['q1'])]);
    expect(history.wrong.has('q1')).toBe(true);
    expect(history.wrong.has('q0')).toBe(false);
  });

  it('counts an unanswered question as wrong', () => {
    // Running out of time is not evidence of knowing the answer.
    const history = summariseHistory([
      { paper: [{ question: 'q0', correctIndex: 0 }], answers: [null] },
    ]);
    expect(history.wrong.has('q0')).toBe(true);
  });

  it('remembers only the most recent paper as recent', () => {
    const history = summariseHistory([attempt(['q0']), attempt(['q1'])]);
    expect(history.lastPaper.has('q0')).toBe(true);
    expect(history.lastPaper.has('q1')).toBe(false);
    // Both are still "seen".
    expect(history.seen.has('q1')).toBe(true);
  });

  it('copes with no history at all', () => {
    const history = summariseHistory([]);
    expect(history.wrong.size).toBe(0);
    expect(history.seen.size).toBe(0);
  });
});

describe('weighQuestion', () => {
  const empty = { wrong: new Set(), seen: new Set(), lastPaper: new Set() };

  it('weights an unseen question above one answered correctly', () => {
    const seen = { wrong: new Set(), seen: new Set(['q0']), lastPaper: new Set() };
    const question = { _id: 'q0' };

    expect(weighQuestion(question, empty)).toBeGreaterThan(weighQuestion(question, seen));
  });

  it('weights a previously wrong question above an unseen one', () => {
    // The whole point of the retake weighting: go back to the failures.
    const wrong = {
      wrong: new Set(['q0']),
      seen: new Set(['q0']),
      lastPaper: new Set(),
    };

    expect(weighQuestion({ _id: 'q0' }, wrong)).toBeGreaterThan(
      weighQuestion({ _id: 'q1' }, empty),
    );
  });

  it('damps a question from the previous paper', () => {
    const recent = {
      wrong: new Set(),
      seen: new Set(['q0']),
      lastPaper: new Set(['q0']),
    };

    expect(weighQuestion({ _id: 'q0' }, recent)).toBeLessThan(PAPER_WEIGHTS.base);
  });

  it('never falls to zero, so every question stays reachable', () => {
    const worst = {
      wrong: new Set(),
      seen: new Set(['q0']),
      lastPaper: new Set(['q0']),
    };

    expect(weighQuestion({ _id: 'q0' }, worst)).toBeGreaterThanOrEqual(PAPER_WEIGHTS.minimumWeight);
  });
});

describe('selectQuestions', () => {
  it('returns the number asked for', () => {
    expect(selectQuestions(pool(['a', 'b', 'c', 'd', 'e']), 3, { seed: 1 })).toHaveLength(3);
  });

  it('never returns the same question twice', () => {
    const chosen = selectQuestions(pool(['a', 'b', 'c', 'd', 'e', 'f']), 5, { seed: 2 });
    const ids = chosen.map((question) => question._id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns the whole pool when it is smaller than the paper', () => {
    expect(selectQuestions(pool(['a', 'b']), 10, { seed: 3 })).toHaveLength(2);
  });

  /**
   * The diversity pick. With four questions on one topic and one each on
   * three others, a paper of four should not be all four from one topic.
   */
  it('spreads across topics rather than taking them all from one', () => {
    const questions = pool(['css', 'css', 'css', 'css', 'react', 'html', 'a11y']);
    const chosen = selectQuestions(questions, 4, { seed: 4 });
    const topics = new Set(chosen.map((question) => question.topic));

    expect(topics.size).toBeGreaterThan(1);
    expect(chosen.filter((question) => question.topic === 'css').length).toBeLessThan(4);
  });

  it('prefers a previously wrong question on a retake', () => {
    const questions = pool(['a', 'b', 'c', 'd', 'e', 'f']);
    // q5 was asked and failed two attempts ago, so it is not "recent".
    const attempts = [attempt(['q0', 'q1']), attempt(['q5'], ['q5'])];

    const chosen = selectQuestions(questions, 3, { attempts, seed: 5 });
    expect(chosen.map((question) => question._id)).toContain('q5');
  });

  it('gives the same paper for the same seed and history', () => {
    const questions = pool(['a', 'b', 'c', 'd', 'e']);
    const first = selectQuestions(questions, 3, { seed: 99 }).map((q) => q._id);
    const second = selectQuestions(questions, 3, { seed: 99 }).map((q) => q._id);

    expect(first).toEqual(second);
  });

  it('returns nothing for an empty pool', () => {
    expect(selectQuestions([], 5, { seed: 1 })).toEqual([]);
  });

  /**
   * A mixed paper is the default now, so it has to actually mix. With
   * an even pool across the three levels, a paper of twelve that drew
   * from only one would be a junior exam wearing a mixed label.
   */
  it('spreads a mixed paper across junior, mid and senior', () => {
    const chosen = selectQuestions(mixedPool(20), 12, { seed: 21 });
    const levels = new Set(chosen.map((question) => question.level));

    expect(levels).toEqual(new Set(['junior', 'mid', 'senior']));

    // And no level should swamp it.
    for (const level of levels) {
      const share = chosen.filter((question) => question.level === level).length;
      expect(share).toBeLessThanOrEqual(7);
    }
  });

  /**
   * Retaking has to give a different paper, repeatedly — not just on
   * the second attempt. Each sitting uses its own seed and the previous
   * paper is damped, so successive papers should keep differing.
   */
  it('gives a different paper on each of several retakes', () => {
    const questions = mixedPool(20);
    const papers = [];
    const attempts = [];

    for (let sitting = 0; sitting < 4; sitting += 1) {
      const chosen = selectQuestions(questions, 12, { attempts, seed: 100 + sitting });
      const ids = chosen.map((question) => question._id);
      papers.push(ids);

      // Record it as a sat attempt, all answered correctly.
      attempts.unshift({
        paper: ids.map((id) => ({ question: id, correctIndex: 0 })),
        answers: ids.map(() => 0),
      });
    }

    for (let index = 1; index < papers.length; index += 1) {
      const previous = new Set(papers[index - 1]);
      const repeated = papers[index].filter((id) => previous.has(id)).length;

      // Some overlap is unavoidable with a finite pool; a repeat of the
      // whole paper is not.
      expect(repeated).toBeLessThan(papers[index].length);
    }
  });
});

describe('shuffle', () => {
  it('keeps every item', () => {
    const shuffled = shuffle([1, 2, 3, 4, 5], makeRandom(1));
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not change the original array', () => {
    const original = [1, 2, 3];
    shuffle(original, makeRandom(1));
    expect(original).toEqual([1, 2, 3]);
  });
});

describe('buildPaper', () => {
  it('copies the text rather than referencing the question', () => {
    // A frozen paper: editing the question afterwards must not change
    // what somebody was asked.
    const [entry] = buildPaper(pool(['a']), 1);
    expect(entry.text).toBe('Question 0');
    expect(entry.explanation).toBe('Because 0');
  });

  it('keeps correctIndex pointing at the right option after shuffling', () => {
    const questions = pool(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);

    for (const question of questions) {
      const [entry] = buildPaper([question], 7);
      const correctText = question.options[question.correctIndex].text;
      expect(entry.options[entry.correctIndex].text).toBe(correctText);
    }
  });

  it('keeps all four options', () => {
    const [entry] = buildPaper(pool(['a']), 1);
    expect(entry.options).toHaveLength(4);
  });

  it('does not always put the answer in the same place', () => {
    // Otherwise a paper could be memorised as "B, C, A, D".
    const positions = new Set();
    for (let seed = 0; seed < 25; seed += 1) {
      const [entry] = buildPaper(pool(['a']), seed);
      positions.add(entry.correctIndex);
    }

    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('createPaper', () => {
  it('builds a complete paper of the requested length', () => {
    const paper = createPaper({ pool: pool(['a', 'b', 'c', 'd']), count: 3, seed: 11 });

    expect(paper).toHaveLength(3);
    for (const entry of paper) {
      expect(entry.text).toBeTruthy();
      expect(entry.options).toHaveLength(4);
      expect(entry.correctIndex).toBeGreaterThanOrEqual(0);
      expect(entry.correctIndex).toBeLessThan(4);
    }
  });
});
