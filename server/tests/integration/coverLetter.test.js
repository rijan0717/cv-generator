import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';
import { signUpAs } from '../helpers/accounts.js';

/**
 * The cover letter preview route.
 *
 * The composing itself is covered by `tests/unit/coverLetterComposer.test.js`,
 * which exercises the wording rules against a full CV, a sparse one and
 * one with nothing quantified. What is checked here is the part the unit
 * tests cannot see: that the route is behind a session, that it refuses
 * somebody else's CV, that the validation holds, and that nothing is
 * written to the database by a preview.
 */
const app = createApp();

/** A CV with enough in it for the composer to have something to cite. */
const FILLED_CV = {
  personal: {
    fullName: 'Rijan Pariyar',
    headline: 'Operations Manager',
    email: 'rijan@example.com',
  },
  experience: [
    {
      company: 'Himalaya Logistics',
      position: 'Operations Manager',
      startDate: '2022-04',
      isCurrent: true,
      description: 'Ran the fulfilment desk across three regional sites.',
      achievements: ['Cut average fulfilment time by 35% across three regional sites'],
    },
  ],
  skills: [
    { name: 'Excel', level: 'Expert' },
    { name: 'SQL', level: 'Advanced' },
  ],
};

const ADVERT =
  'We are looking for an Operations Manager to run our fulfilment function. ' +
  'Strong Excel and SQL skills are essential, and experience with Python would help.';

beforeAll(async () => {
  await connectMemoryDb();
});

afterEach(async () => {
  await clearMemoryDb();
});

afterAll(async () => {
  await closeMemoryDb();
});

/** Signs in a job seeker and gives them one filled-in CV. */
async function seekerWithCV() {
  const agent = await signUpAs(app, 'seeker@example.com', 'jobseeker');
  const created = await agent.post('/api/cvs').send({ title: 'My CV' });
  const cvId = created.body.data.cv._id;

  await agent.put(`/api/cvs/${cvId}`).send(FILLED_CV);

  return { agent, cvId };
}

describe('POST /api/cover-letters/preview', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app)
      .post('/api/cover-letters/preview')
      .send({ cvId: '507f1f77bcf86cd799439011', companyName: 'Acme' });

    expect(res.status).toBe(401);
  });

  it('composes a letter from the CV', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Sagarmatha Supply', jobTitle: 'Operations Manager' });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toContain('Operations Manager');
    expect(res.body.data.body).toContain('Sagarmatha Supply');
    // The quantified achievement is the strongest thing the CV holds, so
    // it is what the letter leads its evidence with.
    expect(res.body.data.body).toContain('35%');
  });

  it('reports what it took from the CV', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Sagarmatha Supply' });

    expect(res.body.data.usedFacts).toMatchObject({
      fullName: 'Rijan Pariyar',
      headline: 'Operations Manager',
      employer: 'Himalaya Logistics',
    });
  });

  it('names only the skills the CV and the advert share', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent.post('/api/cover-letters/preview').send({
      cvId,
      companyName: 'Sagarmatha Supply',
      jobDescription: ADVERT,
    });

    expect(res.body.data.usedFacts.matchedSkills).toContain('Excel');
    // Asked for by the advert, absent from the CV: it must appear as
    // advice, never as a claim inside the letter.
    expect(res.body.data.body).not.toContain('Python');
    expect(res.body.data.notes.join(' ')).toContain('Python');
  });

  it('says the letter is generic when no advert was pasted', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Sagarmatha Supply' });

    expect(res.body.data.notes.join(' ')).toMatch(/no job advert was pasted/i);
  });

  it('will not write from somebody else’s CV', async () => {
    const { cvId } = await seekerWithCV();
    const stranger = await signUpAs(app, 'stranger@example.com', 'jobseeker');

    const res = await stranger
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Acme' });

    // 404 rather than 403: 403 would confirm the id is real.
    expect(res.status).toBe(404);
  });

  it('requires a company name', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent.post('/api/cover-letters/preview').send({ cvId, companyName: '  ' });

    expect(res.status).toBe(400);
  });

  it('rejects an advert too short to weight anything from', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Acme', jobDescription: 'Too short' });

    expect(res.status).toBe(400);
  });

  it('accepts no advert at all, which is not the same as a short one', async () => {
    const { agent, cvId } = await seekerWithCV();

    const res = await agent
      .post('/api/cover-letters/preview')
      .send({ cvId, companyName: 'Acme', jobDescription: '' });

    expect(res.status).toBe(200);
  });

  it('stores nothing: a preview is a read, not a record', async () => {
    const { agent, cvId } = await seekerWithCV();

    await agent.post('/api/cover-letters/preview').send({ cvId, companyName: 'Acme' });

    const activity = await agent.get('/api/job-match');
    // The composer writes no JobMatch and no activity of its own; the log
    // entry comes later, when a letter becomes a draft or is sent.
    expect(activity.body.data.jobMatches ?? []).toEqual([]);
  });
});
