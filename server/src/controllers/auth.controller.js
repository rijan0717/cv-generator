/**
 * Authentication controller: register, login, logout and "who am I".
 *
 * None of these functions contain try/catch. They are wrapped in
 * `asyncHandler` at the route, which forwards any rejection to the central
 * error handler.
 */
import { User } from '../models/User.js';
import { signAuthToken, setAuthCookie, clearAuthCookie } from '../services/tokenService.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * POST /api/auth/register
 * Creates a new account. The role is always `user`: an admin can only be
 * created by the seed script, never through this endpoint.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function register(req, res) {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with that email address already exists');
  }

  // `passwordHash` is assigned the plain password here on purpose: the
  // pre-save hook on the model hashes it before it reaches the database.
  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: 'user',
  });

  const token = signAuthToken(user);
  setAuthCookie(res, token);

  await logActivity({ userId: user._id, action: 'REGISTER', ip: req.ip });

  sendCreated(res, { user: user.toPublicJSON() }, 'Your account has been created');
}

/**
 * POST /api/auth/login
 * Verifies the credentials and starts a session.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function login(req, res) {
  const { email, password } = req.body;

  // The hash is excluded from queries by default, so it must be requested.
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select(
    '+passwordHash',
  );

  // A wrong email and a wrong password give exactly the same response, so an
  // attacker cannot use the error message to discover which addresses are
  // registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  if (user.status === 'blocked') {
    throw ApiError.forbidden('Your account has been blocked. Please contact the administrator');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAuthToken(user);
  setAuthCookie(res, token);

  await logActivity({ userId: user._id, action: 'LOGIN', ip: req.ip });

  sendSuccess(res, { user: user.toPublicJSON() }, 'You are now logged in');
}

/**
 * POST /api/auth/logout
 * Clears the session cookie. It deliberately succeeds even when nobody is
 * logged in, so the client can always call it safely.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function logout(_req, res) {
  clearAuthCookie(res);
  sendSuccess(res, null, 'You have been logged out');
}

/**
 * GET /api/auth/me
 * Returns the logged-in user. The client calls this on start-up to find out
 * whether the cookie it already holds is still valid.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function getCurrentUser(req, res) {
  sendSuccess(res, { user: req.user.toPublicJSON() }, 'Current user');
}
