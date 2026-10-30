/**
 * Building an exam paper, written from scratch.
 *
 * Choosing N questions from a pool is not a shuffle. A paper that happens
 * to ask five questions about one topic has not examined the candidate on
 * the position, and a retake that returns the same paper has not examined
 * them twice. So the choice is made in two stages:
 *
 *   1. **Weight** every eligible question by what we know about this
 *      user's history with it (see PAPER_WEIGHTS in examConfig.js).
 *   2. **Pick greedily, damping as we go** — take the heaviest question,
 *      then reduce every remaining question that shares its topic, and
 *      repeat. That is what spreads the paper.
 *
 * The weighting is deliberately simple arithmetic rather than anything
 * probabilistic: every number is explainable, and the same history always
 * produces the same ranking, which makes it testable.
 */
import { PAPER_WEIGHTS } from '../config/examConfig.js';

/**
 * A tiny deterministic pseudo-random generator.
 *
 * `Math.random()` cannot be seeded, which would make the tie-breaking
 * below untestable. This is a mulberry32 — thirty-two bits of state, good
 * enough to break ties and shuffle four options, and not pretending to be
 * anything more. Passing a seed makes a paper reproducible.
 *
 * @param {number} seed - Any integer.
 * @returns {() => number} A function returning numbers in [0, 1).
 */
export function makeRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Summarises what a user has done with the questions before.
 *
 * Taking the history as plain sets rather than querying inside the
 * algorithm keeps this module free of the database, which is what lets
 * the tests describe a history in one line.
 *
 * @param {Array<object>} attempts - The user's previous attempts, newest first.
 * @returns {{wrong: Set<string>, seen: Set<string>, lastPaper: Set<string>}}
 */
export function summariseHistory(attempts = []) {
  const wrong = new Set();
  const seen = new Set();
  const lastPaper = new Set();

  attempts.forEach((attempt, index) => {
    for (const [position, entry] of (attempt.paper ?? []).entries()) {
      const id = String(entry.question ?? '');
      if (!id) continue;

      seen.add(id);
      if (index === 0) lastPaper.add(id);

      // Unanswered counts as wrong: running out of time on a question is
      // not evidence of knowing it.
      const answer = attempt.answers?.[position];
      if (answer !== entry.correctIndex) wrong.add(id);
    }
  });

  return { wrong, seen, lastPaper };
}

/**
 * The weight one question starts with, before topic damping.
 *
 * @param {object} question - The question.
 * @param {{wrong: Set<string>, seen: Set<string>, lastPaper: Set<string>}} history
 * @returns {number} Its weight, never below `minimumWeight`.
 */
export function weighQuestion(question, history) {
  const id = String(question._id ?? question.id);
  let weight = PAPER_WEIGHTS.base;

  if (history.wrong.has(id)) weight += PAPER_WEIGHTS.wrongBonus;
  if (!history.seen.has(id)) weight += PAPER_WEIGHTS.freshBonus;
  if (history.lastPaper.has(id)) weight -= PAPER_WEIGHTS.recencyPenalty;

  return Math.max(PAPER_WEIGHTS.minimumWeight, weight);
}

/**
 * Chooses the questions for one paper.
 *
 * Step by step:
 *   1. Weight every question from the user's history.
 *   2. Take the heaviest. Ties are broken by the seeded generator, so two
 *      users with identical histories do not always get the same paper.
 *   3. Damp everything left on that topic, then repeat from step 2.
 *
 * Returns fewer than `count` only when the pool itself is smaller, which
 * the activation guard is there to prevent.
 *
 * @param {Array<object>} pool - Eligible questions.
 * @param {number} count - How many to choose.
 * @param {{attempts?: Array<object>, seed?: number}} [options]
 * @returns {Array<object>} The chosen questions, in the order picked.
 */
export function selectQuestions(pool, count, options = {}) {
  const { attempts = [], seed = Date.now() } = options;

  const history = summariseHistory(attempts);
  const random = makeRandom(seed);

  const remaining = pool.map((question) => ({
    question,
    weight: weighQuestion(question, history),
    topic: question.topic || 'general',
    level: question.level || 'mid',
  }));

  const chosen = [];

  while (chosen.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (const [index, entry] of remaining.entries()) {
      // A small random share of the weight, so equal weights do not
      // always resolve in array order.
      const score = entry.weight + random() * 0.01;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    chosen.push(picked.question);

    // Damp the rest of that topic, so the next pick prefers a new one.
    // The same damping is applied to the level, which is what spreads a
    // mixed paper across junior, mid and senior rather than letting
    // whichever level has the most questions fill it.
    for (const entry of remaining) {
      if (entry.topic === picked.topic) {
        entry.weight = Math.max(
          PAPER_WEIGHTS.minimumWeight,
          entry.weight * PAPER_WEIGHTS.topicDamping,
        );
      }

      if (entry.level === picked.level) {
        entry.weight = Math.max(
          PAPER_WEIGHTS.minimumWeight,
          entry.weight * PAPER_WEIGHTS.levelDamping,
        );
      }
    }
  }

  return chosen;
}

/**
 * Shuffles an array with a seeded Fisher-Yates.
 * @param {Array<*>} items - What to shuffle.
 * @param {() => number} random - A generator from `makeRandom`.
 * @returns {Array<*>} A new, shuffled array.
 */
export function shuffle(items, random) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Turns chosen questions into the frozen paper stored on an attempt.
 *
 * Two things happen here, and both are about the paper being a record
 * rather than a pointer:
 *
 *   - **The text and options are copied**, not referenced. An admin
 *     editing a question afterwards must not change what somebody was
 *     asked, or a stored result becomes unexplainable.
 *   - **The options are shuffled** per sitting, and `correctIndex` is
 *     recorded against the shuffled order. Otherwise the right answer
 *     would sit in the same place every time and a paper could be
 *     memorised as "B, C, A, D".
 *
 * @param {Array<object>} questions - The chosen questions.
 * @param {number} seed - The sitting's seed.
 * @returns {Array<object>} Paper entries ready to store.
 */
export function buildPaper(questions, seed) {
  const random = makeRandom(seed + 1);

  return questions.map((question) => {
    const order = shuffle(
      question.options.map((option, index) => ({
        text: option.text,
        wasCorrect: index === question.correctIndex,
      })),
      random,
    );

    return {
      question: question._id ?? question.id,
      text: question.text,
      options: order.map((option) => ({ text: option.text })),
      correctIndex: order.findIndex((option) => option.wasCorrect),
      explanation: question.explanation,
      topic: question.topic || 'general',
    };
  });
}

/**
 * Builds a complete paper for one sitting.
 *
 * @param {{pool: Array<object>, count: number, attempts?: Array<object>, seed?: number}} input
 * @returns {Array<object>} The frozen paper.
 */
export function createPaper({ pool, count, attempts = [], seed = Date.now() }) {
  return buildPaper(selectQuestions(pool, count, { attempts, seed }), seed);
}

export default createPaper;
