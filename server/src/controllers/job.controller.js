/**
 * Job controller: the public board, and managing your own postings.
 */
import { Job } from '../models/Job.js';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { SavedJob } from '../models/SavedJob.js';
import { CV } from '../models/CV.js';
import { logActivity } from '../services/activityLogger.js';
import { visibleJobsFilter } from '../services/companyVisibility.js';
import { applyPrimaryBaselines } from '../services/rewriteGrowthService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/** Fields the poster may set or change. */
const EDITABLE = [
  'title',
  'description',
  'location',
  'jobType',
  'workMode',
  'salaryRange',
  'skills',
  'closingDate',
  'status',
];

/** Largest page anyone may request. */
const MAX_PAGE_SIZE = 50;

/**
 * Reads and clamps pagination from the query string.
 * @param {import('express').Request} req
 * @returns {{page: number, limit: number, skip: number}}
 */
function readPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Escapes a search term before it becomes a regular expression, so a
 * search for ".*" is matched literally rather than scanning everything.
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Loads a job the caller is allowed to manage, or throws.
 *
 * An admin may manage any job; everyone else only their own. A job
 * belonging to someone else returns 404 rather than 403, so the response
 * does not confirm that the id exists.
 *
 * @param {string} jobId
 * @param {object} user - The requesting user.
 * @returns {Promise<object>} The job document.
 */
async function findManageableJob(jobId, user) {
  const filter = { _id: jobId, isDeleted: false };
  if (user.role !== 'admin') filter.postedBy = user._id;

  const job = await Job.findOne(filter);
  if (!job) throw ApiError.notFound('Job not found');

  return job;
}

/**
 * GET /api/jobs
 *
 * The public board. No session required: someone should be able to see
 * what is on offer before deciding to sign up.
 */
export async function listJobs(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { search, location, jobType, workMode } = req.query;

  // Only approved companies' jobs are on the public board.
  const filter = await visibleJobsFilter({ isDeleted: false, status: 'open' });

  if (jobType) filter.jobType = jobType;
  if (workMode) filter.workMode = workMode;
  if (location?.trim()) filter.location = new RegExp(escapeRegex(location.trim()), 'i');

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { skills: pattern }];
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .select(
        'title location jobType workMode salaryRange skills closingDate createdAt applicationCount',
      )
      .populate('company', 'name logoUrl location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  // Tell a signed-in user which of these they have already saved or
  // applied to, so the list can show it without a request per row.
  let savedIds = [];
  let appliedIds = [];

  if (req.user) {
    const ids = jobs.map((job) => job._id);
    const [saved, applied] = await Promise.all([
      SavedJob.find({ user: req.user._id, job: { $in: ids } })
        .select('job')
        .lean(),
      Application.find({ applicant: req.user._id, job: { $in: ids } })
        .select('job')
        .lean(),
    ]);
    savedIds = saved.map((row) => row.job.toString());
    appliedIds = applied.map((row) => row.job.toString());
  }

  sendSuccess(
    res,
    {
      jobs: jobs.map((job) => ({
        ...job,
        isSaved: savedIds.includes(job._id.toString()),
        hasApplied: appliedIds.includes(job._id.toString()),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
    'Jobs',
  );
}

/**
 * GET /api/jobs/:id
 * One job in full. Public.
 */
export async function getJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id, isDeleted: false })
    .populate('company', 'name description website location industry logoUrl status')
    .lean();

  if (!job) throw ApiError.notFound('Job not found');

  // A job from a company that is not approved is visible only to the
  // employer who posted it and to the admin.
  const isOwnerOrAdmin =
    req.user && (req.user.role === 'admin' || job.postedBy?.equals?.(req.user._id));
  if (job.company?.status !== 'approved' && !isOwnerOrAdmin) {
    throw ApiError.notFound('Job not found');
  }

  let isSaved = false;
  let hasApplied = false;
  let tailoredCv = null;

  if (req.user) {
    const [saved, applied, tailored] = await Promise.all([
      SavedJob.exists({ user: req.user._id, job: job._id }),
      Application.exists({ applicant: req.user._id, job: job._id }),

      // The CV this user has already rewritten for this advert, if any.
      // It is what lets the page show the growth the rewrite delivered
      // after a reload, instead of the figures vanishing the moment the
      // user navigates away from the review step.
      CV.findOne({ user: req.user._id, isDeleted: false, 'tailoredFor.job': job._id })
        .select('title tailoredFor')
        .sort({ 'tailoredFor.tailoredAt': -1 })
        .lean(),
    ]);

    isSaved = Boolean(saved);
    hasApplied = Boolean(applied);

    if (tailored) {
      tailoredCv = {
        _id: tailored._id,
        cvId: tailored._id,
        jobId: job._id,
        title: tailored.title,
        baselineMatchScore: tailored.tailoredFor.baselineMatchScore,
        matchScore: tailored.tailoredFor.matchScore,
        tailoredAt: tailored.tailoredFor.tailoredAt,
      };
      // "Before" is the current primary CV's score for this job.
      await applyPrimaryBaselines(req.user._id, [tailoredCv]);
    }
  }

  sendSuccess(res, { job, isSaved, hasApplied, tailoredCv }, 'Job');
}

/**
 * POST /api/jobs
 * Posts a job under the caller's company.
 */
export async function createJob(req, res) {
  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company) {
    throw ApiError.badRequest('Set up your company before posting a job');
  }
  if (company.status !== 'approved') {
    throw ApiError.forbidden(
      company.status === 'rejected'
        ? 'Your company was not approved. Update it and resubmit before posting jobs.'
        : 'Your company is waiting for admin approval. You can post jobs once it is approved.',
    );
  }

  const job = await Job.create({
    company: company._id,
    postedBy: req.user._id,
    ...Object.fromEntries(
      EDITABLE.map((field) => [field, req.body[field]]).filter(([, value]) => value !== undefined),
    ),
  });

  await logActivity({
    userId: req.user._id,
    action: 'JOB_CREATE',
    meta: { job: job._id.toString(), title: job.title },
    ip: req.ip,
  });

  sendCreated(res, { job }, 'Job posted');
}

