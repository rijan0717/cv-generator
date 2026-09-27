/**
 * Creates and verifies the JSON Web Tokens used for authentication, and owns
 * the rules for the cookie that carries them.
 *
 * The token is stored in an httpOnly cookie rather than in localStorage, so
 * JavaScript running in the page cannot read it. That removes the most common
 * way a cross-site scripting bug turns into a stolen session.
 */
import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';

/**
 * Signs a login token for a user.
 * @param {import('../models/User.js').User} user - The authenticated user.
 * @returns {string} A signed JWT containing the user id and role.
 */
export function signAuthToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Verifies a login token.
 * @param {string} token - The raw JWT taken from the cookie.
 * @returns {{sub: string, role: string}} The decoded payload.
 * @throws {jsonwebtoken.JsonWebTokenError} When the token is invalid or expired.
 */
export function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

/**
 * Builds the options used when setting or clearing the auth cookie. They must
 * match exactly in both cases, otherwise the browser will not clear it.
 * @returns {import('express').CookieOptions}
 */
function cookieOptions() {
  return {
    httpOnly: true, // not readable by JavaScript
    secure: isProduction, // only sent over HTTPS in production
    sameSite: 'lax', // sent on normal navigation, not on cross-site posts
    path: '/',
  };
}

/**
 * Writes the auth token to the response as an httpOnly cookie.
 * @param {import('express').Response} res - Express response object.
 * @param {string} token - The signed JWT.
 * @returns {void}
 */
export function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matching the default token life
  });
}

/**
 * Removes the auth cookie, logging the user out.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, cookieOptions());
}
