/**
 * Who may browse the candidate directory.
 *
 * Candidate profiles are personal data, so the gate is deliberately the
 * same one that lets an employer post a job: an admin-approved company.
 * A pending or rejected company has not been checked by anybody, and an
 * unverified account must not be able to page through every job seeker in
 * the system. Admins pass, as they do everywhere else.
 *
 * Always used after `requireAuth`, which is what puts `req.user` in place.
 */
import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Lets admins and the owners of an approved company through, and explains
 * the reason to everybody else.
 *
 * On success it leaves the company on `req.employerCompany`, so a handler
 * that needs it does not have to look it up a second time.
 *
 * @type {import('express').RequestHandler}
 */
export async function requireApprovedEmployer(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('You must be logged in to do that'));
  }

  if (req.user.role === 'admin') return next();

  if (req.user.accountType !== 'employer') {
    return next(ApiError.forbidden('Only employer accounts can browse candidates'));
  }

  const company = await Company.findOne({ owner: req.user._id, isDeleted: false });

  if (!company) {
    return next(ApiError.forbidden('Set up your company before browsing candidates'));
  }

  if (company.status !== 'approved') {
    return next(
      ApiError.forbidden(
        company.status === 'rejected'
          ? 'Your company was not approved. Update it and resubmit before browsing candidates.'
          : 'Your company is waiting for admin approval. You can browse candidates once it is approved.',
      ),
    );
  }

  req.employerCompany = company;
  next();
}
