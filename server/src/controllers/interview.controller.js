/**
 * Interview preparation, user side: search, study, sit an exam, see the
 * result.
 *
 * One rule governs this whole file: **a correct answer never leaves the
 * server while an exam is open.** Study mode gives the answers away
 * deliberately, and the review after submitting does too — but anything
 * returned between starting a paper and submitting it is stripped first.
 * The alternative is an exam whose answers are in the network tab, which
 * is no exam at all.
 */
import { InterviewPosition } from '../models/InterviewPosition.js';
import { CV } from '../models/CV.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { searchPositions } from '../algorithms/positionSearch.js';
import { createPaper } from '../algorithms/examPaper.js';
import { scoreExam } from '../algorithms/examScorer.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { poolFor, countsFor as poolCounts } from '../services/questionPool.js';

/**
 * Shapes a position for the user's search results.
 * @param {object} position - The position.
 * @param {Record<string, number>} counts - Active questions by level.
 * @returns {object}
 */
function positionToJSON(position, counts = {}) {
  return {
    id: position._id?.toString(),
    title: position.title,
    slug: position.slug,
    description: position.description,
    industry: position.industry,
    tags: position.tags ?? [],
    levels: position.levels ?? [],
    questionCounts: counts,
    examSettings: {
      questionCount: position.examSettings?.questionCount,
      passMark: position.examSettings?.passMark,
      timeLimitMinutes: position.examSettings?.timeLimitMinutes,
    },
  };
}

/**
 * The paper as the candidate must see it: no answers, no explanations.
 * @param {Array<object>} paper - The stored paper.
 * @returns {Array<object>} Questions and options only.
 */
function paperWithoutAnswers(paper) {
  return paper.map((entry, index) => ({
    number: index + 1,
    text: entry.text,
    options: entry.options.map((option) => ({ text: option.text })),
  }));
}

/**
 * The paper as the review screen shows it, once marking is done.
 * @param {object} attempt - A submitted attempt.
 * @returns {Array<object>} Every question with the answers and the why.
 */
function paperWithAnswers(attempt) {
  return attempt.paper.map((entry, index) => ({
    number: index + 1,
    text: entry.text,
    options: entry.options.map((option) => ({ text: option.text })),
    correctIndex: entry.correctIndex,
    chosenIndex: attempt.answers?.[index] ?? null,
    isCorrect: attempt.answers?.[index] === entry.correctIndex,
    explanation: entry.explanation,
    topic: entry.topic,
  }));
}

/**
 * Counts active questions per level for a set of positions, in one query.
 * @param {Array<object>} positions - The positions.
 * @returns {Promise<Map<string, Record<string, number>>>} Counts by position id.
 */
async function countsFor(positions) {
  const counts = new Map();

  // Counted through the shared pool service, so these numbers include
  // the questions a position inherits from its category and agree with
  // what the exam will actually find.
  await Promise.all(
    positions.map(async (position) => {
      counts.set(position._id.toString(), await poolCounts(position, position.levels ?? []));
    }),
  );

  return counts;
}

/**
 * The job titles on a user's primary CV, as a search query.
 *
 * Only the headline and the positions held are used. The whole CV would
 * be worse, not better: a summary mentioning "stakeholders" and
 * "budgets" drags the ranking towards every management role rather than
 * the job this person actually does.
 *
 * @param {string} userId - Whose CV to read.
 * @returns {Promise<string>} A query, or '' when there is no CV.
 */
async function primaryCVQuery(userId) {
  const cv = await CV.findOne({ user: userId, isDeleted: false })
    .sort({ isPrimary: -1, updatedAt: -1 })
    .select(
      'personal.headline experience.position education.fieldOfStudy skills.name projects.technologies',
    )
    .lean();

  if (!cv) return '';

  /*
   * Weighted by repetition rather than by a scoring parameter.
   *
   * `searchPositions` scores a term once however often it appears, so
   * repeating a phrase cannot inflate it — what repetition buys here is
   * nothing, and the real weighting comes from *which* fields are
   * included at all. The headline and recent job titles are the
   * strongest signal of the job somebody holds; skills and technologies
   * disambiguate between roles that share a title ("Engineer" could be
   * anything until the skills say Kubernetes or structural steel);
   * field of study is the fallback for somebody with no work history,
   * which is exactly the user most in need of a suggestion.
   *
   * The summary is still left out on purpose: it is prose about
   * stakeholders and delivery that drags every CV towards management.
   */
  const parts = [
    cv.personal?.headline ?? '',
    ...(cv.experience ?? []).slice(0, 4).map((entry) => entry.position ?? ''),
    ...(cv.skills ?? []).slice(0, 12).map((skill) => skill.name ?? ''),
    ...(cv.projects ?? []).flatMap((project) => project.technologies ?? []).slice(0, 8),
    ...(cv.education ?? []).slice(0, 2).map((entry) => entry.fieldOfStudy ?? ''),
  ];

  return parts.filter(Boolean).join(' ').trim();
}

