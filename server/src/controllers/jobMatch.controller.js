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
import { parseCVText } from '../algorithms/cvImportParser.js';
import { scoreCV } from '../algorithms/cvStrengthScorer.js';
import { extractText } from '../services/documentTextService.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { readPagination, buildPagination } from '../utils/pagination.js';

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
 * Below this many characters, a file has not been read properly — it is
 * usually a scanned image with no text layer. Matches the CV import.
 */
const MIN_IMPORT_CHARACTERS = 40;

/**
 * How many open jobs one upload is ranked against.
 *
 * Every advert in the set is processed and weighted on each request, so
 * this is a cap on the work rather than a page size. 200 covers the whole
 * board comfortably at the size this project runs at, and keeps the
 * response under a second.
 */
const MAX_JOBS_RANKED = 200;

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
  const tailored = await loadTailoredCVs(req.user._id, req.body.jobIds);

  // No primary CV is an ordinary state, not an error. There may still be
  // tailored CVs to report, so this no longer returns early: a user who
  // rewrote a CV for one of these jobs should see that result whether or
  // not they ever got round to starring a CV.
  if (!primary && tailored.size === 0) {
    sendSuccess(res, { cv: null, scores: [] }, 'No primary CV set');
    return;
  }

  const jobs = await Job.find({ _id: { $in: req.body.jobIds }, isDeleted: false }).select(
    'title description skills',
  );

  const primaryScores = primary
    ? scoreJobsAgainstCV(
        primary,
        jobs.map((job) => ({
          id: job._id.toString(),
          text: `${job.title}\n${job.description}\nSkills: ${(job.skills ?? []).join(', ')}`,
        })),
      )
    : [];

  const byJob = new Map(primaryScores.map((score) => [score.id, score]));

  // One row per job the user has something to say about: a primary score,
  // a tailored CV, or both. A job with neither is left out rather than
  // sent as a null, which keeps the "no badge" case on the client a
  // simple missing key.
  const scores = jobs
    .map((job) => {
      const id = job._id.toString();
      const score = byJob.get(id);
      const tailoredCV = tailored.get(id) ?? null;

      if (!score && !tailoredCV) return null;

      return {
        id,
        matchScore: score ? score.matchScore : null,
        band: score ? score.band : null,
        skillCoverage: score ? score.skillCoverage : null,
        tailored: tailoredCV,
      };
    })
    .filter(Boolean);

  sendSuccess(
    res,
    { cv: primary ? { _id: primary._id, title: primary.title } : null, scores },
    'Scored against your primary CV',
  );
}

/**
 * The CVs this user has already tailored for the jobs on screen.
 *
 * Keyed by job id, carrying the two figures recorded when each was saved.
 * They are read back rather than recomputed, for two reasons: they are
 * the numbers the user saw and approved in the review step, so the badge
 * on the board says exactly what the job page said; and the board would
 * otherwise pay for a separate TF-IDF pass per tailored CV to arrive at
 * the same answer.
 *
 * Where a user has tailored more than one CV for the same advert the most
 * recent wins, since that is the one they are working from.
 *
 * @param {string} userId - The caller.
 * @param {string[]} jobIds - The jobs on screen.
 * @returns {Promise<Map<string, object>>} Job id to tailored CV summary.
 */
async function loadTailoredCVs(userId, jobIds) {
  const cvs = await CV.find({
    user: userId,
    isDeleted: false,
    'tailoredFor.job': { $in: jobIds },
  })
    .select('title tailoredFor')
    // Oldest first, so the newest overwrites it in the map below.
    .sort({ 'tailoredFor.tailoredAt': 1 })
    .lean();

  const byJob = new Map();

  for (const cv of cvs) {
    byJob.set(cv.tailoredFor.job.toString(), {
      cvId: cv._id,
      title: cv.title,
      baselineMatchScore: cv.tailoredFor.baselineMatchScore,
      matchScore: cv.tailoredFor.matchScore,
      tailoredAt: cv.tailoredFor.tailoredAt,
    });
  }

  return byJob;
}

