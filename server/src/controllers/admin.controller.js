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
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { JobMatch } from '../models/JobMatch.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { readPagination, buildPagination } from '../utils/pagination.js';

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
 * The months a trend chart covers. Twelve is a year at a glance, which is
 * the span a chart of monthly counts is actually read over.
 */
const TREND_MONTHS = 12;

/**
 * The first instant of the month `count` months before this one.
 * @param {number} count - How many months back.
 * @returns {Date}
 */
function monthsAgo(count) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - count);
  return date;
}

/**
 * Fills in the months a `$group` produced nothing for.
 *
 * Without this, a quiet month is missing from the series rather than
 * shown as zero, and a line chart joins the months either side of it —
 * drawing a straight line through a gap and making the trend look
 * smoother than it was.
 *
 * @param {Array<{_id: string, count: number}>} rows - Grouped by `YYYY-MM`.
 * @param {number} months - How many months the series covers.
 * @returns {Array<{month: string, count: number}>} Oldest first.
 */
function fillMonths(rows, months) {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const series = [];

  for (let back = months - 1; back >= 0; back -= 1) {
    const date = monthsAgo(back);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    series.push({ month: key, count: counts.get(key) ?? 0 });
  }

  return series;
}

/** Group documents into `YYYY-MM` buckets since a given date. */
function monthlyPipeline(since) {
  return [
    { $match: { isDeleted: false, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
  ];
}

/**
 * GET /api/admin/stats
 * The headline numbers and the series behind the dashboard's charts.
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

  // The chart series. Separated from the counts above only for
  // readability: they run in the same single round of parallel queries.
  const since = monthsAgo(TREND_MONTHS - 1);

  const [registrations, cvsCreated, scoreBuckets, averageScore, topSkills, topGaps] =
    await Promise.all([
      User.aggregate(monthlyPipeline(since)),
      CV.aggregate(monthlyPipeline(since)),

      // Strength scores in bands of twenty. `$bucket` needs the upper
      // boundary to be above the highest value, hence 101.
      CV.aggregate([
        { $match: { isDeleted: false } },
        {
          $bucket: {
            groupBy: '$strengthScore',
            boundaries: [0, 21, 41, 61, 81, 101],
            default: 'other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),

      CV.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, average: { $avg: '$strengthScore' } } },
      ]),

      // The skills people actually list. Lower-cased before grouping, or
      // "React" and "react" would be two different skills.
      CV.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: '$skills' },
        { $group: { _id: { $toLower: '$skills.name' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // The gap: what adverts ask for that CVs do not say. Grouped by the
      // keyword itself, because an entry is `{ keyword, weight }`.
      JobMatch.aggregate([
        { $unwind: '$missingKeywords' },
        { $group: { _id: '$missingKeywords.keyword', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

  /** Band labels, in the order `$bucket` returns them. */
  const BAND_LABELS = { 0: '0-20', 21: '21-40', 41: '41-60', 61: '61-80', 81: '81-100' };

  sendSuccess(
    res,
    {
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      cvs: {
        total: totalCVs,
        deleted: deletedCVs,
        averageScore: Math.round(averageScore[0]?.average ?? 0),
      },
      downloads: Object.fromEntries(downloads.map((row) => [row._id, row.count])),
      templateUsage: templateUsage.map((row) => ({ templateKey: row._id, count: row.count })),

      registrationsByMonth: fillMonths(registrations, TREND_MONTHS),
      cvsByMonth: fillMonths(cvsCreated, TREND_MONTHS),

      // Every band is listed, including the empty ones: a distribution
      // with bands missing is not a distribution.
      scoreDistribution: Object.entries(BAND_LABELS).map(([boundary, band]) => ({
        band,
        count: scoreBuckets.find((bucket) => String(bucket._id) === boundary)?.count ?? 0,
      })),

      topSkills: topSkills.map((row) => ({ skill: row._id, count: row.count })),
      topMissingKeywords: topGaps.map((row) => ({ keyword: row._id, count: row.count })),
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
        // The list doubles as the way into a person's full profile, so it
        // carries enough of one to tell the rows apart: which kind of
        // account it is, and whether they are looking for work.
        accountType: user.accountType ?? null,
        position: user.jobSeekerProfile?.position ?? '',
        openToWork: user.jobSeekerProfile?.openToWork ?? false,
        status: user.status,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        cvCount: countByUser.get(user._id.toString()) ?? 0,
      })),
      pagination: buildPagination({ page, limit }, total),
    },
    'Users',
  );
}

