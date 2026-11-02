/**
 * Integration tests for the public "open to work" preview on the home page.
 *
 * `GET /api/talent/preview` is the one directory route without a login, so
 * these tests check what it leaves out as much as what it returns:
 *
 *   - only active job seekers who are open to work;
 *   - the name shortened to "First L.";
 *   - no id, email, photo or "about" text;
 *   - the rest of `/api/talent` still refuses a visitor.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { shortName } from '../../src/controllers/talent.controller.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/** A job seeker, with whatever overrides a test needs. */
function seeker(email, overrides = {}) {
  return User.create({
    name: 'Asha Kumari Shrestha',
    email,
    passwordHash: 'password123',
    accountType: 'jobseeker',
    avatarUrl: '/uploads/face.jpg',
    jobSeekerProfile: {
      position: 'React Developer',
      industry: 'technology',
      yearsExperience: 4,
      openToWork: true,
      employmentTypes: ['full-time'],
      location: 'Kathmandu',
      about: 'Private text that should not be public.',
    },
    ...overrides,
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

describe('shortName', () => {
  it('keeps the first name and the surname initial', () => {
    expect(shortName('Asha Kumari Shrestha')).toBe('Asha S.');
    expect(shortName('  rijan   pariyar ')).toBe('rijan P.');
  });

  it('leaves a single name alone', () => {
    expect(shortName('Madonna')).toBe('Madonna');
    expect(shortName('')).toBe('');
  });
});

describe('GET /api/talent/preview', () => {
  it('works without logging in and returns only safe fields', async () => {
    await seeker('asha@example.com');

    const res = await request(app).get('/api/talent/preview');

    expect(res.status).toBe(200);
    expect(res.body.data.people).toHaveLength(1);

    const [person] = res.body.data.people;
    expect(person).toEqual({
      name: 'Asha S.',
      profile: {
        position: 'React Developer',
        industry: 'Technology & IT',
        yearsExperience: 4,
        location: 'Kathmandu',
        employmentTypes: ['Full time'],
        openToWork: true,
      },
    });
    // Spelled out, because these are the point of the route.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('asha@example.com');
    expect(body).not.toContain('face.jpg');
    expect(body).not.toContain('Private text');
  });

  it('leaves out people not open to work, blocked, deleted, employers and admins', async () => {
    await seeker('open@example.com');
    await seeker('closed@example.com', {
      jobSeekerProfile: { position: 'Closed', openToWork: false },
    });
    await seeker('blocked@example.com', { status: 'blocked' });
    await seeker('deleted@example.com', { isDeleted: true });
    await seeker('employer@example.com', { accountType: 'employer' });
    await seeker('admin@example.com', { role: 'admin', accountType: null });

    const res = await request(app).get('/api/talent/preview');

    expect(res.body.data.people).toHaveLength(1);
  });

  it('returns at most eight people', async () => {
    for (let i = 0; i < 10; i += 1) await seeker(`p${i}@example.com`);

    const res = await request(app).get('/api/talent/preview');

    expect(res.body.data.people).toHaveLength(8);
  });

  it('does not open the rest of the directory', async () => {
    const res = await request(app).get('/api/talent');
    expect(res.status).toBe(401);
  });
});
