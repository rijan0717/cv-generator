import { describe, it, expect } from 'vitest';
import { scoreExam } from '../../src/algorithms/examScorer.js';

/**
 * Tests for exam marking.
 *
 * The arithmetic is simple, so most of these are about the decisions
 * around it: that an unanswered question counts against you, that the
 * breakdown puts the weakest topic first, and that the advice is earned
 * by the result rather than printed regardless.
 */

/** A paper where the correct answer is always option 0. */
function paper(topics) {
  return topics.map((topic, index) => ({
    text: `Question ${index}`,
    options: [{ text: 'right' }, { text: 'wrong' }, { text: 'wrong' }, { text: 'wrong' }],
    correctIndex: 0,
    explanation: 'Because.',
    topic,
  }));
}

describe('scoreExam', () => {
  it('marks a perfect paper', () => {
    const result = scoreExam(paper(['a', 'b', 'c', 'd']), [0, 0, 0, 0], 60);

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(4);
  });

  it('marks a paper with nothing right', () => {
    const result = scoreExam(paper(['a', 'b']), [1, 1], 60);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('rounds the percentage', () => {
    // 2 of 3 is 66.67, reported as 67.
    expect(scoreExam(paper(['a', 'b', 'c']), [0, 0, 1], 60).score).toBe(67);
  });

  /**
   * An unanswered question is wrong, not excluded. Dropping it would let
   * somebody answer one question correctly and score 100%.
   */
  it('counts an unanswered question as wrong', () => {
    const result = scoreExam(paper(['a', 'b']), [0, null], 60);

    expect(result.score).toBe(50);
    expect(result.correctCount).toBe(1);
    expect(result.answeredCount).toBe(1);
  });

  it('treats a missing answer the same as an explicit null', () => {
    expect(scoreExam(paper(['a', 'b']), [0], 60).score).toBe(50);
  });

  it('compares against the pass mark it is given', () => {
    const answers = [0, 0, 0, 1, 1];
    expect(scoreExam(paper(['a', 'b', 'c', 'd', 'e']), answers, 60).passed).toBe(true);
    expect(scoreExam(paper(['a', 'b', 'c', 'd', 'e']), answers, 80).passed).toBe(false);
  });

  it('breaks the result down by topic', () => {
    const result = scoreExam(paper(['css', 'css', 'react']), [0, 1, 0], 60);
    const css = result.breakdown.find((entry) => entry.topic === 'css');

    expect(css).toEqual({ topic: 'css', asked: 2, correct: 1, percentage: 50 });
  });

  it('puts the weakest topic first', () => {
    const result = scoreExam(paper(['strong', 'weak', 'weak']), [0, 1, 1], 60);
    expect(result.breakdown[0].topic).toBe('weak');
  });

  it('names the weak topics', () => {
    const result = scoreExam(paper(['css', 'react']), [1, 0], 60);
    expect(result.weakestTopics).toContain('css');
    expect(result.weakestTopics).not.toContain('react');
  });

  it('names no weak topics when everything was answered well', () => {
    expect(scoreExam(paper(['a', 'b']), [0, 0], 60).weakestTopics).toEqual([]);
  });

  it('mentions unanswered questions in the advice', () => {
    const result = scoreExam(paper(['a', 'b']), [0, null], 60);
    expect(result.suggestions.join(' ')).toMatch(/unanswered/);
  });

  it('says nothing about unanswered questions when there were none', () => {
    const result = scoreExam(paper(['a', 'b']), [0, 0], 60);
    expect(result.suggestions.join(' ')).not.toMatch(/unanswered/);
  });

  it('suggests a retake after a failure', () => {
    const result = scoreExam(paper(['a', 'b']), [1, 1], 60);
    expect(result.suggestions.join(' ')).toMatch(/retake/i);
  });

  it('handles an empty paper rather than dividing by zero', () => {
    const result = scoreExam([], [], 60);

    expect(result.score).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
    expect(result.breakdown).toEqual([]);
  });

  it('treats a question with no topic as "general"', () => {
    const result = scoreExam([{ correctIndex: 0, options: [{}, {}] }], [0], 60);
    expect(result.breakdown[0].topic).toBe('general');
  });
});
