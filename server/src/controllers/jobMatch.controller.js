/**
 * CV–Job Match controller.
 *
 * The analysis itself lives in `algorithms/jobMatcher.js` and is pure. This
 * file does only what a controller should: check the CV belongs to the
 * caller, assemble the corpus from the database, hand both to the
 * algorithm, store the result and log the event.
 */
import { CV } from '../models/CV.js';
import { Job } from '../models/Job.js';
import { JobMatch } from '../models/JobMatch.js';
import { analyseMatch, scoreJobsAgainstCV } from '../algorithms/jobMatcher.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * How many previously analysed adverts are added to the TF-IDF corpus.
 *
 * The corpus only needs to be big enough for document frequencies to be
 * meaningful; past that, each extra document costs processing time on
 * every request and changes the weights barely at all. 200 is a cap on
 * the work, not a statistical limit.
 */
const MAX_CORPUS_HISTORY = 200;

/**
 * Loads a CV that belongs to the given user, or throws 404.
 *
 * Someone else's id gives 404 rather than 403 for the same reason as in
 * `cv.controller.js`: 403 would confirm the id is real.
 *
 * @param {string} cvId - The CV's id.
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<object>} The CV document.
 */
async function findOwnedCV(cvId, userId) {
  const cv = await CV.findOne({ _id: cvId, user: userId, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');
  return cv;
}

/**
 * Works out what text to analyse against.
 *
 * The advert can come from the job board (`jobId`) or be pasted in
 * (`jobDescription`). A job id is resolved to its stored text, and its
 * skills are appended, because they are shown as tags on the listing and
 * are part of what the advert asks for even though they sit outside the
 * description field.
 *
 * @param {object} body - The request body.
 * @returns {Promise<{jobText: string, jobTitle: string, jobId: string|null}>}
 */
async function resolveJobText(body) {
  const { jobId, jobDescription, jobTitle } = body;

  if (jobId) {
    const job = await Job.findOne({ _id: jobId, isDeleted: false });
    if (!job) throw ApiError.notFound('Job not found');

    const skillsLine = job.skills?.length ? `\nSkills: ${job.skills.join(', ')}` : '';

    return {
      jobText: `${job.title}\n${job.description}${skillsLine}`,
      jobTitle: jobTitle || job.title,
      jobId: job._id,
    };
  }

  return {
    jobText: jobDescription,
    jobTitle: jobTitle || '',
    jobId: null,
  };
}

/**
 * POST /api/job-match
 * Analyses one of the caller's CVs against a job description and stores
 * the result.
 */
export async function createJobMatch(req, res) {
  const cv = await findOwnedCV(req.body.cvId, req.user._id);
  const { jobText, jobTitle, jobId } = await resolveJobText(req.body);

  // Every advert analysed before this one joins the corpus, so the weights
  // get better the more the system is used. Only the text is selected —
  // loading whole documents here would be wasteful.
  const previous = await JobMatch.find({})
    .select('jobDescription')
    .sort({ createdAt: -1 })
    .limit(MAX_CORPUS_HISTORY)
    .lean();

  const analysis = analyseMatch(cv, jobText, {
    priorJobDescriptions: previous.map((entry) => entry.jobDescription),
  });

  const jobMatch = await JobMatch.create({
    user: req.user._id,
    cv: cv._id,
    job: jobId,
    jobTitle,
    jobDescription: jobText,
    matchScore: analysis.matchScore,
    cosineSimilarity: analysis.cosineSimilarity,
    skillCoverage: analysis.skillCoverage,
    matchedKeywords: analysis.matchedKeywords,
    missingKeywords: analysis.missingKeywords,
    matchedSkills: analysis.matchedSkills,
    missingSkills: analysis.missingSkills,
    suggestions: analysis.suggestions,
  });

  await logActivity({
    userId: req.user._id,
    action: 'JOB_MATCH',
    cvId: cv._id,
    meta: { jobTitle, matchScore: analysis.matchScore, missing: analysis.missingSkills.length },
    ip: req.ip,
  });

  // The stored document plus the parts of the analysis that are useful to
  // show but not worth keeping (the scaling working, the corpus size).
  sendCreated(
    res,
    {
      jobMatch,
      analysis: {
        band: analysis.band,
        scaledSimilarity: analysis.scaledSimilarity,
        mentionedButNotListed: analysis.mentionedButNotListed,
        corpusSize: analysis.corpusSize,
      },
    },
    'Analysis complete',
  );
}

/**
 * POST /api/job-match/scores
 * Scores a page of jobs against the caller's primary CV, for the match
 * badges on the job board.
 *
 * It is a separate request from the board itself on purpose. The board is
 * public and must stay fast for a visitor who is not signed in; the
 * badges are a signed-in extra that can arrive a moment later without
 * anybody waiting for them.
 *
 * Nothing is stored. These are read-only estimates — the analysis a user
 * keeps is the one they run deliberately from a CV.
 */
export async function scoreJobsForBoard(req, res) {
  const primary = await CV.findOne({ user: req.user._id, isPrimary: true, isDeleted: false });

  // No primary CV is an ordinary state, not an error: the client simply
  // shows no badges, and can prompt the user to choose one.
  if (!primary) {
    sendSuccess(res, { cv: null, scores: [] }, 'No primary CV set');
    return;
  }

  const jobs = await Job.find({ _id: { $in: req.body.jobIds }, isDeleted: false }).select(
    'title description skills',
  );

  const scores = scoreJobsAgainstCV(
    primary,
    jobs.map((job) => ({
      id: job._id.toString(),
      text: `${job.title}\n${job.description}\nSkills: ${(job.skills ?? []).join(', ')}`,
    })),
  );

  sendSuccess(
    res,
    { cv: { _id: primary._id, title: primary.title }, scores },
    'Scored against your primary CV',
  );
}

/**
 * GET /api/job-match
 * The caller's own analysis history, newest first.
 */
export async function listJobMatches(req, res) {
  const jobMatches = await JobMatch.find({ user: req.user._id })
    .select('cv jobTitle matchScore skillCoverage missingSkills createdAt')
    .populate('cv', 'title')
    .sort({ createdAt: -1 })
    .limit(50);

  sendSuccess(res, { jobMatches }, 'Your match history');
}

/**
 * GET /api/job-match/:id
 * One stored analysis in full.
 */
export async function getJobMatch(req, res) {
  const jobMatch = await JobMatch.findOne({ _id: req.params.id, user: req.user._id }).populate(
    'cv',
    'title templateKey',
  );

  if (!jobMatch) throw ApiError.notFound('Analysis not found');

  sendSuccess(res, { jobMatch }, 'Analysis loaded');
}

/**
 * DELETE /api/job-match/:id
 * Removes one analysis from the caller's history.
 *
 * A hard delete, unlike a CV. There is nothing to recover and no report
 * depends on an individual row.
 */
export async function deleteJobMatch(req, res) {
  const deleted = await JobMatch.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw ApiError.notFound('Analysis not found');

  sendSuccess(res, null, 'Analysis deleted');
}
