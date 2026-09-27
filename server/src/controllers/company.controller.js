/**
 * Company controller.
 *
 * One company per user. Creating one is what turns an ordinary account
 * into somebody who can post jobs, so there is no role change and no
 * approval step.
 */
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/** Fields a company owner may change. */
const EDITABLE = ['name', 'description', 'website', 'location', 'industry'];

/**
 * GET /api/companies/mine
 * The caller's own company, or null when they have not created one.
 */
export async function getMyCompany(req, res) {
  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });

  if (!company) {
    return sendSuccess(res, { company: null }, 'You have not set up a company yet');
  }

  const [jobCount, applicationCount] = await Promise.all([
    Job.countDocuments({ company: company._id, isDeleted: false }),
    Application.countDocuments({ company: company._id }),
  ]);

  sendSuccess(res, { company, jobCount, applicationCount }, 'Your company');
}

/**
 * POST /api/companies
 * Creates the caller's company.
 */
export async function createCompany(req, res) {
  const existing = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (existing) {
    throw ApiError.conflict('You already have a company. Edit it instead of creating another.');
  }

  const company = await Company.create({
    owner: req.user._id,
    ...Object.fromEntries(EDITABLE.map((field) => [field, req.body[field]]).filter(([, v]) => v)),
  });

  await logActivity({
    userId: req.user._id,
    action: 'COMPANY_CREATE',
    meta: { company: company._id.toString() },
    ip: req.ip,
  });

  sendCreated(res, { company }, 'Company created');
}

/**
 * PUT /api/companies/mine
 * Updates the caller's company.
 */
export async function updateMyCompany(req, res) {
  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company) throw ApiError.notFound('You have not set up a company yet');

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) company[field] = req.body[field];
  }

  await company.save();

  sendSuccess(res, { company }, 'Company updated');
}

/**
 * GET /api/companies/:id
 *
 * Public profile, with that company's open jobs. Used from a job listing
 * so a seeker can see who is hiring.
 */
export async function getCompany(req, res) {
  const company = await Company.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!company) throw ApiError.notFound('Company not found');

  const jobs = await Job.find({ company: company._id, isDeleted: false, status: 'open' })
    .select('title location jobType workMode salaryRange createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // The owner's user id is internal; a visitor has no business with it.
  delete company.owner;

  sendSuccess(res, { company, jobs }, 'Company profile');
}
