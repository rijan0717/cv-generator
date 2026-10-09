/**
 * Integration tests for the Job-Tailored CV Rewrite API.
 *
 * The algorithm has its own unit tests. These check what only the route
 * can be wrong about: that a user cannot tailor somebody else's CV, that
 * the preview really does store nothing, that saving creates a *new* CV
 * and leaves the original alone, and that the draft the user edited is
 * what gets stored rather than the one the server generated.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CV } from '../../src/models/CV.js';
import { ActivityLog } from '../../src/models/ActivityLog.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

const ADVERT =
  'Backend Developer. We need someone to build REST APIs with Node.js, Express and MongoDB. ' +
  'Docker and AWS experience is essential. You will write unit tests and work in an agile team.';

/**
 * Registers a user and returns an agent holding their session.
 * @param {string} email - The account to create.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUp(email) {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Test Person', email, password: 'password123' });
  return agent;
}

/**
 * Creates a CV with enough content for the rewrite to have something to do.
 * @param {import('supertest').SuperAgentTest} agent - A signed-in agent.
 * @returns {Promise<string>} The new CV's id.
 */
async function createFilledCV(agent) {
  const created = await agent.post('/api/cvs').send({ title: 'Developer CV' });
  const cvId = created.body.data.cv._id;

  await agent.put(`/api/cvs/${cvId}`).send({
    personal: { fullName: 'A Person', headline: 'Junior Developer', email: 'a@example.com' },
    summary: 'A developer.',
    skills: [{ name: 'Node.js', level: 'Advanced' }],
    experience: [
      {
        company: 'Acme',
        position: 'Developer',
        startDate: '2021-01',
        endDate: '2024-06',
        description: 'Responsible for building REST APIs in Node.js with Express.',
        achievements: ['Cut API response time by 40% with caching'],
      },
    ],
  });

  return cvId;
}

/**
 * Creates a user with a company and one open job.
 * @param {string} email - The employer's account.
 * @returns {Promise<string>} The job id.
 */
async function postJob(email) {
  const agent = await signUp(email);
  await agent.post('/api/companies').send({ name: 'Acme Ltd' });

  const created = await agent.post('/api/jobs').send({
    title: 'Backend Developer',
    description: ADVERT,
    jobType: 'Full-time',
    skills: ['Node.js', 'Docker'],
  });

  return created.body.data.job._id;
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

describe('POST /api/cvs/:id/tailor', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app)
      .post('/api/cvs/507f1f77bcf86cd799439011/tailor')
      .send({ jobDescription: ADVERT });

    expect(res.status).toBe(401);
  });

  it('returns 404 for a CV belonging to somebody else', async () => {
    const owner = await signUp('owner@example.com');
    const cvId = await createFilledCV(owner);

    const stranger = await signUp('stranger@example.com');
    const res = await stranger.post(`/api/cvs/${cvId}/tailor`).send({ jobDescription: ADVERT });

    // 404 rather than 403: telling the caller the id is real would leak it.
    expect(res.status).toBe(404);
  });

  it('rejects a job description too short to weight', async () => {
    const agent = await signUp('short@example.com');
    const cvId = await createFilledCV(agent);

    const res = await agent.post(`/api/cvs/${cvId}/tailor`).send({ jobDescription: 'Dev wanted' });

    expect(res.status).toBe(400);
  });

  it('returns a draft, the changes and a before-and-after comparison', async () => {
    const agent = await signUp('draft@example.com');
    const cvId = await createFilledCV(agent);

    const res = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    expect(res.status).toBe(200);

    const { draft, changes, comparison, suggestedTitle } = res.body.data;

    expect(draft.personal.headline).toBe('Backend Developer');
    expect(changes.length).toBeGreaterThan(0);
    expect(comparison.before.matchScore).toBeTypeOf('number');
    expect(comparison.after.matchScore).toBeTypeOf('number');
    expect(suggestedTitle).toContain('Backend Developer');
  });

  it('stores nothing', async () => {
    const agent = await signUp('nothing@example.com');
    const cvId = await createFilledCV(agent);

    await agent.post(`/api/cvs/${cvId}/tailor`).send({ jobDescription: ADVERT });

    // The preview is a suggestion, not a document. One CV in, one CV out.
    expect(await CV.countDocuments({})).toBe(1);
  });

  it('accepts a job chosen from the board', async () => {
    const jobId = await postJob('employer@example.com');

    const agent = await signUp('seeker@example.com');
    const cvId = await createFilledCV(agent);

    const res = await agent.post(`/api/cvs/${cvId}/tailor`).send({ jobId });

    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe('Backend Developer');
    expect(res.body.data.draft.personal.headline).toBe('Backend Developer');
  });
});

