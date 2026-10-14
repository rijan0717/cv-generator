/**
 * Admin company review.
 *
 * Every company an employer registers starts `pending`. The admin checks
 * its details and registration document here and approves or rejects it.
 * Only an approved company can post jobs, and only its jobs are public.
 *
 * Reached only through `/api/admin`, which applies `requireAuth` and
 * `requireAdmin` to every route once.
 */
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { readPagination, buildPagination } from '../utils/pagination.js';

/** The review states, in the order the admin page shows them. */
export const COMPANY_STATUSES = ['pending', 'approved', 'rejected'];

/** Escapes text for use inside a regular expression. */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The fields the admin list and detail need, with the private document
 * reduced to a yes/no.
 * @param {object} company - A lean company document with `owner` populated.
 * @returns {object}
 */
function adminView(company) {
  const { documentFile, ...rest } = company;
  return { ...rest, hasDocument: Boolean(documentFile) };
}

/**
 * GET /api/admin/companies?status=pending&search=&page=
 *
 * One status at a time (pending by default, oldest submission first, so
 * the queue is worked in order), plus the count for every status so the
 * page can label its tabs.
 */
export async function listCompanies(req, res) {
  const { page, limit, skip } = readPagination(req, 20);
  const status = req.query.status || 'pending';

  const filter = { isDeleted: false, status };
  if (req.query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { registrationNumber: pattern }, { location: pattern }];
  }

  const [companies, total, counts] = await Promise.all([
    Company.find(filter)
      .populate('owner', 'name email')
      .sort({ submittedAt: status === 'pending' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Company.countDocuments(filter),
    Company.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const countByStatus = Object.fromEntries(COMPANY_STATUSES.map((s) => [s, 0]));
  for (const row of counts) countByStatus[row._id] = row.count;

  sendSuccess(
    res,
    {
      companies: companies.map(adminView),
      counts: countByStatus,
      pagination: buildPagination({ page, limit }, total),
    },
    'Companies',
  );
}

/**
 * GET /api/admin/companies/:id
 * One company in full, with its owner and how many jobs it has posted.
 */
export async function getCompanyForReview(req, res) {
  const company = await Company.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'name email createdAt')
    .populate('reviewedBy', 'name')
    .lean();
  if (!company) throw ApiError.notFound('Company not found');

  const jobCount = await Job.countDocuments({ company: company._id, isDeleted: false });

  sendSuccess(res, { company: adminView(company), jobCount }, 'Company');
}

/**
 * PATCH /api/admin/companies/:id/status   body: { status, reason }
 *
 * Approves or rejects a company.
 *   - Approving needs a registration document on file: approving a
 *     company nobody could check would make the review meaningless.
 *   - Rejecting needs a reason, which the employer sees so they know what
 *     to fix before resubmitting.
 */
export async function reviewCompany(req, res) {
  const { status, reason = '' } = req.body;

  const company = await Company.findOne({ _id: req.params.id, isDeleted: false });
  if (!company) throw ApiError.notFound('Company not found');

  if (status === 'approved' && !company.documentFile) {
    throw ApiError.badRequest(
      'This company has not uploaded a registration document, so it cannot be approved yet',
    );
  }
  if (status === 'rejected' && reason.trim().length < 5) {
    throw ApiError.badRequest('Please give the employer a reason for the rejection');
  }

  company.status = status;
  company.rejectionReason = status === 'rejected' ? reason.trim() : '';
  company.reviewedAt = new Date();
  company.reviewedBy = req.user._id;
  await company.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: {
      action: status === 'approved' ? 'COMPANY_APPROVE' : 'COMPANY_REJECT',
      company: company._id.toString(),
      ...(status === 'rejected' ? { reason: company.rejectionReason } : {}),
    },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { company: adminView(company.toObject()) },
    status === 'approved' ? 'Company approved' : 'Company rejected',
  );
}
