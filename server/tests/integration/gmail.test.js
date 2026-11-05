import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';

// Google is never called from the tests. The service that talks to it is
// replaced wholesale, so each test decides what "Google" did — including the
// failures that are otherwise impossible to produce on demand, such as a
// grant that comes back without a refresh token.
vi.mock('../../src/services/gmailOAuthService.js', () => ({
  buildConsentUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?stub=1'),
  createState: vi.fn(() => 'a-signed-state'),
  verifyState: vi.fn(),
  exchangeCode: vi.fn(),
  revokeAccess: vi.fn(),
  REQUIRED_SCOPE: 'https://www.googleapis.com/auth/gmail.compose',
}));

const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const { GmailAccount } = await import('../../src/models/GmailAccount.js');
const { ActivityLog } = await import('../../src/models/ActivityLog.js');
const oauth = await import('../../src/services/gmailOAuthService.js');
const { connectMemoryDb, clearMemoryDb, closeMemoryDb } = await import('../helpers/memoryDb.js');
const { signUpAs } = await import('../helpers/accounts.js');

const app = createApp();

/** A stored grant, shaped as the real `exchangeCode` returns one. */
const GRANT = {
  refreshTokenCipher: 'deadbeef',
  iv: '0'.repeat(24),
  authTag: '0'.repeat(32),
  email: 'rijan@example.com',
  googleId: 'google-sub-123',
  scope: 'https://www.googleapis.com/auth/gmail.compose openid',
};

beforeAll(async () => {
  await connectMemoryDb();
});

beforeEach(() => {
  // `resetAllMocks` in afterEach strips the implementations given in the
  // mock factory above, so the two that every test relies on are restored
  // here rather than silently returning undefined.
  vi.mocked(oauth.createState).mockReturnValue('a-signed-state');
  vi.mocked(oauth.buildConsentUrl).mockReturnValue(
    'https://accounts.google.com/o/oauth2/v2/auth?stub=1',
  );

  // The feature is configured by default; the tests that care switch it off.
  env.googleClientId = 'test-client-id';
  env.gmail.clientSecret = 'test-client-secret';
  env.gmail.redirectUri = 'http://localhost:5000/api/gmail/callback';
  env.gmail.tokenKey = 'a'.repeat(64);
});

afterEach(async () => {
  await clearMemoryDb();
  vi.resetAllMocks();
});

afterAll(async () => {
  await closeMemoryDb();
});

/** Signs up a job seeker and returns their session agent. */
function signIn(email = 'seeker@example.com') {
  return signUpAs(app, email, 'jobseeker');
}

/** Writes a connected account straight into the database. */
async function connectAccount(userId, overrides = {}) {
  return GmailAccount.create({ user: userId, ...GRANT, ...overrides });
}

/** Reads the signed-in user's id. */
async function userIdOf(agent) {
  const res = await agent.get('/api/auth/me');
  return res.body.data.user.id ?? res.body.data.user._id;
}

describe('GET /api/gmail/status', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app).get('/api/gmail/status');
    expect(res.status).toBe(401);
  });

  it('reports "not connected" without treating it as an error', async () => {
    const agent = await signIn();
    const res = await agent.get('/api/gmail/status');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ configured: true, connected: false, email: '' });
  });

  it('reports the connected address and that composing is allowed', async () => {
    const agent = await signIn();
    await connectAccount(await userIdOf(agent));

    const res = await agent.get('/api/gmail/status');

    expect(res.body.data.connected).toBe(true);
    expect(res.body.data.email).toBe(GRANT.email);
    expect(res.body.data.canCompose).toBe(true);
  });

  it('says composing is not allowed when that scope was refused', async () => {
    const agent = await signIn();
    await connectAccount(await userIdOf(agent), { scope: 'openid' });

    const res = await agent.get('/api/gmail/status');

    expect(res.body.data.connected).toBe(true);
    expect(res.body.data.canCompose).toBe(false);
  });

  it('reports the feature as unconfigured when the server has no credentials', async () => {
    env.gmail.clientSecret = '';
    const agent = await signIn();

    const res = await agent.get('/api/gmail/status');

    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(false);
    expect(res.body.data.connected).toBe(false);
  });

  it('never returns the stored token, even though it is in the database', async () => {
    const agent = await signIn();
    await connectAccount(await userIdOf(agent));

    const res = await agent.get('/api/gmail/status');
    const body = JSON.stringify(res.body);

    expect(body).not.toContain(GRANT.refreshTokenCipher);
    expect(body).not.toContain(GRANT.authTag);
  });
});

describe('GET /api/gmail/connect', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app).get('/api/gmail/connect');
    expect(res.status).toBe(401);
  });

  it('sends a signed-in user on to Google', async () => {
    const agent = await signIn();
    const res = await agent.get('/api/gmail/connect');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
  });

  it('returns to the profile page instead of Google when nothing is configured', async () => {
    env.gmail.tokenKey = '';
    const agent = await signIn();

    const res = await agent.get('/api/gmail/connect');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      `${env.clientUrl}/profile?gmail=error&reason=not-configured`,
    );
  });
});

