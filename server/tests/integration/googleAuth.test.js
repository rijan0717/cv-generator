import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';

// Google is never called from the tests: the one function that talks to it
// is replaced, and each test says who "Google" vouches for.
vi.mock('../../src/services/googleAuthService.js', () => ({
  verifyGoogleCredential: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const { env } = await import('../../src/config/env.js');
const { verifyGoogleCredential } = await import('../../src/services/googleAuthService.js');
const { connectMemoryDb, clearMemoryDb, closeMemoryDb } = await import('../helpers/memoryDb.js');

const app = createApp();

/** What Google says about the person signing in. */
const googleUser = {
  googleId: 'google-123',
  email: 'asha.google@example.com',
  name: 'Asha Google',
  emailVerified: true,
};

beforeAll(async () => {
  await connectMemoryDb();
  env.googleClientId = 'test-client-id';
});

afterEach(async () => {
  await clearMemoryDb();
  vi.mocked(verifyGoogleCredential).mockReset();
});

afterAll(async () => {
  await closeMemoryDb();
});

/** Signs in with a token "Google" accepts as `profile`. */
function signIn(profile = googleUser) {
  vi.mocked(verifyGoogleCredential).mockResolvedValue(profile);
  return request(app).post('/api/auth/google').send({ credential: 'a-google-id-token' });
}

describe('POST /api/auth/google', () => {
  it('creates an account with no password on first sign-in', async () => {
    const res = await signIn();

    expect(res.status).toBe(200);
    expect(res.body.data.isNew).toBe(true);
    expect(res.body.data.user.email).toBe(googleUser.email);
    expect(res.body.data.user.hasPassword).toBe(false);
    expect(res.body.data.user.accountType).toBeNull();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);

    const stored = await User.findOne({ email: googleUser.email }).select('+passwordHash');
    expect(stored.googleId).toBe(googleUser.googleId);
    expect(stored.passwordHash).toBeUndefined();
  });

  it('signs the same person in again rather than creating a second account', async () => {
    await signIn();
    const res = await signIn();

    expect(res.body.data.isNew).toBe(false);
    expect(await User.countDocuments({ email: googleUser.email })).toBe(1);
  });

  it('links Google to an existing password account with the same email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: googleUser.email, password: 'password123' });

    const res = await signIn();

    expect(res.status).toBe(200);
    expect(res.body.data.isNew).toBe(false);
    expect(res.body.data.user.hasPassword).toBe(true);
    const stored = await User.findOne({ email: googleUser.email });
    expect(stored.googleId).toBe(googleUser.googleId);
  });

  it('refuses an email address Google has not verified', async () => {
    const res = await signIn({ ...googleUser, emailVerified: false });
    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it('refuses a blocked account', async () => {
    await signIn();
    await User.updateOne({ email: googleUser.email }, { status: 'blocked' });

    const res = await signIn();
    expect(res.status).toBe(403);
  });

  it('never signs an admin in with Google', async () => {
    await User.create({
      name: 'Admin',
      email: googleUser.email,
      passwordHash: 'password123',
      role: 'admin',
    });

    const res = await signIn();
    expect(res.status).toBe(403);
  });

  it('requires a credential', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });

  it('lets a Google-only account set its first password without a current one', async () => {
    const agent = request.agent(app);
    vi.mocked(verifyGoogleCredential).mockResolvedValue(googleUser);
    await agent.post('/api/auth/google').send({ credential: 'a-google-id-token' });

    const set = await agent.put('/api/users/me/password').send({ newPassword: 'newpass123' });
    expect(set.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: googleUser.email, password: 'newpass123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.hasPassword).toBe(true);
  });
});