/**
 * GET /api/interview/positions
 *
 * The positions a user can prepare for, ranked against their search.
 * Only active positions are listed, so nothing half-written is visible.
 */
export async function listPositions(req, res) {
  const { search = '', level, suggested } = req.query;

  const filter = { isActive: true, isDeleted: false };
  if (level) filter.levels = level;

  const positions = await InterviewPosition.find(filter).lean();

  /*
   * With hundreds of positions offered, listing all of them is not a
   * starting point — it is a wall. When the user has not typed anything,
   * their own CV is the best guess at what they are preparing for, so
   * its headline and job titles become the query.
   *
   * It is only a default. Typing anything searches the whole catalogue,
   * which is why the flag is a query parameter rather than a mode.
   */
  if (suggested === 'true' && !search.trim()) {
    const fromCV = await primaryCVQuery(req.user._id);

    if (fromCV) {
      const suggestions = searchPositions(positions, fromCV).slice(0, 12);

      if (suggestions.length > 0) {
        const suggestedCounts = await countsFor(suggestions);

        sendSuccess(
          res,
          {
            positions: suggestions.map((position) =>
              positionToJSON(position, suggestedCounts.get(position._id.toString()) ?? {}),
            ),
            basedOnCV: true,
          },
          'Suggested positions',
        );
        return;
      }
    }
  }

  // Ranking is done here rather than in Mongo because the matching is
  // ours: stemming "dev" onto "Developer" is not something a text index
  // would do, and the list is small enough that memory is the right
  // place for it.
  const ranked = searchPositions(positions, search);
  const counts = await countsFor(ranked);

  sendSuccess(
    res,
    {
      positions: ranked.map((position) =>
        positionToJSON(position, counts.get(position._id.toString()) ?? {}),
      ),
    },
    'Positions',
  );
}

/**
 * GET /api/interview/positions/:slug
 * One position, with how many questions each level actually has.
 */
export async function getPosition(req, res) {
  const position = await InterviewPosition.findOne({
    slug: req.params.slug,
    isActive: true,
    isDeleted: false,
  }).lean();

  if (!position) throw ApiError.notFound('That position is not available');

  const counts = await countsFor([position]);

  sendSuccess(
    res,
    { position: positionToJSON(position, counts.get(position._id.toString()) ?? {}) },
    'Position',
  );
}

/**
 * GET /api/interview/positions/:slug/study
 *
 * Study mode: every question at one level, **with** the correct answer
 * and the explanation. Giving the answers away is the point here — this
 * is revision, not assessment.
 */
export async function getStudyQuestions(req, res) {
  const { level } = req.query;

  const position = await InterviewPosition.findOne({
    slug: req.params.slug,
    isActive: true,
    isDeleted: false,
  }).lean();

  if (!position) throw ApiError.notFound('That position is not available');
  if (!position.levels.includes(level)) {
    throw ApiError.badRequest(`This position does not offer the ${level} level`);
  }

  // The position's own questions, plus its category's shared bank.
  const questions = (await poolFor(position, level)).sort((a, b) =>
    (a.topic ?? '').localeCompare(b.topic ?? ''),
  );

  sendSuccess(
    res,
    {
      position: positionToJSON(position),
      level,
      // Study mode is not a quiz: it gives the answer outright and the
      // reasoning behind it. The four options are deliberately left out
      // — recognising the right one from a list is a weaker thing to
      // practise than recalling it, and the options are the exam's job.
      questions: questions.map((question) => ({
        id: question._id.toString(),
        text: question.text,
        answer: question.options[question.correctIndex]?.text ?? '',
        explanation: question.explanation,
        topic: question.topic,
      })),
    },
    'Study questions',
  );
}

/**
 * POST /api/interview/exams
 *
 * Starts a sitting: builds the paper, stores it frozen, and returns it
 * without the answers.
 */
