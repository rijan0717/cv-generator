/**
 * Interview preparation: the admin's control over positions and the
 * questions behind them.
 *
 * The admin owns every word a user reads here. Nothing is generated, and
 * nothing is offered until it has been switched on deliberately — a new
 * position starts inactive, because a position with no questions in it is
 * worse than no position at all.
 */

import { InterviewPosition, INTERVIEW_LEVELS } from '../models/InterviewPosition.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { countsFor, poolFilter, GENERAL_CATEGORY } from '../services/questionPool.js';

/**
 * Shapes a position for the admin screens.
 * @param {object} position - A document or lean object.
 * @param {Record<string, number>} [counts] - Active questions by level.
 * @returns {object}
 */
function positionToJSON(position, counts = {}) {
  return {
    id: position._id?.toString(),
    title: position.title,
    slug: position.slug,
    description: position.description,
    category: position.category,
    isBuiltIn: position.isBuiltIn,
    tags: position.tags ?? [],
    levels: position.levels ?? [],
    examSettings: {
      questionCount: position.examSettings?.questionCount,
      passMark: position.examSettings?.passMark,
      timeLimitMinutes: position.examSettings?.timeLimitMinutes,
    },
    isActive: position.isActive,
    questionCounts: counts,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

/**
 * Shapes a question for the admin screens.
 *
 * The admin sees everything, including the correct answer — that is the
 * whole point of the editor. The user-facing controller is the one that
 * has to strip it.
 *
 * @param {object} question - A document or lean object.
 * @returns {object}
 */
function questionToJSON(question) {
  return {
    id: question._id?.toString(),
    position: question.position?.toString(),
    level: question.level,
    text: question.text,
    options: question.options.map((option) => ({ text: option.text })),
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    topic: question.topic,
    isActive: question.isActive,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

/**
 * Turns a title into a URL-safe slug.
 *
 * Kept deliberately plain: lowercase, letters and digits, single hyphens.
 * Anything else a title can contain — accents, ampersands, slashes — is
 * reduced rather than transliterated, because a slug only has to be
 * stable and readable, not to reproduce the title.
 *
 * @param {string} title - The position's title.
 * @returns {string} The slug.
 */
export function slugify(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Finds a slug nothing else is using, by adding -2, -3 and so on.
 * @param {string} base - The slug derived from the title.
 * @param {string} [excludeId] - A position allowed to keep its own slug.
 * @returns {Promise<string>} A free slug.
 */
async function uniqueSlug(base, excludeId) {
  const root = base || 'position';

  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const clash = await InterviewPosition.findOne({ slug: candidate, _id: { $ne: excludeId } })
      .select('_id')
      .lean();

    if (!clash) return candidate;
  }
}

/**
 * Counts the questions one position can be asked, by level.
 *
 * Delegates to the shared pool service so that the admin's counts, the
 * activation guard and the exam all mean exactly the same thing by "the
 * questions this position has" — including the ones it inherits from
 * its category.
 *
 * @param {object} position - The position.
 * @returns {Promise<Record<string, number>>} Count by level, zero included.
 */
async function countQuestionsByLevel(position) {
  // Every level is reported, including the ones with nothing in them: the
  // admin screen needs to show "senior: 0" rather than leave it out.
  const counts = Object.fromEntries(INTERVIEW_LEVELS.map((level) => [level, 0]));
  return { ...counts, ...(await countsFor(position, INTERVIEW_LEVELS)) };
}

/**
 * Works out whether a position has enough questions to be switched on.
 *
 * Every level it offers needs at least `questionCount` active questions,
 * or the exam it promises cannot be built. Returning the shortfalls
 * rather than a bare boolean lets the error say which level is short and
 * by how many, which is the difference between a useful message and
 * "cannot activate".
 *
 * @param {object} position - The position.
 * @param {Record<string, number>} counts - Active questions by level.
 * @returns {Array<{level: string, have: number, need: number}>} Shortfalls.
 */
export function activationShortfalls(position, counts) {
  const need = position.examSettings?.questionCount ?? 0;

  return position.levels
    .map((level) => ({ level, have: counts[level] ?? 0, need }))
    .filter((entry) => entry.have < entry.need);
}

/**
 * GET /api/admin/interview/positions
 * Every position, including the inactive and the empty ones.
 */
export async function listPositions(req, res) {
  const { search = '' } = req.query;

  const filter = { isDeleted: false };
  if (search.trim()) {
    // Escaped, so a regex metacharacter typed into the search box is
    // treated as the text somebody meant rather than as a pattern.
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }

  const positions = await InterviewPosition.find(filter).sort({ title: 1 }).lean();

  const withCounts = await Promise.all(
    positions.map(async (position) =>
      positionToJSON(position, await countQuestionsByLevel(position)),
    ),
  );

  sendSuccess(res, { positions: withCounts }, 'Positions');
}

/**
 * GET /api/admin/interview/positions/:id
 * One position with its question counts.
 */
export async function getPosition(req, res) {
  const position = await InterviewPosition.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!position) throw ApiError.notFound('Position not found');

  const counts = await countQuestionsByLevel(position);

  sendSuccess(res, { position: positionToJSON(position, counts) }, 'Position');
}

/**
 * POST /api/admin/interview/positions
 * Creates a position. It starts inactive and with no questions.
 */
export async function createPosition(req, res) {
  const { title, description, industry, tags, levels, examSettings } = req.body;

  const position = await InterviewPosition.create({
    title,
    slug: await uniqueSlug(slugify(title)),
    description,
    industry,
    tags,
    levels,
    examSettings,
    isActive: false,
  });

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'INTERVIEW_POSITION_CREATE', position: position.slug },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { position: positionToJSON(position, await countQuestionsByLevel(position)) },
    'Position created',
    201,
  );
}

/**
 * PATCH /api/admin/interview/positions/:id
 *
 * Edits a position, and is the only place it can be switched on.
 *
 * Activation is refused unless every level the position offers has enough
 * active questions to fill a paper. Without that check "the exam starts
 * automatically once a position is active" would be true right up to the
 * moment a user pressed the button on an empty position.
 */
export async function updatePosition(req, res) {
  const position = await InterviewPosition.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!position) throw ApiError.notFound('Position not found');

  const { title, description, industry, tags, levels, examSettings, isActive } = req.body;

  if (title !== undefined && title !== position.title) {
    position.title = title;
    position.slug = await uniqueSlug(slugify(title), position._id);
  }

  if (description !== undefined) position.description = description;
  if (industry !== undefined) position.industry = industry;
  if (tags !== undefined) position.tags = tags;
  if (levels !== undefined) position.levels = levels;

  if (examSettings !== undefined) {
    position.examSettings = { ...position.examSettings?.toObject(), ...examSettings };
  }

  if (isActive !== undefined) position.isActive = isActive;

  // Checked after the other changes are applied, because raising the
  // question count or adding a level can itself make a position
  // unservable — not only pressing "activate".
  if (position.isActive) {
    const counts = await countQuestionsByLevel(position);
    const short = activationShortfalls(position, counts);

    if (short.length > 0) {
      const detail = short
        .map((entry) => `${entry.level} has ${entry.have} of ${entry.need}`)
        .join('; ');

      throw ApiError.badRequest(
        `This position cannot be offered yet: an exam needs ${position.examSettings.questionCount} active questions at every level, but ${detail}.`,
      );
    }
  }

  await position.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: {
      action: isActive === undefined ? 'INTERVIEW_POSITION_EDIT' : isActive ? 'ON' : 'OFF',
      position: position.slug,
    },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { position: positionToJSON(position, await countQuestionsByLevel(position)) },
    'Position updated',
  );
}

