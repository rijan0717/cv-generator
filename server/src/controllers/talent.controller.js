/**
 * Candidate directory controller.
 *
 * Everything here has already passed `requireAuth` and
 * `requireApprovedEmployer`, so the caller is either an admin or the owner
 * of an approved company.
 *
 * Two rules shape every query in this file:
 *
 *   1. Admin accounts are never listed and never readable here. An admin is
 *      not a candidate, and the directory is not a way to enumerate who
 *      administers the system.
 *   2. An employer sees job seekers only. An admin may also look at
 *      employer accounts, which is why `accountType` is a filter rather
 *      than a constant — but it is forced back to `jobseeker` for anybody
 *      who is not an admin, so the parameter cannot be used to widen what
 *      an employer can see.
 */
import { User } from '../models/User.js';
import { CV } from '../models/CV.js';
import { Company } from '../models/Company.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { readPagination, buildPagination } from '../utils/pagination.js';
import { INDUSTRIES, EMPLOYMENT_TYPES } from '../data/industries.js';

/**
 * Escapes a search term before it goes into a regular expression, so a
 * search for "a.*" cannot become a wildcard scan of the whole collection.
 * @param {string} value - The raw search term.
 * @returns {string} The escaped term.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The profile fields, with the defaults filled in. A user who signed up
 * before these fields existed has no sub-document at all, and the list
 * must still render for them.
 * @param {object} user - A lean user document.
 * @returns {object} The profile, always complete.
 */
function profileOf(user) {
  const profile = user.jobSeekerProfile ?? {};
  return {
    position: profile.position ?? '',
    industry: profile.industry ?? '',
    yearsExperience: profile.yearsExperience ?? 0,
    openToWork: profile.openToWork ?? false,
    employmentTypes: profile.employmentTypes ?? [],
    location: profile.location ?? '',
    about: profile.about ?? '',
  };
}

/**
 * Builds the `accountType` part of the filter, enforcing rule 2 above.
 * @param {object} req - The request, for the caller and the query.
 * @returns {string} The account type that will actually be listed.
 */
function resolveAccountType(req) {
  const isAdmin = req.user.role === 'admin';
  const requested = req.query.accountType;

  if (isAdmin && requested === 'employer') return 'employer';
  return 'jobseeker';
}

/**
 * GET /api/talent
 *
 * The paginated candidate list, filtered by industry, availability,
 * employment type and a name search.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function listTalent(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { industry, employmentType, openToWork, search } = req.query;

  const accountType = resolveAccountType(req);

  // Blocked accounts are left out: an employer should not approach somebody
  // the admin has suspended, and they cannot log in to reply in any case.
  const filter = {
    // Belt and braces: the account type already excludes admins, who have
    // none, but an admin must never appear here even if one were given a
    // type by hand.
    role: { $ne: 'admin' },
    accountType,
    isDeleted: false,
    status: 'active',
  };

  if (industry) filter['jobSeekerProfile.industry'] = industry;
  if (employmentType) filter['jobSeekerProfile.employmentTypes'] = employmentType;
  if (openToWork === 'true') filter['jobSeekerProfile.openToWork'] = true;

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { 'jobSeekerProfile.position': pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      // Candidates who are looking come first: that is the list an employer
      // is actually trying to read, and burying them under people who are
      // not available makes the directory much less useful.
      .sort({ 'jobSeekerProfile.openToWork': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const ids = users.map((user) => user._id);

  // One grouped query for the CV counts rather than one query per row.
  const cvCounts = await CV.aggregate([
    { $match: { user: { $in: ids }, isDeleted: false } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const cvCountByUser = new Map(cvCounts.map((row) => [row._id.toString(), row.count]));

  // Employer rows carry their company, which is the thing that identifies
  // them. Job seeker rows never need this query.
  const companyByOwner = new Map();
  if (accountType === 'employer') {
    const companies = await Company.find({ owner: { $in: ids }, isDeleted: false })
      .select('owner name status industry')
      .lean();
    companies.forEach((company) => companyByOwner.set(company.owner.toString(), company));
  }

  sendSuccess(
    res,
    {
      users: users.map((user) => {
        const id = user._id.toString();
        const company = companyByOwner.get(id);

        return {
          id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          accountType: user.accountType,
          createdAt: user.createdAt,
          cvCount: cvCountByUser.get(id) ?? 0,
          profile: profileOf(user),
          company: company
            ? { id: company._id.toString(), name: company.name, status: company.status }
            : null,
        };
      }),
      pagination: buildPagination({ page, limit }, total),
    },
    'Candidates',
  );
}

/**
 * GET /api/talent/:id
 *
 * One person in full: their profile, their photo, and the CV they have
 * marked as primary.
 *
 * The primary CV is the one sent, not the newest: a candidate may be part
 * way through drafting a better one, and showing a half-finished draft to
 * an employer would misrepresent them. If none is marked, nothing is
 * shown rather than a guess.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getTalentProfile(req, res) {
  const user = await User.findById(req.params.id).lean();

  // The same message whichever reason applies. Telling an employer that an
  // id belongs to an admin, or to a blocked account, is more than they
  // need to know to understand that the page is not there for them.
  const isVisible =
    user &&
    !user.isDeleted &&
    user.role !== 'admin' &&
    user.status === 'active' &&
    (user.accountType === 'jobseeker' ||
      (user.accountType === 'employer' && req.user.role === 'admin'));

  if (!isVisible) throw ApiError.notFound('That person could not be found');

  const [primaryCv, cvCount, company] = await Promise.all([
    user.accountType === 'jobseeker'
      ? CV.findOne({ user: user._id, isPrimary: true, isDeleted: false }).lean()
      : null,
    CV.countDocuments({ user: user._id, isDeleted: false }),
    user.accountType === 'employer'
      ? Company.findOne({ owner: user._id, isDeleted: false }).lean()
      : null,
  ]);

  sendSuccess(
    res,
    {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        accountType: user.accountType,
        createdAt: user.createdAt,
        cvCount,
        profile: profileOf(user),
        company: company
          ? {
              id: company._id.toString(),
              name: company.name,
              status: company.status,
              industry: company.industry,
              location: company.location,
            }
          : null,
      },
      primaryCv: primaryCv ?? null,
    },
    'Candidate',
  );
}

/**
 * GET /api/talent/filters
 *
 * The industry and employment-type lists, so the client's dropdowns are
 * filled from the same source the server validates against.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function getTalentFilters(_req, res) {
  sendSuccess(res, { industries: INDUSTRIES, employmentTypes: EMPLOYMENT_TYPES }, 'Filters');
}
