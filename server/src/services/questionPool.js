/**
 * Which questions a position can draw on.
 *
 * Written once and shared, because three places need exactly the same
 * answer and any disagreement between them would be a bug that only
 * shows up in production: the activation guard decides whether a
 * position has enough questions, study mode lists them, and the exam
 * draws a paper from them. If those three ever disagreed, a position
 * could pass the guard and then fail to build a paper.
 *
 * A position's pool is its **own** questions plus the questions written
 * against its **category**. That is what makes 700 positions workable —
 * see the comment on `InterviewQuestion.position`.
 */
import { InterviewQuestion } from '../models/InterviewQuestion.js';

/**
 * The category every position draws on, whatever its family.
 *
 * Not a real job family, which is why it is punctuation rather than a
 * name — nothing in `builtInPositions.json` can collide with it.
 */
export const GENERAL_CATEGORY = '__general__';

/**
 * The filter matching everything one position can be asked.
 *
 * @param {object} position - The position (needs `_id` and `category`).
 * @param {string} [level] - Restrict to one level.
 * @returns {object} A Mongo filter.
 */
export function poolFilter(position, level) {
  const owners = [
    { position: position._id },
    // Competency questions — teamwork, conflict, failure, motivation —
    // are asked in every interview whatever the job. Holding them once,
    // under GENERAL_CATEGORY, means all 700 positions have something
    // real to ask without 700 copies of "tell me about a disagreement".
    { category: GENERAL_CATEGORY, position: null },
  ];

  // A position with no category has no family pool, which is the case
  // for anything an admin has created by hand.
  if (position.category) {
    owners.push({ category: position.category, position: null });
  }

  const filter = {
    $or: owners,
    isActive: true,
    isDeleted: false,
  };

  // No level means every level the position offers. An exam uses that:
  // a real interview does not announce which questions are the junior
  // ones, so a mixed paper is the more faithful test.
  if (level) filter.level = level;

  return filter;
}

/**
 * The questions a position can be asked at one level.
 *
 * @param {object} position - The position.
 * @param {string} level - junior, mid or senior.
 * @returns {Promise<Array<object>>} Lean question documents.
 */
export function poolFor(position, level) {
  return InterviewQuestion.find(poolFilter(position, level)).lean();
}

/**
 * How many questions a position has at each level.
 *
 * Counted per level rather than in one aggregation because the `$or`
 * spans two different owners, and a grouped count would have to repeat
 * the same filter logic in pipeline form — a second copy of the rule
 * this module exists to keep in one place.
 *
 * @param {object} position - The position.
 * @param {string[]} levels - The levels to count.
 * @returns {Promise<Record<string, number>>} Count by level.
 */
export async function countsFor(position, levels) {
  const counts = {};

  await Promise.all(
    levels.map(async (level) => {
      counts[level] = await InterviewQuestion.countDocuments(poolFilter(position, level));
    }),
  );

  return counts;
}
