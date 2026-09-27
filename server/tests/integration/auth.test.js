import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/** A valid registration body, so each test only states what it changes. */
const validUser = {
  name: 'Test User',
  email: 'test.user@example.com',
  password: 'password123',
};

beforeAll(async () => {
  await connectMemoryDb();
});

afterEach(async () => {
  await clearMemoryDb();
});

afterAll(async () => {
  await closeMemoryDb();
});

describe('POST /api/auth/register', () => {
  it('creates an account and sets the auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.role).toBe('user');

    // The cookie must be httpOnly so page scripts cannot read the token.
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('stores the password as a bcrypt hash, not plain text', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const stored = await User.findOne({ email: validUser.email }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe(validUser.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email address', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['too short', 'pass1'],
    ['no number', 'passwordonly'],
    ['no letter', '12345678'],
  ])('rejects a password that is %s', async (_label, password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects an invalid email address', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('always creates a user, never an admin, even if a role is sent', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpassword1' });

    expect(res.status).toBe(401);
  });

  it('gives the same message for an unknown email as for a wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpassword1' });

    expect(unknown.status).toBe(wrongPassword.status);
    expect(unknown.body.message).toBe(wrongPassword.body.message);
  });

  it('refuses a blocked account with a clear message', async () => {
    await User.updateOne({ email: validUser.email }, { status: 'blocked' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/blocked/i);
  });

  it('records the login time', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    const stored = await User.findOne({ email: validUser.email });
    expect(stored.lastLoginAt).toBeInstanceOf(Date);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when no cookie is sent', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns the logged-in user when a valid cookie is sent', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 401 after logging out', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    await agent.post('/api/auth/logout');

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/me', () => {
  it('updates the name of the logged-in user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.put('/api/users/me').send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  it('requires a session', async () => {
    const res = await request(app).put('/api/users/me').send({ name: 'Nobody' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/me/password', () => {
  it('changes the password when the current one is correct', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const change = await agent.put('/api/users/me/password').send({
      currentPassword: validUser.password,
      newPassword: 'newpassword456',
    });
    expect(change.status).toBe(200);

    // The old password must no longer work, and the new one must.
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'newpassword456' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a wrong current password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.put('/api/users/me/password').send({
      currentPassword: 'notmypassword1',
      newPassword: 'newpassword456',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a new password that is the same as the current one', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.put('/api/users/me/password').send({
      currentPassword: validUser.password,
      newPassword: validUser.password,
    });

    expect(res.status).toBe(400);
  });
});
