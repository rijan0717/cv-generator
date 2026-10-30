/**
 * Marking a finished exam paper.
 *
 * Deliberately the same shape as `cvStrengthScorer`: a score, a breakdown
 * explaining where it came from, and suggestions. Somebody who has read
 * one report can read the other, and both can be explained the same way.
 *
 * The breakdown is by **topic** rather than by question, because "you
 * scored 4/10" tells a candidate nothing they can act on, whereas "you
 * got every accessibility question wrong" tells them what to study.
 */
import { SCORING } from '../config/examConfig.js';

/**
 * Marks a paper against the answers given.
 *
 * An unanswered question counts as wrong rather than being left out of
 * the total. Running out of time is part of the exam, and dropping those
 * questions would let somebody score 100% by answering one question.
 *
 * @param {Array<object>} paper - The frozen paper from the attempt.
 * @param {Array<number|null>} answers - Chosen option index per question.
 * @param {number} passMark - The percentage needed to pass.
 * @returns {{score: number, passed: boolean, correctCount: number,
 *            answeredCount: number, breakdown: Array<object>,
 *            weakestTopics: string[], suggestions: string[]}}
 */
export function scoreExam(paper, answers, passMark) {
  const total = paper.length;

  if (total === 0) {
    return {
      score: 0,
      passed: false,
      correctCount: 0,
      answeredCount: 0,
      breakdown: [],
      weakestTopics: [],
      suggestions: ['This paper had no questions.'],
    };
  }

  /** Tallies per topic, built in one pass. */
  const topics = new Map();
  let correctCount = 0;
  let answeredCount = 0;

  for (const [index, entry] of paper.entries()) {
    const given = answers?.[index];
    const wasAnswered = given !== null && given !== undefined;
    const isCorrect = wasAnswered && given === entry.correctIndex;

    if (wasAnswered) answeredCount += 1;
    if (isCorrect) correctCount += 1;

    const topic = entry.topic || 'general';
    const tally = topics.get(topic) ?? { topic, asked: 0, correct: 0 };
    tally.asked += 1;
    if (isCorrect) tally.correct += 1;
    topics.set(topic, tally);
  }

  const score = Math.round((correctCount / total) * 100);

  const breakdown = [...topics.values()]
    .map((tally) => ({
      ...tally,
      percentage: Math.round((tally.correct / tally.asked) * 100),
    }))
    // Weakest first: the top of this list is what to study.
    .sort((a, b) => a.percentage - b.percentage || b.asked - a.asked);

  const weakestTopics = breakdown
    .filter((tally) => tally.percentage <= SCORING.weakTopicThreshold)
    .slice(0, SCORING.maxWeakTopics)
    .map((tally) => tally.topic);

  return {
    score,
    passed: score >= passMark,
    correctCount,
    answeredCount,
    breakdown,
    weakestTopics,
    suggestions: buildSuggestions({
      score,
      passMark,
      total,
      answeredCount,
      weakestTopics,
    }),
  };
}

/**
 * Turns the result into advice worth reading.
 *
 * Each line is earned by something in the result rather than offered
 * generically, because advice that would have been printed anyway is
 * advice a user learns to skip.
 *
 * @param {{score: number, passMark: number, total: number,
 *          answeredCount: number, weakestTopics: string[]}} input
 * @returns {string[]} The suggestions.
 */
function buildSuggestions({ score, passMark, total, answeredCount, weakestTopics }) {
  const suggestions = [];

  if (answeredCount < total) {
    const missed = total - answeredCount;
    suggestions.push(
      `You left ${missed} question${missed === 1 ? '' : 's'} unanswered. An unanswered question scores nothing, so it is always worth choosing before time runs out.`,
    );
  }

  if (score >= passMark) {
    suggestions.push(
      `You passed with ${score}%, against a pass mark of ${passMark}%. Read the explanations for anything you got wrong — an interviewer will ask why, not just what.`,
    );
  } else {
    suggestions.push(
      `You scored ${score}%, below the ${passMark}% pass mark. Work through the study material again, then retake it — the next paper will favour the questions you got wrong.`,
    );
  }

  if (weakestTopics.length > 0) {
    suggestions.push(
      `Weakest ${weakestTopics.length === 1 ? 'area' : 'areas'}: ${weakestTopics.join(', ')}. That is where the next hour of revision is worth most.`,
    );
  }

  return suggestions;
}

export default scoreExam;