/**
 * DELETE /api/admin/interview/positions/:id
 *
 * Soft deletes, and takes its questions out of use with it. Nothing is
 * removed from the database: a past exam attempt stores its own copy of
 * the paper, but the position is still what a result is reported against.
 *
 * A built-in position cannot be deleted. It is defined in
 * `builtInPositions.json`, so the next seed would bring it straight
 * back — and a delete that silently undoes itself is worse than one
 * refused with a reason. Switching it off hides it just as well.
 */
export async function deletePosition(req, res) {
  const position = await InterviewPosition.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!position) throw ApiError.notFound('Position not found');

  if (position.isBuiltIn) {
    throw ApiError.badRequest(
      'This position is built in and cannot be deleted. Switch it off instead to hide it from users.',
    );
  }

  position.isDeleted = true;
  position.isActive = false;
  await position.save();

  await InterviewQuestion.updateMany({ position: position._id }, { $set: { isDeleted: true } });

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'INTERVIEW_POSITION_DELETE', position: position.slug },
    ip: req.ip,
  });

  sendSuccess(res, {}, 'Position deleted');
}

/**
 * GET /api/admin/interview/positions/:id/questions
 * Every question for a position, grouped by level for the editor.
 */
export async function listQuestions(req, res) {
  const position = await InterviewPosition.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).lean();
  if (!position) throw ApiError.notFound('Position not found');

  // The whole pool, not just the position's own questions: its own, its
  // category's, and the general competency bank every position draws on.
  // The filter comes from the shared pool service so this list can never
  // disagree with the counts or the exam — listing less is why a position
  // offered to users could open to an empty editor. The `isActive` clause
  // is dropped because the admin edits the switched-off questions too.
  const { isActive: _ignored, ...pool } = poolFilter(position);
  const questions = await InterviewQuestion.find({
    ...pool,
    isDeleted: false,
  })
    .sort({ level: 1, createdAt: 1 })
    .lean();

  const byLevel = Object.fromEntries(INTERVIEW_LEVELS.map((level) => [level, []]));
  for (const question of questions) {
    byLevel[question.level].push({
      ...questionToJSON(question),
      // Flagged so the editor can say where it came from: editing a
      // shared question changes it for every position in the category,
      // which an admin should know before they click.
      isShared: !question.position,
      // The general bank's category is punctuation rather than a name,
      // so it is spelled out here instead of showing "__general__".
      sharedWith: question.position
        ? ''
        : question.category === GENERAL_CATEGORY
          ? 'every position'
          : question.category,
    });
  }

  sendSuccess(res, { questions: byLevel }, 'Questions');
}

