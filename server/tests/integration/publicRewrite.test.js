/**
 * Integration tests for the public "rewrite your CV" funnel.
 *
 * The tests that matter most here are the negative ones. This is the
 * only part of the API that answers an unauthenticated caller with real
 * work, and the feature only means anything if the rewritten CV stays
 * out of the response until an account claims it — so that is asserted
 * directly, against the stored draft, rather than by reading the shape
 * of the handler.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Company } from '../../src/models/Company.js';
import { Job } from '../../src/models/Job.js';
import { CV } from '../../src/models/CV.js';
import { PendingRewrite } from '../../src/models/PendingRewrite.js';

let mongo;
let app;
let jobId;

/**
 * A CV with enough text to clear the parser's minimum and enough
 * substance for the rewrite to have something to do.
 */
const CV_TEXT = [
  'Aayush Karki',
  'Full Stack Developer',
  'aayush@example.com | +977 9801234567 | Lalitpur',
  '',
  'SUMMARY',
  'Web developer who enjoys building things end to end and learning new tools.',
  '',
  'EXPERIENCE',
  'Software Engineer, Leapfrog Technology, 2022-08 - Present',
  'Responsible for building a logistics platform in React with a Node.js and Express API',
  'backed by MongoDB. Containerised the services with Docker and deployed them on AWS.',
  'Cut average API response time by 62 per cent by adding Redis caching.',
  'Took automated test coverage from 31 to 78 per cent with Jest.',
  '',
  'Junior Web Developer, Cloudyfox Technology, 2020-10 - 2022-07',
  'Built responsive sites in React and TypeScript with REST endpoints written in Express.',
  'Shipped a booking portal that handled 1,200 bookings in its first quarter.',
  '',
  'EDUCATION',
  'BSc Computer Science, Tribhuvan University, 2016 - 2020',
  '',
  'SKILLS',
  'JavaScript, TypeScript, React, Node.js, Express, MongoDB, REST APIs, Docker, Git, Jest, HTML, CSS',
].join('\n');

/**
 * Attaches the CV as a plain text upload.
 * @returns {import('supertest').Test} The pending request.
 */
function upload() {
  return request(app).post('/api/public/rewrite/upload').attach('document', Buffer.from(CV_TEXT), {
    filename: 'cv.txt',
    contentType: 'text/plain',
  });
}

/**
 * Creates an account and returns its session cookie.
 * @param {string} email - The address to register.
 * @returns {Promise<string[]>} The set-cookie header.
 */
async function signIn(email) {
  await User.create({
    name: 'New User',
    email,
    passwordHash: 'abcd1234',
    accountType: 'jobseeker',
  });

  const login = await request(app).post('/api/auth/login').send({ email, password: 'abcd1234' });
  return login.headers['set-cookie'];
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();

  const owner = await User.create({
    name: 'An Employer',
    email: 'employer@test.com',
    passwordHash: 'abcd1234',
    accountType: 'employer',
    role: 'employer',
  });

  const company = await Company.create({
    owner: owner._id,
    name: 'Acme',
    location: 'Kathmandu',
    registrationNumber: '1',
    phone: '1',
    email: 'company@test.com',
    status: 'approved',
  });

  const job = await Job.create({
    company: company._id,
    postedBy: owner._id,
    title: 'Full Stack Developer',
    description:
      'Build REST APIs in Node.js and Express and the interfaces that consume them in React ' +
      'and TypeScript. Our data lives in MongoDB and PostgreSQL with Redis for caching. ' +
      'Everything ships in Docker through a CI/CD pipeline on AWS. Write unit tests and ' +
      'mentor junior engineers.',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Docker'],
    location: 'Kathmandu',
    status: 'open',
  });

  jobId = job._id.toString();
});

