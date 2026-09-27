import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { CV } from '../../src/models/CV.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Registers an ordinary user and returns an agent holding their session.
 * @param {string} email - The account to create.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUpUser(email) {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Normal User', email, password: 'password123' });
  return agent;
}

/**
 * Creates an admin the way the seed script does, then logs in as them.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signInAdmin() {
  await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'password123', // hashed by the model's pre-save hook
    role: 'admin',
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'admin@example.com', password: 'password123' });
  return agent;
}

beforeAll(async () => {
  await connectMemoryDb();
});

afterEach(async () => {
  await clearMemoryDb();
});

afterAll(async () => {
  await closeMemoryDb();
});

/**
 * The guard is the whole point of this router, so every endpoint is checked
 * against both an anonymous caller and a logged-in non-admin.
 */
describe('admin routes are closed to everyone else', () => {
  const endpoints = [
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/cvs'],
    ['get', '/api/admin/activity'],
  ];

  it.each(endpoints)('%s %s rejects an anonymous caller with 401', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each(endpoints)('%s %s rejects an ordinary user with 403', async (method, path) => {
    const user = await signUpUser('normal@example.com');
    const res = await user[method](path);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('does not let a user reach another account through the admin route', async () => {
    const victim = await signUpUser('victim@example.com');
    await victim.post('/api/cvs').send({ title: 'Private CV' });

    const attacker = await signUpUser('attacker@example.com');
    const victimUser = await User.findOne({ email: 'victim@example.com' });

    const res = await attacker.get(`/api/admin/users/${victimUser._id}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/users', () => {
  let admin;

  beforeEach(async () => {
    admin = await signInAdmin();
    await signUpUser('alice@example.com');
    await signUpUser('bob@example.com');
  });

  it('lists every user with pagination details', async () => {
    const res = await admin.get('/api/admin/users');

    expect(res.status).toBe(200);
    // Two registered users plus the admin.
    expect(res.body.data.users).toHaveLength(3);
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('never exposes a password hash', async () => {
    const res = await admin.get('/api/admin/users');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('includes how many CVs each user has', async () => {
    const alice = await request.agent(app);
    await alice
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });
    await alice.post('/api/cvs').send({ title: 'One' });
    await alice.post('/api/cvs').send({ title: 'Two' });

    const res = await admin.get('/api/admin/users');
    const row = res.body.data.users.find((user) => user.email === 'alice@example.com');

    expect(row.cvCount).toBe(2);
  });

  it('filters by search term', async () => {
    const res = await admin.get('/api/admin/users?search=alice');

    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].email).toBe('alice@example.com');
  });

  it('filters by status', async () => {
    const alice = await User.findOne({ email: 'alice@example.com' });
    await admin.patch(`/api/admin/users/${alice._id}/status`).send({ status: 'blocked' });

    const res = await admin.get('/api/admin/users?status=blocked');

    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].email).toBe('alice@example.com');
  });

  it('paginates', async () => {
    const res = await admin.get('/api/admin/users?page=1&limit=2');

    expect(res.body.data.users).toHaveLength(2);
    expect(res.body.data.pagination.pages).toBe(2);
  });

  // A search term is put into a regular expression, so it must be escaped.
  it('treats a regex metacharacter as literal text', async () => {
    const res = await admin.get('/api/admin/users?search=.*');

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(0);
  });
});

describe('GET /api/admin/users/:id', () => {
  it('returns the user together with their CVs', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');
    await alice.post('/api/cvs').send({ title: 'Alice CV' });

    const user = await User.findOne({ email: 'alice@example.com' });
    const res = await admin.get(`/api/admin/users/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.cvs).toHaveLength(1);
    expect(res.body.data.cvs[0].title).toBe('Alice CV');
  });

  it('returns 404 for an unknown user', async () => {
    const admin = await signInAdmin();
    const res = await admin.get('/api/admin/users/64b7f3b2c1a2d3e4f5a6b7c8');

    expect(res.status).toBe(404);
  });
});

describe('blocking a user', () => {
  it('stops them logging in', async () => {
    const admin = await signInAdmin();
    await signUpUser('alice@example.com');
    const alice = await User.findOne({ email: 'alice@example.com' });

    await admin.patch(`/api/admin/users/${alice._id}/status`).send({ status: 'blocked' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(login.status).toBe(403);
  });

  it('ends an existing session on the next request', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');
    const aliceUser = await User.findOne({ email: 'alice@example.com' });

    // Alice is already logged in and holding a valid cookie.
    expect((await alice.get('/api/auth/me')).status).toBe(200);

    await admin.patch(`/api/admin/users/${aliceUser._id}/status`).send({ status: 'blocked' });

    expect((await alice.get('/api/auth/me')).status).toBe(403);
  });

  // An admin locking their own account would leave nobody able to manage it.
  it('refuses to let an admin block themselves', async () => {
    const admin = await signInAdmin();
    const adminUser = await User.findOne({ email: 'admin@example.com' });

    const res = await admin.patch(`/api/admin/users/${adminUser._id}/status`).send({
      status: 'blocked',
    });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown status value', async () => {
    const admin = await signInAdmin();
    await signUpUser('alice@example.com');
    const alice = await User.findOne({ email: 'alice@example.com' });

    const res = await admin
      .patch(`/api/admin/users/${alice._id}/status`)
      .send({ status: 'nonsense' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/cvs', () => {
  it('lists CVs from every user with their owner attached', async () => {
    const admin = await signInAdmin();

    const alice = await signUpUser('alice@example.com');
    await alice.post('/api/cvs').send({ title: 'Alice CV' });

    const bob = await signUpUser('bob@example.com');
    await bob.post('/api/cvs').send({ title: 'Bob CV' });

    const res = await admin.get('/api/admin/cvs');

    expect(res.status).toBe(200);
    expect(res.body.data.cvs).toHaveLength(2);
    expect(res.body.data.cvs[0].user.email).toBeDefined();
  });

  it('leaves out CVs the owner has deleted', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');

    const created = await alice.post('/api/cvs').send({ title: 'Temporary' });
    await alice.delete(`/api/cvs/${created.body.data.cv._id}`);

    const res = await admin.get('/api/admin/cvs');
    expect(res.body.data.cvs).toHaveLength(0);
  });

  it('filters by template', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');

    const created = await alice.post('/api/cvs').send({ title: 'Modern one' });
    await alice.put(`/api/cvs/${created.body.data.cv._id}`).send({ templateKey: 'modern' });
    await alice.post('/api/cvs').send({ title: 'Classic one' });

    const res = await admin.get('/api/admin/cvs?templateKey=modern');

    expect(res.body.data.cvs).toHaveLength(1);
    expect(res.body.data.cvs[0].title).toBe('Modern one');
  });
});

describe('DELETE /api/admin/cvs/:id', () => {
  it('soft deletes so the document survives for reporting', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');
    const created = await alice.post('/api/cvs').send({ title: 'Inappropriate' });
    const id = created.body.data.cv._id;

    const res = await admin.delete(`/api/admin/cvs/${id}`);
    expect(res.status).toBe(200);

    const stored = await CV.findById(id);
    expect(stored).not.toBeNull();
    expect(stored.isDeleted).toBe(true);

    // It also disappears from the owner's own dashboard.
    const list = await alice.get('/api/cvs');
    expect(list.body.data.cvs).toHaveLength(0);
  });
});

describe('GET /api/admin/stats', () => {
  it('counts users, CVs and template usage', async () => {
    const admin = await signInAdmin();
    const alice = await signUpUser('alice@example.com');
    await alice.post('/api/cvs').send({ title: 'One' });

    const res = await admin.get('/api/admin/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBe(2);
    expect(res.body.data.cvs.total).toBe(1);
    expect(res.body.data.templateUsage[0]).toEqual({ templateKey: 'classic', count: 1 });
  });
});
