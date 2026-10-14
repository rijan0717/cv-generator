/**
 * Role-based authorisation middleware.
 *
 * Always used after `requireAuth`, which is what puts `req.user` in place.
 */
import { ApiError } from '../utils/ApiError.js';

/**
 * Builds a middleware that only lets the listed roles through.
 * @param {...('user'|'admin')} allowedRoles - Roles permitted on this route.
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  return function checkRole(req, _res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('You must be logged in to do that'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to do that'));
    }

    next();
  };
}

/** Convenience middleware for admin-only routes. */
export const requireAdmin = requireRole('admin');

/**
 * Allows only a `user` account of the given type — "employer" for company
 * and job-posting routes, "jobseeker" for applying. Admins pass, because
 * the admin can see and do everything.
 *
 * @param {'jobseeker'|'employer'} accountType
 * @returns {import('express').RequestHandler}
 */
export function requireAccountType(accountType) {
  return function checkAccountType(req, _res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('You must be logged in to do that'));
    }
    if (req.user.role === 'admin' || req.user.accountType === accountType) return next();

    const message =
      accountType === 'employer'
        ? 'Only employer accounts can manage a company and post jobs'
        : 'Only job seeker accounts can do that';
    next(ApiError.forbidden(message));
  };
}
