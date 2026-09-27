/**
 * Attaches `req.user` when a valid session cookie is present, and does
 * nothing when it is not.
 *
 * The job board is public: a visitor must be able to browse before
 * signing up. But a signed-in visitor should see which jobs they have
 * saved or already applied to. That needs the user when one exists,
 * without ever rejecting the request when one does not — which is
 * exactly what `requireAuth` cannot do.
 *
 * Any problem with the token is treated as "not logged in" rather than as
 * an error. An expired cookie should show the public view, not a failure.
 */
import { User } from '../models/User.js';
import { verifyAuthToken } from '../services/tokenService.js';
import { env } from '../config/env.js';

/** @type {import('express').RequestHandler} */
export async function optionalAuth(req, _res, next) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return next();

  try {
    const payload = verifyAuthToken(token);
    const user = await User.findOne({ _id: payload.sub, isDeleted: false, status: 'active' });
    if (user) req.user = user;
  } catch {
    // Invalid or expired: carry on as a visitor.
  }

  next();
}

export default optionalAuth;
