/**
 * Integration tests for the CV–Job Match API.
 *
 * These check the things the algorithm's own tests cannot: that a user can
 * only analyse their own CVs, that the input is validated, and that the
 * analysis is stored and can be read back.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { JobMatch } from '../../src/models/JobMatch.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

const ADVERT =
  'We are looking for a backend developer to build REST APIs with Node.js and Express. ' +
  'You will model data in MongoDB, write unit tests and deploy with Docker on AWS.';

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

/**
 * Creates a CV with enough content to be worth analysing.
 * @param {import('supertest').SuperAgentTest} agent - A signed-in agent.
 * @returns {Promise<string>} The new CV's id.
 */
async function createFilledCV(agent) {
  const created = await agent.post('/api/cvs').send({ title: 'Backend CV' });
  const cvId = created.body.data.cv._id;

  await agent
    .put(`/api/cvs/${cvId}`)
    .send({
      summary: 'Backend developer building REST APIs with Node.js, Express and MongoDB.',
      skills: [
        { name: 'Node.js', level: 'Advanced' },
        { name: 'Express', level: 'Advanced' },
        { name: 'MongoDB', level: 'Intermediate' },
      ],
      experience: [
        {
          company: 'Acme',
          position: 'Backend Developer',
          description: 'Built REST APIs with Node.js and Express, backed by MongoDB.',
          achievements: ['Reduced response time by 30%'],
        },
      ],
    });

  return cvId;
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

describe('POST /api/job-match', () => {
  let owner;
  let intruder;
  let cvId;

  beforeEach(async () => {
    owner = await signUp('owner@example.com');
    intruder = await signUp('intruder@example.com');
    cvId = await createFilledCV(owner);
  });

  it('refuses an anonymous caller', async () => {
    const res = await request(app).post('/api/job-match').send({ cvId, jobDescription: ADVERT });
    expect(res.status).toBe(401);
  });

  it('analyses the owner’s CV and stores the result', async () => {
    const res = await owner
      .post('/api/job-match')
      .send({ cvId, jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { jobMatch } = res.body.data;
    expect(jobMatch.matchScore).toBeGreaterThan(0);
    expect(jobMatch.matchScore).toBeLessThanOrEqual(100);
    expect(jobMatch.jobTitle).toBe('Backend Developer');
    expect(jobMatch.matchedSkills).toContain('Node.js');
    expect(jobMatch.suggestions.length).toBeGreaterThan(0);

    expect(await JobMatch.countDocuments({})).toBe(1);
  });

  it('will not analyse somebody else’s CV', async () => {
    const res = await intruder.post('/api/job-match').send({ cvId, jobDescription: ADVERT });
    expect(res.status).toBe(404);
    expect(await JobMatch.countDocuments({})).toBe(0);
  });

  it('rejects a job description that is too short to weight', async () => {
    const res = await owner.post('/api/job-match').send({ cvId, jobDescription: 'Developer' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing CV id', async () => {
    const res = await owner.post('/api/job-match').send({ jobDescription: ADVERT });
    expect(res.status).toBe(400);
  });

  it('leaves the CV itself untouched', async () => {
    const before = await owner.get(`/api/cvs/${cvId}`);
    await owner.post('/api/job-match').send({ cvId, jobDescription: ADVERT });
    const after = await owner.get(`/api/cvs/${cvId}`);

    expect(after.body.data.cv.updatedAt).toBe(before.body.data.cv.updatedAt);
    expect(after.body.data.cv.summary).toBe(before.body.data.cv.summary);
  });

  it('accepts a job taken from the board instead of pasted text', async () => {
    await owner.post('/api/companies').send({
      name: 'Acme Ltd',
      description: 'A company that exists only for this test.',
    });

    const job = await owner.post('/api/jobs').send({
      title: 'Backend Developer',
      description: ADVERT,
      skills: ['Node.js', 'MongoDB'],
    });

    const jobId = job.body.data.job._id;

    const res = await owner.post('/api/job-match').send({ cvId, jobId });

    expect(res.status).toBe(201);
    expect(res.body.data.jobMatch.job).toBe(jobId);
    expect(res.body.data.jobMatch.jobTitle).toBe('Backend Developer');
  });
});

describe('Match history', () => {
  let owner;
  let intruder;
  let matchId;

  beforeEach(async () => {
    owner = await signUp('owner@example.com');
    intruder = await signUp('intruder@example.com');

    const cvId = await createFilledCV(owner);
    const created = await owner
      .post('/api/job-match')
      .send({ cvId, jobDescription: ADVERT, jobTitle: 'Backend Developer' });

    matchId = created.body.data.jobMatch._id;
  });

  it('lists only the caller’s own analyses', async () => {
    const mine = await owner.get('/api/job-match');
    expect(mine.status).toBe(200);
    expect(mine.body.data.jobMatches).toHaveLength(1);

    const theirs = await intruder.get('/api/job-match');
    expect(theirs.body.data.jobMatches).toHaveLength(0);
  });

  it('returns one analysis in full', async () => {
    const res = await owner.get(`/api/job-match/${matchId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.jobMatch.jobDescription).toBe(ADVERT);
    expect(res.body.data.jobMatch.cv.title).toBe('Backend CV');
  });

  it('hides another user’s analysis', async () => {
    const res = await intruder.get(`/api/job-match/${matchId}`);
    expect(res.status).toBe(404);
  });

  it('deletes the caller’s own analysis', async () => {
    const res = await owner.delete(`/api/job-match/${matchId}`);
    expect(res.status).toBe(200);
    expect(await JobMatch.countDocuments({})).toBe(0);
  });

  it('will not let another user delete it', async () => {
    const res = await intruder.delete(`/api/job-match/${matchId}`);
    expect(res.status).toBe(404);
    expect(await JobMatch.countDocuments({})).toBe(1);
  });
});

describe('GET /api/cvs/:id/score', () => {
  it('returns a breakdown and suggestions for the owner', async () => {
    const owner = await signUp('owner@example.com');
    const cvId = await createFilledCV(owner);

    const res = await owner.get(`/api/cvs/${cvId}/score`);

    expect(res.status).toBe(200);
    expect(res.body.data.score.totalScore).toBeGreaterThan(0);
    expect(res.body.data.score.breakdown.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.score.suggestions)).toBe(true);
  });

  it('stores the score on the CV when it is saved', async () => {
    const owner = await signUp('owner@example.com');
    const cvId = await createFilledCV(owner);

    const res = await owner.get(`/api/cvs/${cvId}`);
    expect(res.body.data.cv.strengthScore).toBeGreaterThan(0);
    expect(res.body.data.cv.strengthBreakdown.length).toBeGreaterThan(0);
  });
});

describe('POST /api/job-match/scores', () => {
  let owner;
  let cvId;
  let jobId;

  beforeEach(async () => {
    owner = await signUp('owner@example.com');
    cvId = await createFilledCV(owner);

    await owner.post('/api/companies').send({
      name: 'Acme Ltd',
      description: 'A company that exists only for this test.',
    });

    const job = await owner.post('/api/jobs').send({
      title: 'Backend Developer',
      description: ADVERT,
      skills: ['Node.js', 'MongoDB'],
    });

    jobId = job.body.data.job._id;
  });

  it('refuses an anonymous caller', async () => {
    const res = await request(app).post('/api/job-match/scores').send({ jobIds: [jobId] });
    expect(res.status).toBe(401);
  });

  it('scores the board against the primary CV', async () => {
    await owner.patch(`/api/cvs/${cvId}/primary`);

    const res = await owner.post('/api/job-match/scores').send({ jobIds: [jobId] });

    expect(res.status).toBe(200);
    expect(res.body.data.cv.title).toBe('Backend CV');
    expect(res.body.data.scores).toHaveLength(1);
    expect(res.body.data.scores[0].id).toBe(jobId);
    expect(res.body.data.scores[0].matchScore).toBeGreaterThan(0);
    expect(res.body.data.scores[0].band).toBeTruthy();
  });

  // No primary CV is a normal state, so the client can render a prompt
  // rather than having to distinguish an error from an empty answer.
  it('answers with no scores when no CV is primary', async () => {
    const res = await owner.post('/api/job-match/scores').send({ jobIds: [jobId] });

    expect(res.status).toBe(200);
    expect(res.body.data.cv).toBeNull();
    expect(res.body.data.scores).toEqual([]);
  });

  it('stores nothing — these are estimates, not saved analyses', async () => {
    await owner.patch(`/api/cvs/${cvId}/primary`);
    await owner.post('/api/job-match/scores').send({ jobIds: [jobId] });

    expect(await JobMatch.countDocuments({})).toBe(0);
  });

  it('rejects an empty or malformed list of ids', async () => {
    await owner.patch(`/api/cvs/${cvId}/primary`);

    expect((await owner.post('/api/job-match/scores').send({ jobIds: [] })).status).toBe(400);
    expect((await owner.post('/api/job-match/scores').send({ jobIds: ['nope'] })).status).toBe(400);
  });
});