describe('GET /api/gmail/callback', () => {
  it('stores the grant and reports success', async () => {
    const agent = await signIn();
    const userId = await userIdOf(agent);

    vi.mocked(oauth.verifyState).mockReturnValue(String(userId));
    vi.mocked(oauth.exchangeCode).mockResolvedValue(GRANT);

    const res = await request(app).get('/api/gmail/callback?code=one-time&state=a-signed-state');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${env.clientUrl}/profile?gmail=connected`);

    const stored = await GmailAccount.findOne({ user: userId }).select('+refreshTokenCipher');
    expect(stored.email).toBe(GRANT.email);
    expect(stored.refreshTokenCipher).toBe(GRANT.refreshTokenCipher);
  });

  it('records the connection in the activity log', async () => {
    const agent = await signIn();
    const userId = await userIdOf(agent);

    vi.mocked(oauth.verifyState).mockReturnValue(String(userId));
    vi.mocked(oauth.exchangeCode).mockResolvedValue(GRANT);

    await request(app).get('/api/gmail/callback?code=one-time&state=a-signed-state');

    const entry = await ActivityLog.findOne({ action: 'GMAIL_CONNECT' });
    expect(entry).not.toBeNull();
    expect(entry.meta.email).toBe(GRANT.email);
  });

  it('replaces the previous grant rather than storing a second one', async () => {
    const agent = await signIn();
    const userId = await userIdOf(agent);
    await connectAccount(userId, { email: 'old@example.com' });

    vi.mocked(oauth.verifyState).mockReturnValue(String(userId));
    vi.mocked(oauth.exchangeCode).mockResolvedValue({ ...GRANT, email: 'new@example.com' });

    await request(app).get('/api/gmail/callback?code=one-time&state=a-signed-state');

    const all = await GmailAccount.find({ user: userId });
    expect(all).toHaveLength(1);
    expect(all[0].email).toBe('new@example.com');
  });

  it('rejects a callback whose state was not signed by us', async () => {
    vi.mocked(oauth.verifyState).mockImplementation(() => {
      throw new Error('bad state');
    });

    const res = await request(app).get('/api/gmail/callback?code=one-time&state=forged');

    expect(res.headers.location).toBe(`${env.clientUrl}/profile?gmail=error&reason=bad-state`);
    expect(await GmailAccount.countDocuments()).toBe(0);
  });

  it('passes Google’s own refusal through, so the page can explain it', async () => {
    const res = await request(app).get('/api/gmail/callback?error=access_denied');

    expect(res.headers.location).toBe(`${env.clientUrl}/profile?gmail=error&reason=access_denied`);
    expect(vi.mocked(oauth.exchangeCode)).not.toHaveBeenCalled();
  });

  it('stores nothing when the exchange fails', async () => {
    const agent = await signIn();
    vi.mocked(oauth.verifyState).mockReturnValue(String(await userIdOf(agent)));
    vi.mocked(oauth.exchangeCode).mockRejectedValue(new Error('no refresh token'));

    const res = await request(app).get('/api/gmail/callback?code=one-time&state=a-signed-state');

    expect(res.headers.location).toBe(
      `${env.clientUrl}/profile?gmail=error&reason=exchange-failed`,
    );
    expect(await GmailAccount.countDocuments()).toBe(0);
  });
});

describe('DELETE /api/gmail/disconnect', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app).delete('/api/gmail/disconnect');
    expect(res.status).toBe(401);
  });

  it('revokes at Google and removes the stored account', async () => {
    const agent = await signIn();
    const userId = await userIdOf(agent);
    await connectAccount(userId);
    vi.mocked(oauth.revokeAccess).mockResolvedValue(true);

    const res = await agent.delete('/api/gmail/disconnect');

    expect(res.status).toBe(200);
    expect(res.body.data.revokedAtGoogle).toBe(true);
    expect(await GmailAccount.countDocuments({ user: userId })).toBe(0);

    const entry = await ActivityLog.findOne({ action: 'GMAIL_DISCONNECT' });
    expect(entry).not.toBeNull();
  });

  it('still disconnects locally when Google cannot be reached', async () => {
    const agent = await signIn();
    const userId = await userIdOf(agent);
    await connectAccount(userId);
    vi.mocked(oauth.revokeAccess).mockResolvedValue(false);

    const res = await agent.delete('/api/gmail/disconnect');

    expect(res.status).toBe(200);
    expect(res.body.data.revokedAtGoogle).toBe(false);
    expect(res.body.message).toMatch(/myaccount\.google\.com/);
    expect(await GmailAccount.countDocuments({ user: userId })).toBe(0);
  });

  it('cannot disconnect somebody else’s account', async () => {
    const owner = await signIn('owner@example.com');
    const ownerId = await userIdOf(owner);
    await connectAccount(ownerId);

    const other = await signIn('other@example.com');
    const res = await other.delete('/api/gmail/disconnect');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/no gmail account/i);
    // The owner's connection is untouched.
    expect(await GmailAccount.countDocuments({ user: ownerId })).toBe(1);
  });

  it('is harmless when nothing is connected', async () => {
    const agent = await signIn();
    const res = await agent.delete('/api/gmail/disconnect');

    expect(res.status).toBe(200);
    expect(vi.mocked(oauth.revokeAccess)).not.toHaveBeenCalled();
  });
});
