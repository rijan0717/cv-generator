import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Template } from '../../src/models/Template.js';
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

/**
 * Puts a small catalogue in the database, standing in for the seed.
 * @returns {Promise<Array<object>>} The created templates.
 */
async function seedCatalogue() {
  return Template.create([
    { key: 'classic', name: 'Classic', description: 'Traditional', sortOrder: 0 },
    { key: 'modern', name: 'Modern', description: 'Two columns', sortOrder: 1, usesPhoto: true },
    { key: 'compact', name: 'Compact', description: 'Tight spacing', sortOrder: 2 },
  ]);
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

describe('GET /api/templates', () => {
  it('offers every template when the catalogue has never been seeded', async () => {
    // An empty collection means "nobody has set this up", not "the admin
    // withdrew all of them". Answering with nothing would leave the
    // builder with no template to pick.
    const res = await request(app).get('/api/templates');

    expect(res.status).toBe(200);
    expect(res.body.data.seeded).toBe(false);
    expect(res.body.data.templates.length).toBeGreaterThan(0);
    expect(res.body.data.templates.every((template) => template.isActive)).toBe(true);
  });

  it('is readable without a session', async () => {
    await seedCatalogue();

    const res = await request(app).get('/api/templates');

    expect(res.status).toBe(200);
    expect(res.body.data.seeded).toBe(true);
    expect(res.body.data.templates).toHaveLength(3);
  });

  it('leaves out the templates the admin has deactivated', async () => {
    await seedCatalogue();
    await Template.updateOne({ key: 'compact' }, { isActive: false });

    const res = await request(app).get('/api/templates');

    const keys = res.body.data.templates.map((template) => template.key);
    expect(keys).toEqual(['classic', 'modern']);
  });

  it('returns them in the order the admin chose', async () => {
    await seedCatalogue();
    await Template.updateOne({ key: 'compact' }, { sortOrder: -1 });

    const res = await request(app).get('/api/templates');

    expect(res.body.data.templates[0].key).toBe('compact');
  });
});

describe('admin template management', () => {
  it('refuses an ordinary user', async () => {
    await seedCatalogue();
    const user = await signUpUser('user@example.com');

    expect((await user.get('/api/admin/templates')).status).toBe(403);
  });

  it('lists deactivated templates too, which the public route hides', async () => {
    await seedCatalogue();
    await Template.updateOne({ key: 'compact' }, { isActive: false });
    const admin = await signInAdmin();

    const res = await admin.get('/api/admin/templates');

    expect(res.status).toBe(200);
    expect(res.body.data.templates).toHaveLength(3);
    expect(res.body.data.templates.filter((t) => t.isActive)).toHaveLength(2);
  });

  it('deactivates and renames a template', async () => {
    const [, , compact] = await seedCatalogue();
    const admin = await signInAdmin();

    const off = await admin
      .patch(`/api/admin/templates/${compact._id}`)
      .send({ isActive: false, name: 'Compact (dense)' });

    expect(off.status).toBe(200);
    expect(off.body.data.template.isActive).toBe(false);
    expect(off.body.data.template.name).toBe('Compact (dense)');
  });

  it('refuses to deactivate the last active template', async () => {
    // Otherwise an admin unticking boxes one at a time ends up with a
    // builder nobody can use, and finds out when somebody complains.
    const [classic] = await seedCatalogue();
    await Template.updateMany({ key: { $ne: 'classic' } }, { isActive: false });
    const admin = await signInAdmin();

    const res = await admin.patch(`/api/admin/templates/${classic._id}`).send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least one template/i);

    const stored = await Template.findById(classic._id);
    expect(stored.isActive).toBe(true);
  });

  it('rejects an unknown id and an invalid one differently', async () => {
    await seedCatalogue();
    const admin = await signInAdmin();

    expect((await admin.patch('/api/admin/templates/not-an-id').send({ isActive: false })).status).toBe(
      400,
    );
    expect(
      (await admin.patch('/api/admin/templates/000000000000000000000000').send({ isActive: false }))
        .status,
    ).toBe(404);
  });

  it('does not touch the CVs that already use a deactivated template', async () => {
    const [, , compact] = await seedCatalogue();
    const user = await signUpUser('owner@example.com');
    const created = await user.post('/api/cvs').send({ title: 'Mine' });
    await user.put(`/api/cvs/${created.body.data.cv._id}`).send({ templateKey: 'compact' });

    const admin = await signInAdmin();
    await admin.patch(`/api/admin/templates/${compact._id}`).send({ isActive: false });

    // Withdrawing an option must not change work somebody has done.
    const after = await user.get(`/api/cvs/${created.body.data.cv._id}`);
    expect(after.status).toBe(200);
    expect(after.body.data.cv.templateKey).toBe('compact');
  });
});
