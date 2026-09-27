/**
 * Authentication middleware.
 *
 * Reads the JWT from the httpOnly cookie, verifies it, loads the matching
 * user, and attaches that user to `req.user` for the rest of the request.
 */
import { User } from '../models/User.js';
import { verifyAuthToken } from '../services/tokenService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

/**
 * Requires a valid session. Rejects the request with 401 when the cookie is
 * missing, the token is invalid or expired, or the account no longer exists.
 * Rejects with 403 when the account has been blocked by an admin, so a user
 * who is blocked mid-session loses access immediately rather than at the end
 * of the token's life.
 *
 * @type {import('express').RequestHandler}
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    throw ApiError.unauthorized('You must be logged in to do that');
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    // The same message is used for an invalid and an expired token so the
    // response gives away nothing useful to someone guessing tokens.
    throw ApiError.unauthorized('Your session has expired. Please log in again');
  }

  const user = await User.findOne({ _id: payload.sub, isDeleted: false });

  if (!user) {
    throw ApiError.unauthorized('Your account could not be found');
  }

  if (user.status === 'blocked') {
    throw ApiError.forbidden('Your account has been blocked. Please contact the administrator');
  }

  req.user = user;
  next();
});

export default requireAuth;
