/**
 * Connecting and disconnecting a Gmail account.
 *
 * Four endpoints, and two of them are unusual for this codebase because they
 * are not called by our own JavaScript at all — they are browser navigations
 * in and out of Google's consent screen:
 *
 *   GET  /api/gmail/connect     the user's browser goes here, we send it on
 *                               to Google
 *   GET  /api/gmail/callback    Google sends the browser back here
 *   GET  /api/gmail/status      ordinary JSON, for the profile card
 *   DELETE /api/gmail/disconnect
 *
 * Because the first two are navigations they answer with redirects rather
 * than JSON: a user who is halfway through an OAuth round trip must end up
 * looking at a page, not at a `{ success: false }` body. Every failure is
 * therefore turned into a redirect back to the profile page carrying a
 * reason, which the page renders as a toast.
 *
 * The session cookie is `sameSite: 'lax'`, which is sent on exactly this kind
 * of top-level GET navigation, so `/connect` still knows who the user is.
 * The callback does not rely on that: the `state` parameter carries the user
 * id, signed, which is what stops somebody attaching their own mailbox to
 * another person's account.
 */
import { GmailAccount } from '../models/GmailAccount.js';
import {
  buildConsentUrl,
  createState,
  verifyState,
  exchangeCode,
  revokeAccess,
  REQUIRED_SCOPE,
} from '../services/gmailOAuthService.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env, isGmailConfigured } from '../config/env.js';

/**
 * Builds a redirect back to the profile page carrying the outcome.
 *
 * Kept in one place so the query parameters cannot drift apart from what the
 * page reads.
 *
 * @param {string} status - `connected` or `error`.
 * @param {string} [reason] - A short machine-readable code, for `error`.
 * @returns {string} An absolute URL on the client.
 */
function profileRedirect(status, reason = '') {
  const params = new URLSearchParams({ gmail: status });
  if (reason) params.set('reason', reason);
  return `${env.clientUrl}/profile?${params.toString()}`;
}

/**
 * GET /api/gmail/connect
 * Sends the user to Google's consent screen.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function startConnect(req, res) {
  if (!isGmailConfigured()) {
    return res.redirect(profileRedirect('error', 'not-configured'));
  }

  const state = createState(req.user._id);
  res.redirect(buildConsentUrl(state));
}

/**
 * GET /api/gmail/callback
 * Where Google returns the user after they accept or refuse.
 *
 * Deliberately not wrapped in `requireAuth`: the signed `state` identifies
 * the user, and a cookie that happened to be missing should not lose a grant
 * the user has just given.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function handleCallback(req, res) {
  const { code, state, error } = req.query;

  // The user pressed Cancel, or Google refused — most often because the
  // account is not on the consent screen's test-user list.
  if (error) {
    return res.redirect(profileRedirect('error', String(error)));
  }

  let userId;
  try {
    userId = verifyState(state);
  } catch {
    return res.redirect(profileRedirect('error', 'bad-state'));
  }

  if (!code) {
    return res.redirect(profileRedirect('error', 'no-code'));
  }

  let grant;
  try {
    grant = await exchangeCode(String(code));
  } catch (exchangeError) {
    console.error('[gmail] code exchange failed:', exchangeError.message);
    return res.redirect(profileRedirect('error', 'exchange-failed'));
  }

  // Reconnecting replaces the stored grant rather than adding a second row:
  // one mailbox per user, and the newest consent is the one that counts.
  await GmailAccount.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      email: grant.email,
      googleId: grant.googleId,
      refreshTokenCipher: grant.refreshTokenCipher,
      iv: grant.iv,
      authTag: grant.authTag,
      scope: grant.scope,
      connectedAt: new Date(),
      lastUsedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await logActivity({
    userId,
    action: 'GMAIL_CONNECT',
    // The address only; never the token, and never anything from the mailbox.
    meta: { email: grant.email },
    ip: req.ip,
  });

  res.redirect(profileRedirect('connected'));
}

/**
 * GET /api/gmail/status
 * What the profile card needs to draw itself.
 *
 * Always answers 200, including when nothing is connected: "no account" is a
 * normal state, not an error.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getStatus(req, res) {
  const configured = isGmailConfigured();

  const account = configured ? await GmailAccount.findOne({ user: req.user._id }).lean() : null;

  sendSuccess(res, {
    // False means the *server* has no Google credentials, so the card hides
    // itself rather than offering a button that cannot work.
    configured,
    connected: Boolean(account),
    email: account?.email ?? '',
    connectedAt: account?.connectedAt ?? null,
    lastUsedAt: account?.lastUsedAt ?? null,
    // A user can untick a permission on the consent screen. Checking here
    // turns a later 403 from Gmail into an upfront "reconnect" prompt.
    canCompose: Boolean(account?.scope?.includes(REQUIRED_SCOPE)),
  });
}

/**
 * DELETE /api/gmail/disconnect
 * Withdraws the grant and forgets the account.
 *
 * The local row is removed whatever Google says. If Google is unreachable the
 * user is still disconnected here, which is what they asked for; the response
 * says whether the permission was also withdrawn at Google's end, so the page
 * can tell them to remove it manually if not.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function disconnect(req, res) {
  const account = await GmailAccount.findOne({ user: req.user._id }).select(
    '+refreshTokenCipher +iv +authTag',
  );

  if (!account) {
    return sendSuccess(res, { revokedAtGoogle: false }, 'No Gmail account is connected');
  }

  const revokedAtGoogle = await revokeAccess(account);
  await account.deleteOne();

  await logActivity({
    userId: req.user._id,
    action: 'GMAIL_DISCONNECT',
    meta: { email: account.email, revokedAtGoogle },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { revokedAtGoogle },
    revokedAtGoogle
      ? 'Your Gmail account has been disconnected'
      : 'Disconnected here. Google could not be reached, so also remove the app at myaccount.google.com/permissions',
  );
}
