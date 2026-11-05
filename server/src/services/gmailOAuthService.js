/**
 * The OAuth half of "Connect Gmail": getting, keeping and using permission to
 * compose mail as the user.
 *
 * This is a different flow from sign-in, and the difference is the whole
 * reason this file exists beside `googleAuthService.js`:
 *
 *   Sign-in is *authentication*. The browser is handed a signed ID token
 *   saying "this is Rijan", the server checks the signature, and that is the
 *   end of it. Nothing is stored, and the client secret is never used.
 *
 *   Connecting Gmail is *authorisation*. The server has to be able to act as
 *   the user later, when they are not sitting at the browser. So:
 *
 *     1. We send them to Google with the scopes we want (`buildConsentUrl`).
 *     2. Google sends them back to our redirect URI with a one-time `code`.
 *     3. We trade that code — authenticating ourselves with the client
 *        secret — for a *refresh token* (`exchangeCode`).
 *     4. That refresh token is encrypted and stored. From then on it buys a
 *        fresh, hour-long access token whenever one is needed
 *        (`getAccessToken`).
 *
 * The `state` parameter carries a short-lived signed token through that round
 * trip. Without it, anyone could link their own Gmail account to a logged-in
 * victim's session by making them load the callback URL — the OAuth version
 * of CSRF. With it, a callback that did not start from this server's own
 * consent URL is rejected.
 *
 * Kept in a service so the controller never touches Google directly, and so
 * tests can replace these four functions rather than calling Google.
 */
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env, isGmailConfigured } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { encryptToken, decryptToken } from './gmailTokenCrypto.js';

/**
 * What we ask the user to grant.
 *
 * `gmail.compose` is the only one that does real work: it allows creating,
 * updating and sending drafts. It deliberately does NOT allow reading the
 * inbox — `gmail.readonly` would, and we have no business asking for it.
 *
 * `openid` and `userinfo.email` are not needed to compose anything. They tell
 * us *which* address was connected, so the profile page can say "Connected as
 * …" and someone who authorised the wrong account can see that they did. They
 * are non-sensitive, and the code below copes if they are refused.
 */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
];

/** The one scope without which the feature cannot do anything. */
export const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

/** How long the user has to get through Google's consent screen. */
const STATE_TTL = '10m';

/**
 * Builds a client for this app's OAuth credentials.
 *
 * Made per call rather than once at module load, so that importing this file
 * on a server with the feature switched off cannot throw at start-up.
 *
 * @returns {OAuth2Client} A client carrying our ID, secret and redirect URI.
 * @throws {ApiError} 503 when the server has not been configured for Gmail.
 */
function createClient() {
  if (!isGmailConfigured()) {
    throw new ApiError(
      503,
      'Connecting Gmail is not set up on this server. Run `npm run setup:gmail` with the OAuth client JSON.',
    );
  }

  return new OAuth2Client({
    clientId: env.googleClientId,
    clientSecret: env.gmail.clientSecret,
    redirectUri: env.gmail.redirectUri,
  });
}

/**
 * Creates the signed `state` value for one connect attempt.
 *
 * @param {string} userId - The user starting the connection.
 * @returns {string} A short-lived signed token.
 */
export function createState(userId) {
  return jwt.sign({ sub: String(userId), use: 'gmail-connect' }, env.jwtSecret, {
    expiresIn: STATE_TTL,
  });
}

/**
 * Checks the `state` Google handed back, and says who started the attempt.
 *
 * @param {string} state - The value from the callback query string.
 * @returns {string} The id of the user who started the connection.
 * @throws {ApiError} 400 when it is missing, expired, altered, or was signed
 *   for some other purpose.
 */
export function verifyState(state) {
  if (!state) throw ApiError.badRequest('That Gmail connection request is missing its state.');

  let payload;
  try {
    payload = jwt.verify(state, env.jwtSecret);
  } catch {
    throw ApiError.badRequest('That Gmail connection link has expired. Please try again.');
  }

  // A token signed for logging in must not be usable here, and vice versa.
  if (payload.use !== 'gmail-connect') {
    throw ApiError.badRequest('That Gmail connection request is not valid.');
  }

  return payload.sub;
}

/**
 * The URL to send the user to, to grant permission.
 *
 * @param {string} state - From `createState`.
 * @returns {string} Google's consent URL.
 */
