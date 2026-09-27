import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { Job } from '../../src/models/Job.js';
import { Application } from '../../src/models/Application.js';
import { CV } from '../../src/models/CV.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Registers a user and returns an agent holding their session.
 * @param {string} email
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
 * Creates a user with a company and one open job.
 * @param {string} email
 * @returns {Promise<{agent: object, jobId: string}>}
 */
async function signUpEmployer(email) {
  const agent = await signUp(email);
  await agent.post('/api/companies').send({ name: 'Acme Ltd' });

  const created = await agent.post('/api/jobs').send({
    title: 'Software Developer',
    description: 'We need a developer to build and maintain our web application.',
    jobType: 'Full-time',
  });

  return { agent, jobId: created.body.data.job._id };
}

/**
 * Creates a CV for the given agent.
 * @param {object} agent
 * @returns {Promise<string>} The CV id.
 */
async function createCV(agent) {
  const created = await agent.post('/api/cvs').send({ title: 'My CV' });
  return created.body.data.cv._id;
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

describe('the job board is public', () => {
  it('lists jobs without a session', async () => {
    await signUpEmployer('employer@example.com');

    const res = await request(app).get('/api/jobs');

    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toHaveLength(1);
  });

  it('shows one job without a session', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');

    const res = await request(app).get(`/api/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe('Software Developer');
  });

  // The saved/applied flags need a user, but their absence must not turn
  // a public route into a 401.
  it('returns false flags for an anonymous visitor', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');

    const res = await request(app).get(`/api/jobs/${jobId}`);

    expect(res.body.data.isSaved).toBe(false);
    expect(res.body.data.hasApplied).toBe(false);
  });
});

describe('posting a job', () => {
  it('requires a company first', async () => {
    const agent = await signUp('nocompany@example.com');

    const res = await agent.post('/api/jobs').send({
      title: 'Developer',
      description: 'A description long enough to pass validation checks.',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/company/i);
  });

  it('requires a session', async () => {
    const res = await request(app).post('/api/jobs').send({ title: 'X', description: 'Y' });
    expect(res.status).toBe(401);
  });

  it('refuses a second company for the same user', async () => {
    const agent = await signUp('owner@example.com');
    await agent.post('/api/companies').send({ name: 'First' });

    const res = await agent.post('/api/companies').send({ name: 'Second' });
    expect(res.status).toBe(409);
  });

  it('hides the job of another user from editing behind a 404', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');
    const intruder = await signUp('intruder@example.com');

    const res = await intruder.put(`/api/jobs/${jobId}`).send({ title: 'Hijacked' });

    expect(res.status).toBe(404);

    const stored = await Job.findById(jobId);
    expect(stored.title).toBe('Software Developer');
  });

  it('soft deletes so applications survive', async () => {
    const { agent, jobId } = await signUpEmployer('employer@example.com');

    await agent.delete(`/api/jobs/${jobId}`);

    const stored = await Job.findById(jobId);
    expect(stored).not.toBeNull();
    expect(stored.isDeleted).toBe(true);
  });
});

describe('applying', () => {
  let employer;
  let jobId;
  let seeker;
  let cvId;

  beforeEach(async () => {
    ({ agent: employer, jobId } = await signUpEmployer('employer@example.com'));
    seeker = await signUp('seeker@example.com');
    cvId = await createCV(seeker);
  });

  it('records an application and counts it on the job', async () => {
    const res = await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });

    expect(res.status).toBe(201);

    const job = await Job.findById(jobId);
    expect(job.applicationCount).toBe(1);
  });

  it('refuses a second application to the same job', async () => {
    await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });
    const res = await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });

    expect(res.status).toBe(409);
  });

  it('refuses an application using a CV owned by someone else', async () => {
    const other = await signUp('other@example.com');
    const otherCv = await createCV(other);

    const res = await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId: otherCv });

    expect(res.status).toBe(404);
  });

  it('refuses an application to your own posting', async () => {
    const employerCv = await createCV(employer);

    const res = await employer.post(`/api/jobs/${jobId}/apply`).send({ cvId: employerCv });

    expect(res.status).toBe(400);
  });

  it('refuses an application to a closed job', async () => {
    await employer.put(`/api/jobs/${jobId}`).send({ status: 'closed' });

    const res = await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });

    expect(res.status).toBe(400);
  });

  // The snapshot is the whole point of the design: what the employer
  // reviews must not change after submission.
  it('stores a snapshot that later CV edits do not alter', async () => {
    await seeker.put(`/api/cvs/${cvId}`).send({ summary: 'Original summary' });
    await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });

    await seeker.put(`/api/cvs/${cvId}`).send({ summary: 'Changed after applying' });

    const application = await Application.findOne({ job: jobId });
    expect(application.cvSnapshot.summary).toBe('Original summary');
  });

  it('survives the applicant deleting the CV', async () => {
    await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });
    await seeker.delete(`/api/cvs/${cvId}`);

    const application = await Application.findOne({ job: jobId });
    expect(application.cvSnapshot).toBeTruthy();

    // And the employer can still read it.
    const list = await employer.get(`/api/jobs/${jobId}/applications`);
    expect(list.body.data.applications).toHaveLength(1);
  });
});

describe('who may see an application', () => {
  let employer;
  let jobId;
  let seeker;
  let applicationId;

  beforeEach(async () => {
    ({ agent: employer, jobId } = await signUpEmployer('employer@example.com'));
    seeker = await signUp('seeker@example.com');
    const cvId = await createCV(seeker);

    const applied = await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });
    applicationId = applied.body.data.application.id;
  });

  it('lets the applicant read their own', async () => {
    const res = await seeker.get(`/api/applications/${applicationId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.application.cv).toBeTruthy();
  });

  it('lets the employer read it', async () => {
    const res = await employer.get(`/api/applications/${applicationId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.application.cv).toBeTruthy();
  });

  // A CV holds a full name, phone number and address. An unrelated user
  // must not be able to reach it.
  it('hides it from an unrelated user', async () => {
    const stranger = await signUp('stranger@example.com');

    const res = await stranger.get(`/api/applications/${applicationId}`);

    expect(res.status).toBe(404);
  });

  it('refuses an anonymous request', async () => {
    const res = await request(app).get(`/api/applications/${applicationId}`);
    expect(res.status).toBe(401);
  });

  it('hides the applications of another company', async () => {
    const { agent: rival } = await signUpEmployer('rival@example.com');

    const res = await rival.get(`/api/jobs/${jobId}/applications`);

    expect(res.status).toBe(404);
  });

  it('never shows the employer note to the applicant', async () => {
    await employer.patch(`/api/applications/${applicationId}/status`).send({
      status: 'reviewed',
      employerNote: 'Private hiring note',
    });

    const res = await seeker.get(`/api/applications/${applicationId}`);

    expect(res.body.data.application.employerNote).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Private hiring note');
  });

  it('lets the applicant withdraw but not shortlist themselves', async () => {
    const withdraw = await seeker
      .patch(`/api/applications/${applicationId}/status`)
      .send({ status: 'withdrawn' });
    expect(withdraw.status).toBe(200);

    const promote = await seeker
      .patch(`/api/applications/${applicationId}/status`)
      .send({ status: 'shortlisted' });
    expect(promote.status).toBe(403);
  });
});

describe('saving jobs', () => {
  it('saves, lists and unsaves', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');
    const seeker = await signUp('seeker@example.com');

    await seeker.post(`/api/jobs/${jobId}/save`);

    const saved = await seeker.get('/api/jobs/mine/saved');
    expect(saved.body.data.jobs).toHaveLength(1);

    await seeker.delete(`/api/jobs/${jobId}/save`);

    const after = await seeker.get('/api/jobs/mine/saved');
    expect(after.body.data.jobs).toHaveLength(0);
  });

  // Clicking save twice means "I want this saved", not "fail".
  it('is idempotent', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');
    const seeker = await signUp('seeker@example.com');

    await seeker.post(`/api/jobs/${jobId}/save`);
    const second = await seeker.post(`/api/jobs/${jobId}/save`);

    expect(second.status).toBe(200);

    const saved = await seeker.get('/api/jobs/mine/saved');
    expect(saved.body.data.jobs).toHaveLength(1);
  });

  it('leaves out a saved job that has since been removed', async () => {
    const { agent: employer, jobId } = await signUpEmployer('employer@example.com');
    const seeker = await signUp('seeker@example.com');

    await seeker.post(`/api/jobs/${jobId}/save`);
    await employer.delete(`/api/jobs/${jobId}`);

    const saved = await seeker.get('/api/jobs/mine/saved');
    expect(saved.body.data.jobs).toHaveLength(0);
  });
});

describe('the CV snapshot is a copy, not a reference', () => {
  it('does not carry the original CV id or owner', async () => {
    const { jobId } = await signUpEmployer('employer@example.com');
    const seeker = await signUp('seeker@example.com');
    const cvId = await createCV(seeker);

    await seeker.post(`/api/jobs/${jobId}/apply`).send({ cvId });

    const application = await Application.findOne({ job: jobId });

    expect(application.cvSnapshot._id).toBeUndefined();
    expect(application.cvSnapshot.user).toBeUndefined();
    // The link back is kept separately, for the applicant's reference.
    expect(application.sourceCv.toString()).toBe(cvId);

    // The original is untouched.
    const original = await CV.findById(cvId);
    expect(original).not.toBeNull();
  });
});
