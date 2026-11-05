import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';

/**
 * The drafting, sending and listing routes.
 *
 * Nothing here reaches Google. Two seams are replaced:
 *
 *   1. `gmailOAuthService`, so a token is minted without a real grant —
 *      and so the "your connection has gone stale" path can be produced
 *      on demand, which is otherwise impossible to arrange.
 *   2. `fetch`, which is how this controller talks to Gmail. Each test
 *      says what Gmail replied, including its refusals.
 *
 * `pdfService` is stubbed too: rendering a real PDF would start Chromium
 * in a test run, which is slow where it works and absent where it does
 * not.
 */
vi.mock('../../src/services/gmailOAuthService.js', () => ({
  getAccessToken: vi.fn(async () => 'test-access-token'),
  buildConsentUrl: vi.fn(() => 'https://accounts.google.com/stub'),
  createState: vi.fn(() => 'a-signed-state'),
  verifyState: vi.fn(),
  exchangeCode: vi.fn(),
  revokeAccess: vi.fn(async () => true),
  REQUIRED_SCOPE: 'https://www.googleapis.com/auth/gmail.compose',
}));

vi.mock('../../src/services/pdfService.js', () => ({
  generatePdf: vi.fn(async () => Buffer.from('%PDF-1.4 pretend file')),
  closeBrowser: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const { GmailAccount } = await import('../../src/models/GmailAccount.js');
const { ActivityLog } = await import('../../src/models/ActivityLog.js');
const oauth = await import('../../src/services/gmailOAuthService.js');
const pdf = await import('../../src/services/pdfService.js');
const { connectMemoryDb, clearMemoryDb, closeMemoryDb } = await import('../helpers/memoryDb.js');
const { signUpAs } = await import('../helpers/accounts.js');

const app = createApp();

const COMPOSE_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

/** A stored grant, shaped as the real `exchangeCode` returns one. */
const GRANT = {
  refreshTokenCipher: 'deadbeef',
  iv: '0'.repeat(24),
  authTag: '0'.repeat(32),
  email: 'rijan@example.com',
  googleId: 'google-sub-123',
  scope: `${COMPOSE_SCOPE} openid`,
};

/** A well-formed message body, for the tests that are not about validation. */
const MESSAGE = {
  to: 'hiring@example.com',
  subject: 'Application for Operations Manager',
  body: 'Dear Hiring Manager,\n\nI am writing to apply.\n\nKind regards,\nRijan',
};

/**
 * Stands in for Gmail.
 *
 * Routes by URL and method so one stub serves a whole test, however many
 * calls the controller makes. Each entry is `[matcher, response]`.
 */
function stubGmail(handlers) {
  global.fetch = vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET';

    for (const [matcher, respond] of handlers) {
      if (matcher.method === method && url.includes(matcher.path)) {
        const { status = 200, body = {} } = respond(url, init);
        return {
          ok: status >= 200 && status < 300,
          status,
          json: async () => body,
        };
      }
    }

    throw new Error(`Unstubbed Gmail call: ${method} ${url}`);
  });
}

/** The raw message the controller sent, decoded back to text. */
function sentRawMessage() {
  const call = global.fetch.mock.calls.find(([, init]) => init?.method === 'POST');
  const payload = JSON.parse(call[1].body);
  const raw = payload.message?.raw ?? payload.raw;
  return Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

beforeAll(async () => {
  await connectMemoryDb();
});

beforeEach(() => {
  vi.mocked(oauth.getAccessToken).mockResolvedValue('test-access-token');
  vi.mocked(pdf.generatePdf).mockResolvedValue(Buffer.from('%PDF-1.4 pretend file'));

  env.googleClientId = 'test-client-id';
  env.gmail.clientSecret = 'test-client-secret';
  env.gmail.redirectUri = 'http://localhost:5000/api/gmail/callback';
  env.gmail.tokenKey = 'a'.repeat(64);
});

afterEach(async () => {
  await clearMemoryDb();
  vi.resetAllMocks();
  delete global.fetch;
});

afterAll(async () => {
  await closeMemoryDb();
});

/** Signs up a job seeker and returns their session agent. */
function signIn(email = 'seeker@example.com') {
  return signUpAs(app, email, 'jobseeker');
}

/** Reads the signed-in user's id. */
async function userIdOf(agent) {
  const res = await agent.get('/api/auth/me');
  return res.body.data.user.id ?? res.body.data.user._id;
}

/** Signs in, connects a Gmail account and creates a CV to write from. */
async function signedInWithGmail(overrides = {}) {
  const agent = await signIn();
  const userId = await userIdOf(agent);

  await GmailAccount.create({ user: userId, ...GRANT, ...overrides });

  const cv = await agent.post('/api/cvs').send({ title: 'My CV' });

  return { agent, userId, cvId: cv.body.data.cv._id };
}

describe('POST /api/gmail/drafts', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app).post('/api/gmail/drafts').send({ ...MESSAGE, cvId: 'x' });
    expect(res.status).toBe(401);
  });

  it('tells a user with no connection to connect one', async () => {
    const agent = await signIn();
    const cv = await agent.post('/api/cvs').send({ title: 'My CV' });

    const res = await agent
      .post('/api/gmail/drafts')
      .send({ ...MESSAGE, cvId: cv.body.data.cv._id });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/connect your gmail/i);
  });

  it('refuses a connection that was granted without the compose permission', async () => {
    const { agent, cvId } = await signedInWithGmail({ scope: 'openid email' });

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/permission to compose/i);
  });

  it('creates the draft and reports where it went', async () => {
    const { agent, cvId } = await signedInWithGmail();
    stubGmail([
      [{ method: 'POST', path: '/drafts' }, () => ({ body: { id: 'draft-1', message: { id: 'msg-1' } } })],
    ]);

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId });

    expect(res.status).toBe(201);
    expect(res.body.data.draftId).toBe('draft-1');
    expect(res.body.data.gmailUrl).toContain('msg-1');
  });

  it('records the draft in the activity log, without the letter', async () => {
    const { agent, cvId, userId } = await signedInWithGmail();
    stubGmail([[{ method: 'POST', path: '/drafts' }, () => ({ body: { id: 'draft-1' } })]]);

    await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId });

    const entry = await ActivityLog.findOne({ user: userId, action: 'GMAIL_DRAFT' }).lean();
    expect(entry.meta.to).toBe(MESSAGE.to);
    expect(entry.meta.subject).toBe(MESSAGE.subject);
    expect(JSON.stringify(entry.meta)).not.toContain('I am writing to apply');
  });

  it('attaches the CV as a PDF when asked', async () => {
    const { agent, cvId } = await signedInWithGmail();
    stubGmail([[{ method: 'POST', path: '/drafts' }, () => ({ body: { id: 'draft-1' } })]]);

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId, attachCv: true });

    expect(res.body.data.attached).toBe(true);
    expect(pdf.generatePdf).toHaveBeenCalled();
    expect(sentRawMessage()).toContain('multipart/mixed');
  });

  it('sends the letter alone when the attachment is not wanted', async () => {
    const { agent, cvId } = await signedInWithGmail();
    stubGmail([[{ method: 'POST', path: '/drafts' }, () => ({ body: { id: 'draft-1' } })]]);

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId, attachCv: false });

    expect(res.body.data.attached).toBe(false);
    expect(pdf.generatePdf).not.toHaveBeenCalled();
    expect(sentRawMessage()).not.toContain('multipart/mixed');
  });

  it('explains a PDF that could not be rendered, instead of failing blankly', async () => {
    const { agent, cvId } = await signedInWithGmail();
    vi.mocked(pdf.generatePdf).mockRejectedValue(new Error('Chromium would not start'));

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId, attachCv: true });

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/untick the attachment/i);
  });

  it('will not write from somebody else’s CV', async () => {
    const { agent } = await signedInWithGmail();
    const stranger = await signIn('stranger@example.com');
    const theirCv = await stranger.post('/api/cvs').send({ title: 'Not yours' });

    const res = await agent
      .post('/api/gmail/drafts')
      .send({ ...MESSAGE, cvId: theirCv.body.data.cv._id });

    // 404 rather than 403: 403 would confirm the id is real.
    expect(res.status).toBe(404);
  });

  it('rejects a recipient that is not an email address', async () => {
    const { agent, cvId } = await signedInWithGmail();

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId, to: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rejects an empty subject', async () => {
    const { agent, cvId } = await signedInWithGmail();

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId, subject: '   ' });

    expect(res.status).toBe(400);
  });

  it('asks the user to reconnect when Google rejects the token', async () => {
    const { agent, cvId } = await signedInWithGmail();
    stubGmail([
      [
        { method: 'POST', path: '/drafts' },
        () => ({ status: 403, body: { error: { message: 'Insufficient permission' } } }),
      ],
    ]);

    const res = await agent.post('/api/gmail/drafts').send({ ...MESSAGE, cvId });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/connect again/i);
  });
});