/**
 * POST /api/admin/interview/questions
 * Adds one question to a position.
 */
export async function createQuestion(req, res) {
  const { position: positionId, level, text, options, correctIndex, explanation, topic } = req.body;

  const position = await InterviewPosition.findOne({ _id: positionId, isDeleted: false }).lean();
  if (!position) throw ApiError.notFound('Position not found');

  if (!position.levels.includes(level)) {
    throw ApiError.badRequest(`This position does not offer the ${level} level`);
  }

  const question = await InterviewQuestion.create({
    position: position._id,
    level,
    text,
    options: options.map((option) => ({ text: typeof option === 'string' ? option : option.text })),
    correctIndex,
    explanation,
    topic,
  });

  sendSuccess(res, { question: questionToJSON(question) }, 'Question added', 201);
}

/**
 * PATCH /api/admin/interview/questions/:id
 *
 * Edits a question. Deactivating one is refused when it would leave its
 * position unable to fill a paper — the same guard as activation, applied
 * from the other direction, because the easiest way to break a live
 * position is to switch its questions off one at a time.
 */
export async function updateQuestion(req, res) {
  const question = await InterviewQuestion.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!question) throw ApiError.notFound('Question not found');

  const { level, text, options, correctIndex, explanation, topic, isActive } = req.body;

  if (level !== undefined) question.level = level;
  if (text !== undefined) question.text = text;
  if (options !== undefined) {
    question.options = options.map((option) => ({
      text: typeof option === 'string' ? option : option.text,
    }));
  }
  if (correctIndex !== undefined) question.correctIndex = correctIndex;
  if (explanation !== undefined) question.explanation = explanation;
  if (topic !== undefined) question.topic = topic;
  if (isActive !== undefined) question.isActive = isActive;

  await question.save();

  await guardLivePosition(question.position);

  sendSuccess(res, { question: questionToJSON(question) }, 'Question updated');
}

/**
 * DELETE /api/admin/interview/questions/:id
 * Soft deletes one question, subject to the same guard.
 */
export async function deleteQuestion(req, res) {
  const question = await InterviewQuestion.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!question) throw ApiError.notFound('Question not found');

  question.isDeleted = true;
  await question.save();

  await guardLivePosition(question.position);

  sendSuccess(res, {}, 'Question deleted');
}

/**
 * Switches a position off if it can no longer fill a paper.
 *
 * Taking a question out of use is allowed — refusing it would leave an
 * admin unable to correct a mistake on a live position. What must not
 * happen is the position staying open to users once it cannot examine
 * them, so it is withdrawn instead, and the admin sees it as inactive
 * with the shortfall shown against it.
 *
 * @param {object} positionId - The question's position.
 * @returns {Promise<void>}
 */
async function guardLivePosition(positionId) {
  const position = await InterviewPosition.findById(positionId);
  if (!position?.isActive) return;

  const counts = await countQuestionsByLevel(position);
  if (activationShortfalls(position, counts).length === 0) return;

  position.isActive = false;
  await position.save();
}