export function buildConsentUrl(state) {
  return createClient().generateAuthUrl({
    // Offline is what makes Google issue a refresh token at all; without it
    // we would get an access token that dies in an hour and no way to renew.
    access_type: 'offline',

    // Google only returns a refresh token the *first* time an account grants
    // consent. Someone who connects, disconnects and reconnects would then
    // get no token and a baffling error, so consent is forced every time.
    prompt: 'consent',

    scope: GMAIL_SCOPES,
    include_granted_scopes: false,
    state,
  });
}

/**
 * Trades the one-time code from the callback for a stored-ready refresh token.
 *
 * @param {string} code - The `code` query parameter Google sent back.
 * @returns {Promise<{refreshTokenCipher: string, iv: string, authTag: string,
 *   email: string, googleId: string, scope: string}>} Ready to write to a
 *   `GmailAccount`. The refresh token itself is never returned in the clear.
 * @throws {ApiError} 400 when the code is bad, or the grant is unusable.
 */
export async function exchangeCode(code) {
  const client = createClient();

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    throw ApiError.badRequest('Google did not accept that connection. Please try again.');
  }

  if (!tokens.refresh_token) {
    // Almost always means the account had already consented and `prompt` did
    // not force a new one. Say what to do rather than just what went wrong.
    throw ApiError.badRequest(
      'Google did not return a refresh token. Remove this app at myaccount.google.com/permissions and connect again.',
    );
  }

  const granted = tokens.scope ?? '';
  if (!granted.includes(REQUIRED_SCOPE)) {
    throw ApiError.badRequest(
      'Permission to compose mail was not granted. Please connect again and leave that box ticked.',
    );
  }

  // Which address did they actually connect? The ID token says so — but only
  // if the `openid`/`email` scopes were granted. They are not required for
  // composing, so a missing one degrades the display rather than failing.
  let email = '';
  let googleId = '';

  if (tokens.id_token) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.googleClientId,
      });
      const payload = ticket.getPayload();
      email = payload.email?.toLowerCase() ?? '';
      googleId = payload.sub ?? '';
    } catch {
      // Leave both blank; the account still works, the card just shows no
      // address. Not worth refusing a valid grant over.
      email = '';
      googleId = '';
    }
  }

  const encrypted = encryptToken(tokens.refresh_token);

  return {
    refreshTokenCipher: encrypted.cipherText,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    email,
    // Without the openid scope there is no `sub` to key on. Fall back to the
    // address, and to a marker when even that is missing, so the required
    // field is never empty.
    googleId: googleId || email || 'unknown',
    scope: granted,
  };
}

/**
 * Mints a fresh access token for a stored account.
 *
 * Access tokens last about an hour, so one is fetched per operation rather
 * than cached in the database — one secret at rest instead of two.
 *
 * @param {{refreshTokenCipher: string, iv: string, authTag: string}} account -
 *   A `GmailAccount` read with its hidden fields selected.
 * @returns {Promise<string>} A bearer token for the Gmail API.
 * @throws {ApiError} 401 when the user has revoked access at Google's end, in
 *   which case the only cure is to reconnect.
 */
export async function getAccessToken(account) {
  const client = createClient();

  const refreshToken = decryptToken({
    cipherText: account.refreshTokenCipher,
    iv: account.iv,
    authTag: account.authTag,
  });

  client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('no token');
    return token;
  } catch {
    throw ApiError.unauthorized(
      'Your Gmail connection is no longer valid. Please connect your account again.',
    );
  }
}

/**
 * Tells Google to forget the grant, on disconnect.
 *
 * Deleting our row alone would leave the app listed under the user's Google
 * permissions forever, which is not what "disconnect" means to them.
 *
 * Deliberately does not throw: if Google is unreachable, the local record
 * should still be removed, so the user is not stuck connected to something
 * they have asked to leave.
 *
 * @param {{refreshTokenCipher: string, iv: string, authTag: string}} account -
 *   A `GmailAccount` read with its hidden fields selected.
 * @returns {Promise<boolean>} Whether Google confirmed the revocation.
 */
export async function revokeAccess(account) {
  try {
    const refreshToken = decryptToken({
      cipherText: account.refreshTokenCipher,
      iv: account.iv,
      authTag: account.authTag,
    });

    await createClient().revokeToken(refreshToken);
    return true;
  } catch {
    return false;
  }
}