afterEach(async () => {
  await PendingRewrite.deleteMany({});
  await CV.deleteMany({});
  await User.deleteMany({ accountType: 'jobseeker' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('POST /api/public/rewrite/upload', () => {
  it('reads a CV and ranks the open jobs without a session', async () => {
    const res = await upload();

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.readAs).toContain('Aayush');
    expect(res.body.data.results).toHaveLength(1);
    expect(res.body.data.results[0].match.matchScore).toBeTypeOf('number');
  });

  it('refuses a file with almost no text in it', async () => {
    const res = await request(app)
      .post('/api/public/rewrite/upload')
      .attach('document', Buffer.from('too short'), {
        filename: 'cv.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
  });

  it('stores the parsed CV rather than returning it', async () => {
    const res = await upload();
    const stored = await PendingRewrite.findOne({ token: res.body.data.token });

    expect(stored.sourceCv.experience.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain('Leapfrog');
  });
});

describe('POST /api/public/rewrite/:token/job/:jobId', () => {
  it('runs the rewrite and returns the figures without the draft', async () => {
    const { body } = await upload();
    const res = await request(app).post(`/api/public/rewrite/${body.data.token}/job/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.changeCount).toBeGreaterThan(0);
    expect(res.body.data.matchScore).toBeGreaterThan(0);
    expect(res.body.data.honestScore).toBeTypeOf('number');
    expect(res.body.data.changeSummary.length).toBeGreaterThan(0);
  });

  it('keeps every line of the rewritten CV out of the response', async () => {
    // The whole point of the feature. Asserted against the draft that
    // was actually stored, so it cannot pass by accident if the rewrite
    // changes what it writes.
    const { body } = await upload();
    const res = await request(app).post(`/api/public/rewrite/${body.data.token}/job/${jobId}`);

    const stored = await PendingRewrite.findOne({ token: body.data.token });
    const responseText = JSON.stringify(res.body);

    expect(stored.draft).toBeTruthy();
    expect(responseText).not.toContain(stored.draft.summary);
    expect(responseText).not.toContain(stored.draft.personal.fullName);

    for (const change of stored.changes) {
      if (change.after) expect(responseText).not.toContain(change.after);
      if (change.before) expect(responseText).not.toContain(change.before);
    }
  });

  it('refuses an unknown token', async () => {
    const res = await request(app).post(`/api/public/rewrite/${'x'.repeat(43)}/job/${jobId}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/public/rewrite/:token/claim', () => {
  it('refuses a caller with no session', async () => {
    const { body } = await upload();
    await request(app).post(`/api/public/rewrite/${body.data.token}/job/${jobId}`);

    const res = await request(app).post(`/api/public/rewrite/${body.data.token}/claim`);
    expect(res.status).toBe(401);
  });

  it('refuses a session that has not been run against a job', async () => {
    const { body } = await upload();
    const cookie = await signIn('claimer@test.com');

    const res = await request(app)
      .post(`/api/public/rewrite/${body.data.token}/claim`)
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });

  it('saves the CV to the account and returns it in full', async () => {
    const { body } = await upload();
    await request(app).post(`/api/public/rewrite/${body.data.token}/job/${jobId}`);
    const cookie = await signIn('claimer@test.com');

    const res = await request(app)
      .post(`/api/public/rewrite/${body.data.token}/claim`)
      .set('Cookie', cookie);

    expect(res.status).toBe(201);
    expect(res.body.data.cv.summary).toBeTruthy();
    expect(res.body.data.cv.strengthScore).toBeGreaterThan(0);
    expect(res.body.data.changes.length).toBeGreaterThan(0);

    // A CV written for one advert is the wrong default for every other
    // application, so it is never the primary one.
    expect(res.body.data.cv.isPrimary).toBe(false);

    const saved = await CV.findById(res.body.data.cv._id);
    expect(saved.tailoredFor.jobTitle).toBe('Full Stack Developer');
  });

  it('cannot be claimed twice', async () => {
    const { body } = await upload();
    await request(app).post(`/api/public/rewrite/${body.data.token}/job/${jobId}`);
    const cookie = await signIn('claimer@test.com');

    await request(app).post(`/api/public/rewrite/${body.data.token}/claim`).set('Cookie', cookie);

    const again = await request(app)
      .post(`/api/public/rewrite/${body.data.token}/claim`)
      .set('Cookie', cookie);

    expect(again.status).toBe(404);
  });
});
