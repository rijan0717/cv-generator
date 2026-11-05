/**
 * Creating drafts, sending them, and listing what has been drafted.
 *
 * Kept apart from `gmail.controller.js`, which is only about the OAuth
 * round trip. This file is about what the connection is *for*, and the
 * two have nothing in common beyond the account row.
 *
 * Everything here talks to Gmail with a plain `fetch`. One endpoint does
 * not justify the `googleapis` client (CLAUDE.md section 2, and the plan's
 * "nothing new is installed"), and the three calls used are simple POSTs
 * and GETs with a bearer token.
 *
 * The scope is `gmail.compose`. That allows creating, reading, updating
 * and deleting *drafts*, and sending. It does not allow reading the
 * mailbox, which is why there is a drafts list here and no inbox.
 */
import { CV } from '../models/CV.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { GmailAccount } from '../models/GmailAccount.js';
import { getAccessToken, REQUIRED_SCOPE } from '../services/gmailOAuthService.js';
import { buildMimeMessage, toBase64Url } from '../services/mimeBuilder.js';
import { generatePdf } from '../services/pdfService.js';
import { logActivity } from '../services/activityLogger.js';
import { buildExportFilename } from '../utils/dateFormat.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** How many drafts the Mail page lists. One page, newest first. */
const DRAFT_PAGE_SIZE = 25;

/**
 * Loads the caller's connected account, ready to mint a token from.
 *
 * Throws rather than returning null: every route in this file is
 * meaningless without a connection, and the message is what the UI shows
 * to send the user to the profile card.
 *
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<object>} The account, with its encrypted fields.
 */
async function requireConnectedAccount(userId) {
  const account = await GmailAccount.findOne({ user: userId }).select(
    '+refreshTokenCipher +iv +authTag',
  );

  if (!account) {
    throw new ApiError(409, 'Connect your Gmail account before sending mail');
  }

  // A user can untick the permission on the consent screen and still
  // finish connecting. Catching it here gives a sentence they can act on
  // instead of a 403 from Google.
  if (!account.scope?.includes(REQUIRED_SCOPE)) {
    throw new ApiError(
      409,
      'Your Gmail connection does not include permission to compose. Please connect again.',
    );
  }

  return account;
}

/**
 * Loads a CV that belongs to the given user, or throws 404.
 *
 * @param {string} cvId - The CV's id.
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<object>} The CV document.
 */