describe('POST /api/cvs/:id/tailor/save', () => {
  it('creates a new CV and leaves the original alone', async () => {
    const agent = await signUp('save@example.com');
    const cvId = await createFilledCV(agent);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    const res = await agent.post(`/api/cvs/${cvId}/tailor/save`).send({
      draft: preview.body.data.draft,
      title: 'Backend Developer CV',
      jobTitle: 'Backend Developer',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.cv.title).toBe('Backend Developer CV');
    expect(res.body.data.cv.tailoredFor.sourceCv).toBe(cvId);
    expect(res.body.data.cv.tailoredFor.jobTitle).toBe('Backend Developer');

    const original = await CV.findById(cvId);
    expect(original.personal.headline).toBe('Junior Developer');
    expect(original.summary).toBe('A developer.');

    expect(await CV.countDocuments({})).toBe(2);
  });

  it('saves the draft the user edited, not the one that was generated', async () => {
    const agent = await signUp('edited@example.com');
    const cvId = await createFilledCV(agent);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    const edited = { ...preview.body.data.draft, summary: 'My own words, thank you.' };

    const res = await agent
      .post(`/api/cvs/${cvId}/tailor/save`)
      .send({ draft: edited, title: 'Edited CV' });

    expect(res.body.data.cv.summary).toBe('My own words, thank you.');
  });

  it('never makes the tailored CV primary', async () => {
    const agent = await signUp('primary@example.com');
    const cvId = await createFilledCV(agent);
    await agent.patch(`/api/cvs/${cvId}/primary`);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    const res = await agent
      .post(`/api/cvs/${cvId}/tailor/save`)
      .send({ draft: preview.body.data.draft });

    // A CV written for one advert is the wrong default for every other
    // application, so the original keeps the flag.
    expect(res.body.data.cv.isPrimary).toBe(false);
    expect((await CV.findById(cvId)).isPrimary).toBe(true);
  });

  it('refuses a body with no draft', async () => {
    const agent = await signUp('nodraft@example.com');
    const cvId = await createFilledCV(agent);

    const res = await agent.post(`/api/cvs/${cvId}/tailor/save`).send({ title: 'Nothing' });

    expect(res.status).toBe(400);
  });

  it('records the save in the activity log', async () => {
    const agent = await signUp('logged@example.com');
    const cvId = await createFilledCV(agent);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    await agent.post(`/api/cvs/${cvId}/tailor/save`).send({
      draft: preview.body.data.draft,
      jobTitle: 'Backend Developer',
    });

    const logged = await ActivityLog.findOne({ action: 'CV_TAILOR' });
    expect(logged).not.toBeNull();
    expect(logged.meta.jobTitle).toBe('Backend Developer');
  });
  it('records the match figures on the new CV and leaves the original unmarked', async () => {
    const agent = await signUp('figures@example.com');
    const cvId = await createFilledCV(agent);

    const before = await CV.findById(cvId);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    const res = await agent.post(`/api/cvs/${cvId}/tailor/save`).send({
      draft: preview.body.data.draft,
      jobDescription: ADVERT,
      jobTitle: 'Backend Developer',
    });

    const { tailoredFor } = res.body.data.cv;

    expect(tailoredFor.baselineMatchScore).toEqual(expect.any(Number));
    expect(tailoredFor.matchScore).toEqual(expect.any(Number));
    expect(tailoredFor.matchScore).toBeGreaterThan(tailoredFor.baselineMatchScore);

    // The whole point: tailoring produces a new document and does not
    // re-mark the one it was written from.
    const after = await CV.findById(cvId);
    expect(after.tailoredFor).toBeNull();
    expect(after.strengthScore).toBe(before.strengthScore);
  });

  it('scores the draft the user kept, not the one the algorithm wrote', async () => {
    const agent = await signUp('kept@example.com');
    const cvId = await createFilledCV(agent);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    // A user who strips the rewrite back to almost nothing should see
    // that reflected, not the figure the preview promised.
    const gutted = { ...preview.body.data.draft, summary: '', skills: [] };

    const res = await agent.post(`/api/cvs/${cvId}/tailor/save`).send({
      draft: gutted,
      jobDescription: ADVERT,
    });

    expect(res.body.data.cv.tailoredFor.matchScore).toBeLessThan(
      preview.body.data.comparison.after.matchScore,
    );
  });

  it('saves without match figures when no advert is named', async () => {
    const agent = await signUp('noadvert@example.com');
    const cvId = await createFilledCV(agent);

    const preview = await agent
      .post(`/api/cvs/${cvId}/tailor`)
      .send({ jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    const res = await agent
      .post(`/api/cvs/${cvId}/tailor/save`)
      .send({ draft: preview.body.data.draft });

    // No score is better than one measured against an advert nobody named.
    expect(res.body.data.cv.tailoredFor.baselineMatchScore).toBeNull();
    expect(res.body.data.cv.tailoredFor.matchScore).toBeNull();
  });
});