/**
 * POST /api/job-match/from-upload
 *
 * Takes a CV file the user has dropped on the job board, reads it, and
 * ranks every open job against it.
 *
 * Nothing is saved. This is a "what would suit me?" question rather than
 * an application, and someone trying the system out should not have a CV
 * and a pile of analyses appear in their account because they dropped a
 * file on a page. The parsed CV goes back to the client, which renders it
 * as a live preview and can offer to save it as a real CV afterwards.
 *
 * The ranking is the project's own cosine similarity over TF-IDF vectors,
 * combined with skill coverage — the same `scoreJobsAgainstCV` the match
 * badges on the board use. Scoring every advert in one corpus (rather
 * than calling `analyseMatch` once per job) is what makes the percentages
 * comparable with each other: identical document frequencies for all of
 * them, so the ordering means something.
 */
export async function matchUploadedCV(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose a CV file');

  const text = await extractText(req.file);

  if (!text || text.trim().length < MIN_IMPORT_CHARACTERS) {
    throw ApiError.badRequest(
      'Almost no text could be read from that file. If it is a scanned image, the text cannot be extracted.',
    );
  }

  const parsed = parseCVText(text);

  // The parser returns CV-shaped data but not a CV document. The scorer
  // and the strength scorer both read plain fields, so a plain object is
  // all either of them needs — and keeping it unsaved is the point.
  const cv = {
    title: parsed.personal?.fullName ? `${parsed.personal.fullName}'s CV` : 'Uploaded CV',
    templateKey: 'ats',
    personal: parsed.personal,
    summary: parsed.summary,
    experience: parsed.experience,
    education: parsed.education,
    skills: parsed.skills,
    projects: parsed.projects,
    certifications: parsed.certifications,
    languages: parsed.languages,
    references: [],
    settings: {},
  };

  const jobs = await Job.find({ isDeleted: false, status: 'open' })
    .select('title description skills location jobType workMode salaryRange company createdAt')
    .populate('company', 'name logoUrl location')
    .sort({ createdAt: -1 })
    .limit(MAX_JOBS_RANKED)
    .lean();

  const scores = scoreJobsAgainstCV(
    cv,
    jobs.map((job) => ({
      id: job._id.toString(),
      text: `${job.title}\n${job.description}\nSkills: ${(job.skills ?? []).join(', ')}`,
    })),
  );

  const scoreById = new Map(scores.map((score) => [score.id, score]));

  // Best match first. That is the whole point of the page, so the order is
  // decided here rather than left to the client.
  const results = jobs
    .map((job) => ({ job, match: scoreById.get(job._id.toString()) ?? null }))
    .sort((a, b) => (b.match?.matchScore ?? 0) - (a.match?.matchScore ?? 0));

  await logActivity({
    userId: req.user._id,
    action: 'JOB_MATCH',
    meta: { source: 'upload', jobsRanked: results.length, filename: req.file.originalname },
    ip: req.ip,
  });

  sendSuccess(
    res,
    {
      cv,
      strength: scoreCV(cv),
      results,
      stats: { ...parsed.stats, jobsRanked: results.length },
    },
    `Read your CV and ranked ${results.length} open jobs`,
  );
}

/**
 * GET /api/job-match
 *
 * The caller's own analysis history, newest first.
 *
 * This used to return the most recent 50 with no way to reach the rest,
 * which quietly hid a user's older analyses from them. Paginating it means
 * the whole history is reachable and the response size stays fixed however
 * many analyses someone has run.
 */
export async function listJobMatches(req, res) {
  const { page, limit, skip } = readPagination(req, 10);
  const filter = { user: req.user._id };

  const [jobMatches, total] = await Promise.all([
    JobMatch.find(filter)
      .select('cv jobTitle matchScore skillCoverage missingSkills createdAt')
      .populate('cv', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    JobMatch.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    { jobMatches, pagination: buildPagination({ page, limit }, total) },
    'Your match history',
  );
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
