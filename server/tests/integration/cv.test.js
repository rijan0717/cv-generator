import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CV } from '../../src/models/CV.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Registers a user and returns an agent that keeps their session cookie.
 * @param {string} email - The account to create.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUp(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({
    name: 'Test Person',
    email,
    password: 'password123',
  });
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

describe('CV ownership', () => {
  let owner;
  let intruder;
  let cvId;

  beforeEach(async () => {
    owner = await signUp('owner@example.com');
    intruder = await signUp('intruder@example.com');

    const created = await owner.post('/api/cvs').send({ title: 'My CV' });
    cvId = created.body.data.cv._id;
  });

  it('lets the owner read their own CV', async () => {
    const res = await owner.get(`/api/cvs/${cvId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cv.title).toBe('My CV');
  });

  // A 404 rather than a 403 is deliberate: a 403 would confirm the id exists.
  it('hides the CV of another user behind a 404', async () => {
    const res = await intruder.get(`/api/cvs/${cvId}`);
    expect(res.status).toBe(404);
  });

  it('refuses an update from another user', async () => {
    const res = await intruder.put(`/api/cvs/${cvId}`).send({ title: 'Hacked' });
    expect(res.status).toBe(404);

    const stored = await CV.findById(cvId);
    expect(stored.title).toBe('My CV');
  });

  it('refuses a delete from another user', async () => {
    const res = await intruder.delete(`/api/cvs/${cvId}`);
    expect(res.status).toBe(404);

    const stored = await CV.findById(cvId);
    expect(stored.isDeleted).toBe(false);
  });

  it('refuses a duplicate from another user', async () => {
    const res = await intruder.post(`/api/cvs/${cvId}/duplicate`);
    expect(res.status).toBe(404);
  });

  it('requires a session', async () => {
    const res = await request(app).get('/api/cvs');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed id without hitting the database', async () => {
    const res = await owner.get('/api/cvs/not-a-real-id');
    expect(res.status).toBe(400);
  });
});

describe('CV lifecycle', () => {
  let agent;

  beforeEach(async () => {
    agent = await signUp('user@example.com');
  });

  it('creates a CV seeded with the owner name and email', async () => {
    const res = await agent.post('/api/cvs').send({ title: 'Developer CV' });

    expect(res.status).toBe(201);
    expect(res.body.data.cv.title).toBe('Developer CV');
    expect(res.body.data.cv.personal.fullName).toBe('Test Person');
    expect(res.body.data.cv.personal.email).toBe('user@example.com');
  });

  it('applies the default template and settings', async () => {
    const res = await agent.post('/api/cvs').send({ title: 'Defaults' });

    expect(res.body.data.cv.templateKey).toBe('classic');
    expect(res.body.data.cv.settings.fontSize).toBe('medium');
    expect(res.body.data.cv.settings.sectionOrder).toContain('experience');
  });

  it('requires a title', async () => {
    const res = await agent.post('/api/cvs').send({});
    expect(res.status).toBe(400);
  });

  it('rejects an unknown template key', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'T' });
    const res = await agent
      .put(`/api/cvs/${created.body.data.cv._id}`)
      .send({ templateKey: 'not-a-template' });

    expect(res.status).toBe(400);
  });

  it('saves content sections', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'Content' });
    const id = created.body.data.cv._id;

    const res = await agent.put(`/api/cvs/${id}`).send({
      summary: 'Experienced developer.',
      skills: [{ name: 'JavaScript', level: 'Advanced' }],
      experience: [{ company: 'Acme', position: 'Developer', isCurrent: true }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.cv.summary).toBe('Experienced developer.');
    expect(res.body.data.cv.skills[0].name).toBe('JavaScript');
    expect(res.body.data.cv.experience[0].company).toBe('Acme');
  });

  // Autosave sends only what changed, so a partial body must not wipe
  // everything else.
  it('leaves untouched fields alone on a partial update', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'Partial' });
    const id = created.body.data.cv._id;

    await agent.put(`/api/cvs/${id}`).send({ summary: 'First summary' });
    const res = await agent.put(`/api/cvs/${id}`).send({ title: 'Renamed' });

    expect(res.body.data.cv.title).toBe('Renamed');
    expect(res.body.data.cv.summary).toBe('First summary');
  });

  // The strength score is calculated by the server on every save. A client
  // sending its own value must not be able to overwrite it.
  it('ignores fields the client is not allowed to set', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'Guarded' });
    const id = created.body.data.cv._id;
    const scoredOnCreation = created.body.data.cv.strengthScore;

    const res = await agent.put(`/api/cvs/${id}`).send({ strengthScore: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.cv.strengthScore).not.toBe(100);
    expect(res.body.data.cv.strengthScore).toBe(scoredOnCreation);
  });

  it('duplicates a CV with a new id and a marked title', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'Original' });
    const id = created.body.data.cv._id;
    await agent.put(`/api/cvs/${id}`).send({ summary: 'Copy me' });

    const res = await agent.post(`/api/cvs/${id}/duplicate`);

    expect(res.status).toBe(201);
    expect(res.body.data.cv._id).not.toBe(id);
    expect(res.body.data.cv.title).toBe('Original (copy)');
    expect(res.body.data.cv.summary).toBe('Copy me');
  });

  it('removes a deleted CV from the list but keeps the document', async () => {
    const created = await agent.post('/api/cvs').send({ title: 'Temporary' });
    const id = created.body.data.cv._id;

    await agent.delete(`/api/cvs/${id}`);

    const list = await agent.get('/api/cvs');
    expect(list.body.data.cvs).toHaveLength(0);

    const stored = await CV.findById(id);
    expect(stored).not.toBeNull();
    expect(stored.isDeleted).toBe(true);
  });

  it('lists only the CVs of the requesting user', async () => {
    await agent.post('/api/cvs').send({ title: 'Mine one' });
    await agent.post('/api/cvs').send({ title: 'Mine two' });

    const other = await signUp('somebody@example.com');
    await other.post('/api/cvs').send({ title: 'Theirs' });

    const res = await agent.get('/api/cvs');

    expect(res.body.data.cvs).toHaveLength(2);
    expect(res.body.data.cvs.map((cv) => cv.title)).not.toContain('Theirs');
  });
});
