/**
 * Google sign-in: checks the ID token the Google button hands the browser.
 *
 * The browser never sends us a password. Google's sign-in button gives it a
 * signed ID token (a JWT) naming the person, and the client posts that token
 * here. This service asks `google-auth-library` to check that:
 *   1. the token is signed by Google (the library fetches and caches
 *      Google's public keys),
 *   2. it was issued for *our* app (its audience is our client ID), and
 *   3. it has not expired.
 * Only then are the email and name inside it trusted.
 *
 * Kept in its own service so the controller does not depend on Google
 * directly, and so tests can replace this one function instead of
 * calling Google.
 */
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** One client for the life of the process; it caches Google's keys. */
const client = new OAuth2Client();

/**
 * Verifies a Google ID token and returns the person it names.
 *
 * @param {string} credential - The ID token from the Google sign-in button.
 * @returns {Promise<{googleId: string, email: string, name: string, emailVerified: boolean}>}
 * @throws {ApiError} 401 when the token is invalid, expired or not ours.
 */
export async function verifyGoogleCredential(credential) {
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in could not be verified. Please try again');
  }

  return {
    // `sub` is Google's permanent id for the person; the email can change.
    googleId: payload.sub,
    email: payload.email?.toLowerCase() ?? '',
    name: payload.name || payload.email?.split('@')[0] || 'Google user',
    emailVerified: payload.email_verified === true,
  };
}