async function findOwnedCV(cvId, userId) {
  const cv = await CV.findOne({ _id: cvId, user: userId, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');
  return cv;
}

/**
 * Calls the Gmail API and turns a failure into something readable.
 *
 * Google's error bodies are nested and wordy; what the user needs is one
 * sentence and, where it matters, the fact that reconnecting would fix
 * it. A 401 or 403 here means the grant has gone stale.
 *
 * @param {string} path - The path after `/users/me`.
 * @param {string} accessToken - A bearer token.
 * @param {object} [init] - Extra fetch options.
 * @returns {Promise<object>} The parsed response body.
 */
async function callGmail(path, accessToken, init = {}) {
  const response = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = body?.error?.message ?? 'Gmail rejected the request';

    if (response.status === 401 || response.status === 403) {
      throw new ApiError(409, 'Your Gmail connection is no longer valid. Please connect again.');
    }

    console.error('[gmail] API error:', response.status, detail);
    throw new ApiError(502, `Gmail could not complete that: ${detail}`);
  }

  return body;
}

/**
 * Renders the CV to PDF for attaching, or explains why it could not.
 *
 * A Chromium that will not start is a machine problem, not a mistake by
 * the user, so it must not read like one — and it must not lose the
 * letter they have just written. The error says to untick the attachment
 * and send anyway, which always works.
 *
 * @param {object} cv - The CV to render.
 * @param {string} userId - The owner, for the print token.
 * @returns {Promise<{filename: string, content: Buffer, mimeType: string}>}
 */
async function renderAttachment(cv, userId) {
  try {
    const content = await generatePdf({ cvId: cv._id, userId });
    return {
      filename: buildExportFilename(cv, 'pdf'),
      content,
      mimeType: 'application/pdf',
    };
  } catch (error) {
    console.error('[gmail] attachment render failed:', error.message);
    throw new ApiError(
      503,
      'Your CV could not be rendered to PDF on this machine. Untick the attachment to send the letter on its own.',
    );
  }
}

/**
 * Assembles the raw message both `createDraft` and `sendMail` need.
 *
 * @param {object} options - Request body fields plus the caller.
 * @returns {Promise<{raw: string, attached: boolean, cv: object}>}
 */
async function assembleMessage({ cvId, to, subject, body, attachCv, user }) {
  const cv = await findOwnedCV(cvId, user._id);
  const attachment = attachCv ? await renderAttachment(cv, user._id) : null;

  const raw = buildMimeMessage({
    to,
    subject,
    body,
    fromName: user.name ?? '',
    attachment,
  });

  return { raw, attached: Boolean(attachment), cv };
}

/**
 * POST /api/gmail/drafts
 * Creates the letter as a draft in the user's own mailbox.
 *
 * The default action of the whole feature. Nothing leaves the mailbox, so
 * a mistake costs a deletion rather than an apology.
 *
 * @param {import('express').Request} req - cvId, to, subject, body, attachCv.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function createDraft(req, res) {
  const account = await requireConnectedAccount(req.user._id);
  const { raw, attached, cv } = await assembleMessage({ ...req.body, user: req.user });

  const accessToken = await getAccessToken(account);

  const draft = await callGmail('/drafts', accessToken, {
    method: 'POST',
    body: JSON.stringify({ message: { raw: toBase64Url(raw) } }),
  });

  await GmailAccount.updateOne({ _id: account._id }, { lastUsedAt: new Date() });

  await logActivity({
    userId: req.user._id,
    action: 'GMAIL_DRAFT',
    cvId: cv._id,
    // The company and the CV, never the letter itself: an activity log
    // read by an administrator is not the place for someone's covering
    // letter to a named employer.
    meta: { to: req.body.to, subject: req.body.subject, attached, draftId: draft.id },
    ip: req.ip,
  });

  sendCreated(
    res,
    {
      draftId: draft.id,
      messageId: draft.message?.id ?? null,
      attached,
      // Opens the draft in Gmail itself, which is where the user will
      // want to read it back before sending.
      gmailUrl: `https://mail.google.com/mail/u/0/#drafts?compose=${draft.message?.id ?? ''}`,
    },
    attached ? 'Draft saved to Gmail with your CV attached' : 'Draft saved to Gmail',
  );
}

/**
 * POST /api/gmail/send
 * Sends the letter for real.
 *
 * Requires `confirm: true` in the body as well as the dialog in the UI.
 * The two guards are deliberate duplication: the dialog stops a misclick,
 * and the flag stops anything that reaches the API without one.
 *
 * @param {import('express').Request} req - As `createDraft`, plus confirm.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function sendMail(req, res) {
  if (req.body.confirm !== true) {
    throw new ApiError(400, 'Sending must be confirmed');
  }

  const account = await requireConnectedAccount(req.user._id);
  const { raw, attached, cv } = await assembleMessage({ ...req.body, user: req.user });

  const accessToken = await getAccessToken(account);

  const sent = await callGmail('/messages/send', accessToken, {
    method: 'POST',
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });

  await GmailAccount.updateOne({ _id: account._id }, { lastUsedAt: new Date() });

  await logActivity({
    userId: req.user._id,
    action: 'GMAIL_SEND',
    cvId: cv._id,
    // The subject is kept so the Sent list has something to show. The
    // letter body never is: Gmail holds the only copy, which is where it
    // belongs.
    meta: { to: req.body.to, subject: req.body.subject, attached, messageId: sent.id },
    ip: req.ip,
  });

  sendSuccess(
    res,
    { messageId: sent.id, attached },
    attached ? 'Sent, with your CV attached' : 'Sent',
  );
}

/**
 * GET /api/gmail/drafts
 * Lists the drafts in the user's mailbox, newest first.
 *
 * Two calls per draft are unavoidable: `drafts.list` returns ids and
 * nothing else, so each one is fetched with `format: 'metadata'` to read
 * its To and Subject. Only the headers are requested, so the bodies — and
 * any attachment — are never transferred.
 *
 * The list is every draft in the mailbox, not only ours. Gmail offers no
 * way to tell them apart, and pretending otherwise by filtering on the
 * subject line would hide the user's own drafts from them.
 *
 * @param {import('express').Request} req - The request.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function listDrafts(req, res) {
  const account = await requireConnectedAccount(req.user._id);
  const accessToken = await getAccessToken(account);

  const list = await callGmail(`/drafts?maxResults=${DRAFT_PAGE_SIZE}`, accessToken);
  const ids = (list.drafts ?? []).map((draft) => draft.id);

  const drafts = await Promise.all(
    ids.map(async (id) => {
      const detail = await callGmail(
        `/drafts/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        accessToken,
      );

      const headers = detail.message?.payload?.headers ?? [];
      const headerValue = (name) =>
        headers.find((header) => header.name?.toLowerCase() === name)?.value ?? '';

      return {
        id,
        messageId: detail.message?.id ?? null,
        to: headerValue('to'),
        subject: headerValue('subject'),
        date: headerValue('date'),
        snippet: detail.message?.snippet ?? '',
      };
    }),
  );

  sendSuccess(res, { drafts, email: account.email }, 'Drafts loaded');
}

/**
 * POST /api/gmail/drafts/:id/send
 * Sends a draft that is already in the mailbox.
 *
 * Separate from `sendMail`, which composes and sends in one go. This one
 * sends what the user has already read back — the safer of the two paths,
 * and the one the Mail page offers. `gmail.compose` covers it: the scope
 * is "manage drafts and send emails".
 *
 * Still requires `confirm: true`, for the same reason: the mail is real.
 *
 * @param {import('express').Request} req - The draft id, and confirm.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function sendExistingDraft(req, res) {
  if (req.body.confirm !== true) {
    throw new ApiError(400, 'Sending must be confirmed');
  }

  const account = await requireConnectedAccount(req.user._id);
  const accessToken = await getAccessToken(account);

  // Read it first, so the log and the confirmation name the real
  // recipient rather than whatever the browser claimed it was.
  const detail = await callGmail(
    `/drafts/${req.params.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject`,
    accessToken,
  );

  const headers = detail.message?.payload?.headers ?? [];
  const headerValue = (name) =>
    headers.find((header) => header.name?.toLowerCase() === name)?.value ?? '';

  const sent = await callGmail('/drafts/send', accessToken, {
    method: 'POST',
    body: JSON.stringify({ id: req.params.id }),
  });

  await GmailAccount.updateOne({ _id: account._id }, { lastUsedAt: new Date() });

  await logActivity({
    userId: req.user._id,
    action: 'GMAIL_SEND',
    meta: {
      to: headerValue('to'),
      subject: headerValue('subject'),
      messageId: sent.id,
      fromDraft: req.params.id,
    },
    ip: req.ip,
  });

  sendSuccess(res, { messageId: sent.id }, 'Sent');
}

/**
 * DELETE /api/gmail/drafts/:id
 * Deletes a draft from the mailbox.
 *
 * Permanent at Google's end — a deleted draft does not go to the bin — so
 * the confirmation is in the UI before this is ever called.
 *
 * @param {import('express').Request} req - The draft id.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function deleteDraft(req, res) {
  const account = await requireConnectedAccount(req.user._id);
  const accessToken = await getAccessToken(account);

  // `drafts.delete` answers 204 with no body, so it is called directly
  // rather than through `callGmail`, which expects JSON back.
  const response = await fetch(`${GMAIL_API}/drafts/${req.params.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new ApiError(502, 'Gmail would not delete that draft');
  }

  sendSuccess(res, { id: req.params.id }, 'Draft deleted');
}

/**
 * GET /api/gmail/sent
 * The letters this application has sent for the user.
 *
 * Read from our own activity log, not from Gmail. The scope we hold
 * cannot see the Sent folder, and asking for one that could — purely to
 * list what we already know we sent — would be a second restricted scope
 * bought for nothing. The log holds the recipient, the subject and the
 * time, which is all the list shows.
 *
 * It therefore lists what was sent *from here*, not everything the user
 * has ever sent, and the page says so.
 *
 * @param {import('express').Request} req - The request.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function listSent(req, res) {
  const entries = await ActivityLog.find({ user: req.user._id, action: 'GMAIL_SEND' })
    .sort({ createdAt: -1 })
    .limit(DRAFT_PAGE_SIZE)
    .lean();

  const sent = entries.map((entry) => ({
    id: entry._id.toString(),
    to: entry.meta?.to ?? '',
    subject: entry.meta?.subject ?? '',
    messageId: entry.meta?.messageId ?? null,
    attached: Boolean(entry.meta?.attached),
    sentAt: entry.createdAt,
  }));

  sendSuccess(res, { sent }, 'Sent letters loaded');
}
