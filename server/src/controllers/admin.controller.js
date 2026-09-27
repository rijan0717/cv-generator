/**
 * Admin controller.
 *
 * Every route that reaches this file has already passed `requireAuth` and
 * `requireAdmin`, so these functions may read across all users. That is
 * exactly why the guard is applied once at the router rather than repeated
 * here: a route added later cannot accidentally be left unprotected.
 *
 * Lists are always paginated. An admin list that grows with the database
 * would eventually time out, and the requirements ask for pagination on
 * every admin list.
 */
import { User } from '../models/User.js';
import { CV } from '../models/CV.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/** Largest page a client may ask for, so one request cannot pull everything. */
const MAX_PAGE_SIZE = 100;

/**
 * Reads and clamps the pagination values from the query string.
 * @param {import('express').Request} req - The request.
 * @returns {{page: number, limit: number, skip: number}}
 */
function readPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 20));

  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Escapes a user-supplied search term before it is used in a regular
 * expression, so a search for "a.*" cannot become a wildcard that scans the
 * whole collection, and a pathological pattern cannot be injected.
 * @param {string} value - The raw search term.
 * @returns {string} The escaped term.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/admin/stats
 * The headline numbers for the admin dashboard.
 */
export async function getStats(req, res) {
  // Run independent counts concurrently rather than one after another.
  const [totalUsers, activeUsers, blockedUsers, totalCVs, deletedCVs, downloads, templateUsage] =
    await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, status: 'active' }),
      User.countDocuments({ isDeleted: false, status: 'blocked' }),
      CV.countDocuments({ isDeleted: false }),
      CV.countDocuments({ isDeleted: true }),
      ActivityLog.aggregate([
        { $match: { action: { $in: ['DOWNLOAD_PDF', 'DOWNLOAD_DOCX', 'DOWNLOAD_EXCEL'] } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]),
      CV.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$templateKey', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

  sendSuccess(
    res,
    {
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      cvs: { total: totalCVs, deleted: deletedCVs },
      downloads: Object.fromEntries(downloads.map((row) => [row._id, row.count])),
      templateUsage: templateUsage.map((row) => ({ templateKey: row._id, count: row.count })),
    },
    'Dashboard statistics',
  );
}

/**
 * GET /api/admin/users
 *
 * Paginated list with an optional search term and status filter. Each row
 * carries the user's CV count, which is the first thing an admin looks for.
 */
export async function listUsers(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { search, status } = req.query;

  const filter = { isDeleted: false };

  if (status === 'active' || status === 'blocked') {
    filter.status = status;
  }

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // One grouped query for the CV counts, rather than one query per user.
  const counts = await CV.aggregate([
    { $match: { user: { $in: users.map((user) => user._id) }, isDeleted: false } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);

  const countByUser = new Map(counts.map((row) => [row._id.toString(), row.count]));

  sendSuccess(
    res,
    {
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        cvCount: countByUser.get(user._id.toString()) ?? 0,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
    'Users',
  );
}

/**
 * GET /api/admin/users/:id
 * One user together with the CVs they have created.
 */
export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.isDeleted) throw ApiError.notFound('User not found');

  const [cvs, recentActivity] = await Promise.all([
    CV.find({ user: user._id, isDeleted: false })
      .select('title templateKey strengthScore createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean(),
    ActivityLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  sendSuccess(res, { user: user.toPublicJSON(), cvs, recentActivity }, 'User detail');
}

/**
 * PATCH /api/admin/users/:id/status
 * Blocks or unblocks an account.
 */
export async function updateUserStatus(req, res) {
  const { status } = req.body;

  const user = await User.findById(req.params.id);
  if (!user || user.isDeleted) throw ApiError.notFound('User not found');

  // An admin must not be able to lock themselves out of the only admin
  // account, which would leave the system unmanageable.
  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('You cannot change the status of your own account');
  }

  user.status = status;
  await user.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'USER_STATUS', targetUser: user._id.toString(), status },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { user: user.toPublicJSON() },
    `Account ${status === 'blocked' ? 'blocked' : 'unblocked'}`,
  );
}

/**
 * DELETE /api/admin/users/:id
 * Soft delete, so the user's CVs and activity remain readable in reports.
 */
export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.isDeleted) throw ApiError.notFound('User not found');

  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  user.isDeleted = true;
  await user.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'USER_DELETE', targetUser: user._id.toString() },
    ip: req.ip,
  });

  sendSuccess(res, null, 'User deleted');
}

/**
 * GET /api/admin/cvs
 * Every CV in the system, with its owner, paginated and filterable.
 */
export async function listAllCVs(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { search, templateKey } = req.query;

  const filter = { isDeleted: false };

  if (templateKey) filter.templateKey = templateKey;

  if (search?.trim()) {
    filter.title = new RegExp(escapeRegex(search.trim()), 'i');
  }

  const [cvs, total] = await Promise.all([
    CV.find(filter)
      .select('title templateKey strengthScore user createdAt updatedAt')
      .populate('user', 'name email status')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CV.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    { cvs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    'All CVs',
  );
}

/**
 * GET /api/admin/cvs/:id
 * Read-only view of any CV, so the admin can check a report of inappropriate
 * content before deciding whether to remove it.
 */
export async function getAnyCV(req, res) {
  const cv = await CV.findById(req.params.id).populate('user', 'name email');
  if (!cv || cv.isDeleted) throw ApiError.notFound('CV not found');

  sendSuccess(res, { cv }, 'CV detail');
}

/**
 * DELETE /api/admin/cvs/:id
 * Removes a CV from the system. Soft delete, so it can be restored and so
 * the download statistics that reference it stay meaningful.
 */
export async function deleteAnyCV(req, res) {
  const cv = await CV.findById(req.params.id);
  if (!cv || cv.isDeleted) throw ApiError.notFound('CV not found');

  cv.isDeleted = true;
  await cv.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    cvId: cv._id,
    meta: { action: 'CV_DELETE' },
    ip: req.ip,
  });

  sendSuccess(res, null, 'CV deleted');
}

/**
 * GET /api/admin/activity
 * The paginated audit trail.
 */
export async function listActivity(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { action } = req.query;

  const filter = {};
  if (action) filter.action = action;

  const [entries, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    { entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    'Activity log',
  );
}