export async function startExam(req, res) {
  const { positionId, level } = req.body;

  const position = await InterviewPosition.findOne({
    _id: positionId,
    isActive: true,
    isDeleted: false,
  });

  if (!position) throw ApiError.notFound('That position is not available');

  // A level is optional, and leaving it out is now the normal case: an
  // exam draws from junior, mid and senior together, because a real
  // interview does not announce which questions are the easy ones. A
  // level can still be given to practise one band deliberately.
  if (level && !position.levels.includes(level)) {
    throw ApiError.badRequest(`This position does not offer the ${level} level`);
  }

  const pool = await poolFor(position, level);

  const count = position.examSettings.questionCount;

  // The activation guard should make this unreachable; it is checked
  // again because "should be unreachable" is not a guarantee, and the
  // alternative is a paper silently shorter than advertised.
  if (pool.length < count) {
    throw ApiError.badRequest('This exam is not ready yet. Please try again later.');
  }

  // The user's own history at this position and level, newest first, so
  // the paper can favour what they got wrong and avoid repeating their
  // last one exactly.
  const attempts = await ExamAttempt.find({
    user: req.user._id,
    position: position._id,
    level: level ?? 'mixed',
    submittedAt: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const paper = createPaper({ pool, count, attempts, seed: Date.now() });

  const attempt = await ExamAttempt.create({
    user: req.user._id,
    position: position._id,
    positionTitle: position.title,
    level: level ?? 'mixed',
    paper,
    answers: new Array(paper.length).fill(null),
    passMark: position.examSettings.passMark,
    timeLimitMinutes: position.examSettings.timeLimitMinutes,
    startedAt: new Date(),
  });

  sendSuccess(
    res,
    {
      attempt: {
        id: attempt._id.toString(),
        positionTitle: position.title,
        level: attempt.level,
        passMark: attempt.passMark,
        timeLimitMinutes: attempt.timeLimitMinutes,
        startedAt: attempt.startedAt,
        questions: paperWithoutAnswers(paper),
      },
    },
    'Exam started',
    201,
  );
}

/**
 * GET /api/interview/exams/:id
 *
 * Resumes an open attempt, or returns the full review of a submitted
 * one. Which of those it is decides how much is safe to send.
 */
export async function getExam(req, res) {
  const attempt = await ExamAttempt.findOne({ _id: req.params.id, user: req.user._id });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  if (attempt.submittedAt) {
    sendSuccess(res, { attempt: reviewJSON(attempt) }, 'Exam result');
    return;
  }

  sendSuccess(
    res,
    {
      attempt: {
        id: attempt._id.toString(),
        positionTitle: attempt.positionTitle,
        level: attempt.level,
        passMark: attempt.passMark,
        timeLimitMinutes: attempt.timeLimitMinutes,
        startedAt: attempt.startedAt,
        answers: attempt.answers,
        questions: paperWithoutAnswers(attempt.paper),
      },
    },
    'Exam in progress',
  );
}

/**
 * POST /api/interview/exams/:id/submit
 *
 * Marks the paper. The answers arrive as an array of chosen option
 * indexes, one per question, with null for anything left blank.
 */
export async function submitExam(req, res) {
  const attempt = await ExamAttempt.findOne({ _id: req.params.id, user: req.user._id });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  // Marking twice would let somebody resubmit with the answers they
  // learnt from the first result.
  if (attempt.submittedAt) throw ApiError.badRequest('This exam has already been submitted');

  const given = Array.isArray(req.body.answers) ? req.body.answers : [];

  // Normalised against the paper rather than trusted: an array of the
  // wrong length, or an index outside the options, becomes "unanswered".
  const answers = attempt.paper.map((entry, index) => {
    const value = given[index];
    const isValid = Number.isInteger(value) && value >= 0 && value < entry.options.length;
    return isValid ? value : null;
  });

  const result = scoreExam(attempt.paper, answers, attempt.passMark);

  attempt.answers = answers;
  attempt.score = result.score;
  attempt.passed = result.passed;
  attempt.correctCount = result.correctCount;
  attempt.breakdown = result.breakdown;
  attempt.weakestTopics = result.weakestTopics;
  attempt.suggestions = result.suggestions;
  attempt.submittedAt = new Date();

  await attempt.save();

  await logActivity({
    userId: req.user._id,
    action: 'EXAM_SUBMIT',
    meta: {
      position: attempt.positionTitle,
      level: attempt.level,
      score: result.score,
      passed: result.passed,
    },
    ip: req.ip,
  });

  sendSuccess(res, { attempt: reviewJSON(attempt) }, 'Exam submitted');
}

/**
 * GET /api/interview/exams
 * The user's own attempts, newest first.
 */
export async function listExams(req, res) {
  const attempts = await ExamAttempt.find({ user: req.user._id, submittedAt: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  sendSuccess(
    res,
    {
      attempts: attempts.map((attempt) => ({
        id: attempt._id.toString(),
        positionTitle: attempt.positionTitle,
        level: attempt.level,
        score: attempt.score,
        passed: attempt.passed,
        correctCount: attempt.correctCount,
        total: attempt.paper.length,
        submittedAt: attempt.submittedAt,
      })),
    },
    'Exam history',
  );
}

/**
 * The full result, including every answer and explanation.
 * @param {object} attempt - A submitted attempt.
 * @returns {object}
 */
function reviewJSON(attempt) {
  return {
    id: attempt._id.toString(),
    positionTitle: attempt.positionTitle,
    level: attempt.level,
    score: attempt.score,
    passed: attempt.passed,
    passMark: attempt.passMark,
    correctCount: attempt.correctCount,
    total: attempt.paper.length,
    breakdown: attempt.breakdown,
    weakestTopics: attempt.weakestTopics,
    suggestions: attempt.suggestions,
    submittedAt: attempt.submittedAt,
    questions: paperWithAnswers(attempt),
  };
}
