/**
 * Integration tests for the public site search, `GET /api/search`.
 *
 * It is public, so the tests check that it finds only what a visitor could
 * already reach: published content, open jobs of approved companies, and
 * open-to-work job seekers as trimmed cards.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Content } from '../../src/models/Content.js';
import { Company } from '../../src/models/Company.js';
import { Job } from '../../src/models/Job.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/** A company with one open job, approved or not. */
async function companyWithJob(status, title) {
  const owner = await User.create({
    name: `Owner ${title}`,
    email: `${status}-${title.replace(/\W/g, '')}@example.com`,
    passwordHash: 'password123',
    accountType: 'employer',
  });
  const company = await Company.create({
    owner: owner._id,
    name: `${status} Co`,
    location: 'Kathmandu',
    registrationNumber: `REG-${status}`,
    phone: '+977 1 4000000',
    email: `${status}@company.example.com`,
    status,
  });
  await Job.create({
    company: company._id,
    postedBy: owner._id,
    title,
    description: 'Build and maintain web applications across the whole stack.',
    jobType: 'Full-time',
    status: 'open',
  });
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

describe('GET /api/search', () => {
  it('refuses a query under two characters', async () => {
    const res = await request(app).get('/api/search?q=a');
    expect(res.status).toBe(400);
  });

  it('refuses an unknown type', async () => {
    const res = await request(app).get('/api/search?q=react&type=secrets');
    expect(res.status).toBe(400);
  });

  it('finds open jobs of approved companies only', async () => {
    await companyWithJob('approved', 'React Developer');
    await companyWithJob('pending', 'React Engineer');

    const res = await request(app).get('/api/search?q=react');

    expect(res.status).toBe(200);
    expect(res.body.data.jobs.map((job) => job.title)).toEqual(['React Developer']);
  });

  it('finds published posts only', async () => {
    const author = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'password123',
      role: 'admin',
    });
    await Content.create({
      type: 'post',
      title: 'Writing a CV summary',
      slug: 'writing-a-cv-summary',
      status: 'published',
      publishedAt: new Date(),
      author: author._id,
    });
    await Content.create({
      type: 'post',
      title: 'Draft CV summary notes',
      slug: 'draft-cv-summary-notes',
      status: 'draft',
      author: author._id,
    });

    const res = await request(app).get('/api/search?q=summary&type=blog');

    expect(res.body.data.blog.map((post) => post.title)).toEqual(['Writing a CV summary']);
    expect(res.body.data.jobs).toEqual([]);
  });

  it('finds open-to-work people as public cards, with no contact details', async () => {
    await User.create({
      name: 'Oliver Bennett',
      email: 'oliver@example.com',
      passwordHash: 'password123',
      accountType: 'jobseeker',
      jobSeekerProfile: { position: 'Full Stack Developer', openToWork: true },
    });
    await User.create({
      name: 'Hidden Person',
      email: 'hidden@example.com',
      passwordHash: 'password123',
      accountType: 'jobseeker',
      jobSeekerProfile: { position: 'Full Stack Developer', openToWork: false },
    });

    const res = await request(app).get('/api/search?q=full%20stack&type=people');

    expect(res.body.data.people).toHaveLength(1);
    expect(res.body.data.people[0].name).toBe('Oliver B.');
    expect(JSON.stringify(res.body)).not.toContain('oliver@example.com');
  });

  it('treats regular-expression characters literally', async () => {
    await companyWithJob('approved', 'React Developer');
    const res = await request(app).get('/api/search?q=.*');
    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toEqual([]);
  });
});