/**
 * GET /api/admin/users/:id
 *
 * One user together with their CVs and their recent activity. Both lists
 * are paginated, and because they are on the same page they need separate
 * page numbers: `?cvPage=2` moves the CV table without disturbing the
 * activity table, and `?activityPage=2` does the reverse. A single `page`
 * parameter would move both at once, which is not what either control
 * looks like it does.
 *
 * The two lists keep their own page sizes as well. A prolific user may
 * have a handful of CVs and hundreds of log entries, so showing ten of
 * each would page the CV table almost never and the activity table
 * constantly.
 */
export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.isDeleted) throw ApiError.notFound('User not found');

  // `readPagination` reads `page`, so each list is given a request-shaped
  // object carrying its own parameter under that name.
  const cvPaging = readPagination({ query: { page: req.query.cvPage, limit: req.query.cvLimit } }, 10);
  const activityPaging = readPagination(
    { query: { page: req.query.activityPage, limit: req.query.activityLimit } },
    20,
  );

  const cvFilter = { user: user._id, isDeleted: false };
  const activityFilter = { user: user._id };

  const [cvs, cvTotal, recentActivity, activityTotal] = await Promise.all([
    CV.find(cvFilter)
      .select('title templateKey strengthScore createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .skip(cvPaging.skip)
      .limit(cvPaging.limit)
      .lean(),
    CV.countDocuments(cvFilter),
    ActivityLog.find(activityFilter)
      .populate('cv', 'title')
      .sort({ createdAt: -1 })
      .skip(activityPaging.skip)
      .limit(activityPaging.limit)
      .lean(),
    ActivityLog.countDocuments(activityFilter),
  ]);
  await attachMetaNames(recentActivity);

  sendSuccess(
    res,
    {
      user: user.toPublicJSON(),
      cvs,
      cvPagination: buildPagination(cvPaging, cvTotal),
      recentActivity,
      activityPagination: buildPagination(activityPaging, activityTotal),
    },
    'User detail',
  );
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
    { cvs, pagination: buildPagination({ page, limit }, total) },
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
      .populate('cv', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);
  await attachMetaNames(entries);

  sendSuccess(
    res,
    { entries, pagination: buildPagination({ page, limit }, total) },
    'Activity log',
  );
}

/**
 * Resolves the ids stored in activity `meta` into the names an admin can read.
 *
 * `meta` keeps only ids (a user, a company, a job), because names change and
 * the log must not go stale. This looks the ids up once per page — one query
 * per collection, not one per row — and adds an `entry.refs` object:
 * `{ targetUser: { name, email }, company: { name }, job: { title } }`.
 * A record that has since been deleted is simply absent from `refs`.
 *
 * @param {Array<object>} entries - Lean activity log documents, changed in place.
 * @returns {Promise<void>}
 */
async function attachMetaNames(entries) {
  const ids = { targetUser: new Set(), company: new Set(), job: new Set() };

  for (const { meta = {} } of entries) {
    if (meta.targetUser) ids.targetUser.add(String(meta.targetUser));
    if (meta.company) ids.company.add(String(meta.company));
    // CV_TAILOR stores the advert as `jobId`, the job actions as `job`.
    const jobId = meta.job ?? meta.jobId;
    if (jobId) ids.job.add(String(jobId));
  }

  const [users, companies, jobs] = await Promise.all([
    User.find({ _id: { $in: [...ids.targetUser] } }).select('name email').lean(),
    Company.find({ _id: { $in: [...ids.company] } }).select('name').lean(),
    Job.find({ _id: { $in: [...ids.job] } }).select('title').lean(),
  ]);

  const byId = (docs) => new Map(docs.map((doc) => [String(doc._id), doc]));
  const userMap = byId(users);
  const companyMap = byId(companies);
  const jobMap = byId(jobs);

  for (const entry of entries) {
    const meta = entry.meta ?? {};
    const refs = {};

    const user = userMap.get(String(meta.targetUser));
    if (user) refs.targetUser = { name: user.name, email: user.email };

    const company = companyMap.get(String(meta.company));
    if (company) refs.company = { name: company.name };

    const job = jobMap.get(String(meta.job ?? meta.jobId));
    if (job) refs.job = { title: job.title };

    entry.refs = refs;
  }
}
