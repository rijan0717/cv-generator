/**
 * Job controller: the public board, and managing your own postings.
 */
import { Job } from '../models/Job.js';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { SavedJob } from '../models/SavedJob.js';
import { logActivity } from '../services/activityLogger.js';
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

  const filter = { isDeleted: false, status: 'open' };

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
    .populate('company', 'name description website location industry logoUrl')
    .lean();

  if (!job) throw ApiError.notFound('Job not found');

  let isSaved = false;
  let hasApplied = false;

  if (req.user) {
    const [saved, applied] = await Promise.all([
      SavedJob.exists({ user: req.user._id, job: job._id }),
      Application.exists({ applicant: req.user._id, job: job._id }),
    ]);
    isSaved = Boolean(saved);
    hasApplied = Boolean(applied);
  }

  sendSuccess(res, { job, isSaved, hasApplied }, 'Job');
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
 * The caller's saved jobs.
 */
export async function listSavedJobs(req, res) {
  const saved = await SavedJob.find({ user: req.user._id })
    .populate({
      path: 'job',
      select: 'title location jobType workMode salaryRange status isDeleted createdAt',
      populate: { path: 'company', select: 'name logoUrl' },
    })
    .sort({ createdAt: -1 })
    .lean();

  // A saved job whose posting has since been removed is filtered out
  // rather than shown as a broken row.
  const jobs = saved.map((row) => row.job).filter((job) => job && !job.isDeleted);

  sendSuccess(res, { jobs }, 'Your saved jobs');
}
