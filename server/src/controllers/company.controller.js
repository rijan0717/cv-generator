/**
 * Company controller.
 *
 * One company per user. Creating one is what turns an ordinary account
 * into somebody who can post jobs, so there is no role change and no
 * approval step.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { UPLOAD_DIR, COMPANY_DOC_DIR } from '../middleware/upload.js';

/** Fields a company owner may change. */
const EDITABLE = [
  'name',
  'description',
  'website',
  'location',
  'industry',
  'registrationNumber',
  'phone',
  'email',
];

/**
 * Once the admin approves a company its details are locked — what was
 * checked is what stays on the board. Only the logo can still change.
 */
const LOCKED_MESSAGE =
  'An approved company cannot be edited. Only the logo can be changed; contact the admin for anything else.';

/**
 * The owner's view of their company: everything, plus whether a
 * registration document is on file (the file name itself stays private).
 * @param {import('mongoose').Document} company
 * @returns {object}
 */
function ownerView(company) {
  return { ...company.toJSON(), hasDocument: Boolean(company.documentFile) };
}

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

  sendSuccess(res, { company: ownerView(company), jobCount, applicationCount }, 'Your company');
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

  // Every new company waits for the admin before it can post jobs.
  const company = await Company.create({
    owner: req.user._id,
    ...Object.fromEntries(EDITABLE.map((field) => [field, req.body[field]]).filter(([, v]) => v)),
    status: 'pending',
    submittedAt: new Date(),
  });

  await logActivity({
    userId: req.user._id,
    action: 'COMPANY_CREATE',
    meta: { company: company._id.toString() },
    ip: req.ip,
  });

  sendCreated(
    res,
    { company: ownerView(company) },
    'Company submitted. An admin will review it before you can post jobs.',
  );
}

/**
 * PUT /api/companies/mine
 * Updates the caller's company.
 */
export async function updateMyCompany(req, res) {
  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company) throw ApiError.notFound('You have not set up a company yet');

  if (company.status === 'approved') throw ApiError.forbidden(LOCKED_MESSAGE);

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) company[field] = req.body[field];
  }

  // A rejected company is resubmitted by editing it.
  let message = 'Company updated';
  if (company.status === 'rejected') {
    company.status = 'pending';
    company.rejectionReason = '';
    company.submittedAt = new Date();
    message = 'Company resubmitted for review';
  }

  await company.save();

  sendSuccess(res, { company: ownerView(company) }, message);
}

/**
 * POST /api/companies/mine/logo
 *
 * Stores the company logo. Jobseekers see it on every job card and on the
 * advert itself, so it is the one piece of the profile that reaches people
 * who never open the company page.
 *
 * The previous file is removed after the new one is saved, so uploads do
 * not accumulate on disk — the same rule the CV photo follows.
 */
export async function uploadLogo(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');

  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company) throw ApiError.notFound('You have not set up a company yet');

  const previous = company.logoUrl;

  company.logoUrl = `/uploads/${req.file.filename}`;
  await company.save();

  if (previous?.startsWith('/uploads/')) {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(previous))).catch(() => {});
  }

  sendSuccess(res, { company: ownerView(company) }, 'Logo updated');
}

/**
 * DELETE /api/companies/mine/logo
 * Removes the logo and the file behind it.
 */
export async function removeLogo(req, res) {
  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company) throw ApiError.notFound('You have not set up a company yet');

  const previous = company.logoUrl;
  company.logoUrl = '';
  await company.save();

  if (previous?.startsWith('/uploads/')) {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(previous))).catch(() => {});
  }

  sendSuccess(res, { company: ownerView(company) }, 'Logo removed');
}

/**
 * GET /api/companies/:id
 *
 * Public profile, with that company's open jobs. Used from a job listing
 * so a seeker can see who is hiring.
 */
export async function getCompany(req, res) {
  // Only an approved company has a public profile.
  const company = await Company.findOne({
    _id: req.params.id,
    isDeleted: false,
    status: 'approved',
  }).lean();
  if (!company) throw ApiError.notFound('Company not found');
  delete company.documentFile;
  delete company.registrationNumber;
  delete company.rejectionReason;
  delete company.reviewedBy;

  const jobs = await Job.find({ company: company._id, isDeleted: false, status: 'open' })
    .select('title location jobType workMode salaryRange createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // The owner's user id is internal; a visitor has no business with it.
  delete company.owner;

  sendSuccess(res, { company, jobs }, 'Company profile');
}

/**
 * POST /api/companies/mine/document
 *
 * Stores the registration certificate the admin checks before approving.
 * Replacing it on a rejected company resubmits the company for review.
 */
export async function uploadDocument(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose the registration document');

  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });
  if (!company || company.status === 'approved') {
    await fs.unlink(req.file.path).catch(() => {});
    if (!company) throw ApiError.notFound('You have not set up a company yet');
    throw ApiError.forbidden(LOCKED_MESSAGE);
  }

  const previous = company.documentFile;
  company.documentFile = req.file.filename;

  if (company.status === 'rejected') {
    company.status = 'pending';
    company.rejectionReason = '';
    company.submittedAt = new Date();
  }

  await company.save();

  if (previous) {
    await fs.unlink(path.join(COMPANY_DOC_DIR, path.basename(previous))).catch(() => {});
  }

  sendSuccess(res, { company: ownerView(company) }, 'Registration document uploaded');
}

/**
 * GET /api/companies/:id/document
 *
 * Streams the registration document to the company's owner or an admin.
 * Anyone else gets 404, so the route does not reveal that a file exists.
 */
export async function downloadDocument(req, res) {
  const company = await Company.findOne({ _id: req.params.id, isDeleted: false });
  const allowed = company && (req.user.role === 'admin' || company.owner.equals(req.user._id));

  if (!allowed || !company.documentFile) throw ApiError.notFound('Document not found');

  // basename() keeps the stored name from ever pointing outside the folder.
  res.sendFile(path.join(COMPANY_DOC_DIR, path.basename(company.documentFile)));
}