describe('POST /api/gmail/send', () => {
  it('refuses to send without an explicit confirmation', async () => {
    const { agent, cvId } = await signedInWithGmail();

    const res = await agent.post('/api/gmail/send').send({ ...MESSAGE, cvId });

    expect(res.status).toBe(400);
    expect(global.fetch).toBeUndefined();
  });

  it('refuses a confirmation that is merely truthy', async () => {
    const { agent, cvId } = await signedInWithGmail();

    const res = await agent.post('/api/gmail/send').send({ ...MESSAGE, cvId, confirm: 'yes' });

    expect(res.status).toBe(400);
  });

  it('sends when confirmed, and logs it', async () => {
    const { agent, cvId, userId } = await signedInWithGmail();
    stubGmail([
      [{ method: 'POST', path: '/messages/send' }, () => ({ body: { id: 'sent-1' } })],
    ]);

    const res = await agent.post('/api/gmail/send').send({ ...MESSAGE, cvId, confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.data.messageId).toBe('sent-1');

    const entry = await ActivityLog.findOne({ user: userId, action: 'GMAIL_SEND' }).lean();
    expect(entry.meta.to).toBe(MESSAGE.to);
  });
});

describe('GET /api/gmail/drafts', () => {
  it('reads the To and Subject of each draft', async () => {
    const { agent } = await signedInWithGmail();

    stubGmail([
      [
        { method: 'GET', path: '/drafts?' },
        () => ({ body: { drafts: [{ id: 'draft-1' }] } }),
      ],
      [
        { method: 'GET', path: '/drafts/draft-1' },
        () => ({
          body: {
            message: {
              id: 'msg-1',
              snippet: 'Dear Hiring Manager',
              payload: {
                headers: [
                  { name: 'To', value: 'hiring@example.com' },
                  { name: 'Subject', value: 'Application' },
                ],
              },
            },
          },
        }),
      ],
    ]);

    const res = await agent.get('/api/gmail/drafts');

    expect(res.status).toBe(200);
    expect(res.body.data.drafts).toHaveLength(1);
    expect(res.body.data.drafts[0]).toMatchObject({
      id: 'draft-1',
      to: 'hiring@example.com',
      subject: 'Application',
    });
  });

  it('returns an empty list rather than an error for an empty mailbox', async () => {
    const { agent } = await signedInWithGmail();
    stubGmail([[{ method: 'GET', path: '/drafts?' }, () => ({ body: {} })]]);

    const res = await agent.get('/api/gmail/drafts');

    expect(res.status).toBe(200);
    expect(res.body.data.drafts).toEqual([]);
  });
});

describe('POST /api/gmail/drafts/:id/send', () => {
  it('refuses without a confirmation', async () => {
    const { agent } = await signedInWithGmail();

    const res = await agent.post('/api/gmail/drafts/draft-1/send').send({});

    expect(res.status).toBe(400);
  });

  it('sends the draft and logs the recipient Gmail reported', async () => {
    const { agent, userId } = await signedInWithGmail();

    stubGmail([
      [
        { method: 'GET', path: '/drafts/draft-1' },
        () => ({
          body: {
            message: {
              payload: {
                headers: [
                  { name: 'To', value: 'real@example.com' },
                  { name: 'Subject', value: 'Application' },
                ],
              },
            },
          },
        }),
      ],
      [{ method: 'POST', path: '/drafts/send' }, () => ({ body: { id: 'sent-9' } })],
    ]);

    const res = await agent.post('/api/gmail/drafts/draft-1/send').send({ confirm: true });

    expect(res.status).toBe(200);

    // The address comes from the draft itself, not from the request, so a
    // browser cannot mislead the audit trail about who was written to.
    const entry = await ActivityLog.findOne({ user: userId, action: 'GMAIL_SEND' }).lean();
    expect(entry.meta.to).toBe('real@example.com');
    expect(entry.meta.fromDraft).toBe('draft-1');
  });
});

describe('DELETE /api/gmail/drafts/:id', () => {
  it('deletes the draft', async () => {
    const { agent } = await signedInWithGmail();
    global.fetch = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }));

    const res = await agent.delete('/api/gmail/drafts/draft-1');

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/drafts/draft-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('treats an already-deleted draft as done rather than as an error', async () => {
    const { agent } = await signedInWithGmail();
    global.fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));

    const res = await agent.delete('/api/gmail/drafts/gone');

    expect(res.status).toBe(200);
  });

  it('refuses an anonymous caller', async () => {
    const res = await request(app).delete('/api/gmail/drafts/draft-1');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/gmail/sent', () => {
  it('lists what was sent from here, newest first', async () => {
    const { agent, userId } = await signedInWithGmail();

    await ActivityLog.create({
      user: userId,
      action: 'GMAIL_SEND',
      meta: { to: 'one@example.com', subject: 'First', messageId: 'm1', attached: true },
    });
    await ActivityLog.create({
      user: userId,
      action: 'GMAIL_SEND',
      meta: { to: 'two@example.com', subject: 'Second', messageId: 'm2' },
    });

    const res = await agent.get('/api/gmail/sent');

    expect(res.status).toBe(200);
    expect(res.body.data.sent).toHaveLength(2);
    expect(res.body.data.sent[0].subject).toBe('Second');
    expect(res.body.data.sent[1].attached).toBe(true);
  });

  it('never shows another user’s sent letters', async () => {
    const { agent } = await signedInWithGmail();
    const stranger = await signIn('stranger@example.com');
    const strangerId = await userIdOf(stranger);

    await ActivityLog.create({
      user: strangerId,
      action: 'GMAIL_SEND',
      meta: { to: 'private@example.com', subject: 'Theirs' },
    });

    const res = await agent.get('/api/gmail/sent');

    expect(res.body.data.sent).toEqual([]);
  });
});