/**
 * PUT /api/jobs/:id
 * Updates a job the caller owns.
 */
export async function updateJob(req, res) {
  const job = await findManageableJob(req.params.id, req.user);

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) job[field] = req.body[field];
  }

  await job.save();

  sendSuccess(res, { job }, 'Job updated');
}

/**
 * DELETE /api/jobs/:id
 *
 * Soft delete, so the applications made to it remain readable. Removing
 * the job outright would strand every application that references it.
 */
export async function deleteJob(req, res) {
  const job = await findManageableJob(req.params.id, req.user);

  job.isDeleted = true;
  job.status = 'closed';
  await job.save();

  await logActivity({
    userId: req.user._id,
    action: 'JOB_DELETE',
    meta: { job: job._id.toString() },
    ip: req.ip,
  });

  sendSuccess(res, null, 'Job removed');
}

/**
 * GET /api/jobs/mine/posted
 * The caller's own postings, including closed ones.
 */
export async function listMyJobs(req, res) {
  const jobs = await Job.find({ postedBy: req.user._id, isDeleted: false })
    .select('title location jobType status applicationCount closingDate createdAt')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { jobs }, 'Your job postings');
}

// --- Saved jobs -----------------------------------------------------------

/**
 * POST /api/jobs/:id/save
 *
 * Bookmarks a job. Deliberately idempotent: saving twice succeeds rather
 * than erroring, because a user clicking the button again means "I want
 * this saved", not "fail".
 */
export async function saveJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id, isDeleted: false });
  if (!job) throw ApiError.notFound('Job not found');

  await SavedJob.updateOne(
    { user: req.user._id, job: job._id },
    { $setOnInsert: { user: req.user._id, job: job._id } },
    { upsert: true },
  );

  sendSuccess(res, null, 'Job saved');
}

/**
 * DELETE /api/jobs/:id/save
 * Removes a bookmark. Also idempotent.
 */
export async function unsaveJob(req, res) {
  await SavedJob.deleteOne({ user: req.user._id, job: req.params.id });
  sendSuccess(res, null, 'Job removed from your saved list');
}

/**
 * GET /api/jobs/mine/saved
 * The caller's saved jobs, plus every job they have applied to.
 *
 * An applied job carries a small `application` summary — its id, status,
 * date and the title of the CV that was sent — so the page can offer a
 * preview of exactly what the employer received.
 */
export async function listSavedJobs(req, res) {
  const jobPopulate = {
    path: 'job',
    select: 'title location jobType workMode salaryRange status isDeleted createdAt',
    populate: { path: 'company', select: 'name logoUrl' },
  };

  const [saved, applications] = await Promise.all([
    SavedJob.find({ user: req.user._id }).populate(jobPopulate).lean(),
    Application.find({ applicant: req.user._id })
      .select('job status createdAt cvSnapshot.title')
      .populate(jobPopulate)
      .lean(),
  ]);

  // One row per job. `sortDate` is when the job landed on this list: the
  // later of saving it and applying to it.
  const rows = new Map();

  for (const row of saved) {
    if (!row.job || row.job.isDeleted) continue;
    rows.set(String(row.job._id), {
      job: row.job,
      application: null,
      isSaved: true,
      sortDate: row.createdAt,
    });
  }

  for (const app of applications) {
    // A posting removed since is filtered out rather than shown as a broken row.
    if (!app.job || app.job.isDeleted) continue;

    const key = String(app.job._id);
    const application = {
      id: app._id,
      status: app.status,
      appliedAt: app.createdAt,
      cvTitle: app.cvSnapshot?.title ?? '',
    };

    const existing = rows.get(key);
    const sortDate =
      existing && existing.sortDate > app.createdAt ? existing.sortDate : app.createdAt;
    rows.set(key, { job: app.job, application, isSaved: Boolean(existing?.isSaved), sortDate });
  }

  const jobs = [...rows.values()]
    .sort((a, b) => b.sortDate - a.sortDate)
    .map(({ job, application, isSaved }) => ({ ...job, application, isSaved }));

  sendSuccess(res, { jobs }, 'Your saved jobs');
}
