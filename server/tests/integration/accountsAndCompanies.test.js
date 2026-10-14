/**
 * Integration tests for account types and company approval.
 *
 *   - The "job seeker / employer" choice is made once and cannot change.
 *   - Only employers manage a company and post jobs; only job seekers apply.
 *   - A new company is pending; it cannot post, and its jobs stay hidden,
 *     until the admin approves it.
 *   - The admin needs a document to approve and a reason to reject; a
 *     rejected company is resubmitted by editing it.
 *   - The registration document is private to its owner and the admin.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Company } from '../../src/models/Company.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';
import { signUpAs, createApprovedCompany, COMPANY_DETAILS } from '../helpers/accounts.js';

const app = createApp();

/** The smallest valid PDF, for the document upload. */
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

const JOB = {
  title: 'QA Engineer',
  description: 'Test our web application by hand and with automated test suites.',
  jobType: 'Full-time',
};

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

/** An employer whose company has been submitted with a document, but not reviewed. */
async function pendingEmployer(email = 'employer@example.com') {
  const agent = await signUpAs(app, email, 'employer');
  const created = await agent.post('/api/companies').send(COMPANY_DETAILS);
  await agent
    .post('/api/companies/mine/document')
    .attach('document', PDF, { filename: 'registration.pdf', contentType: 'application/pdf' });
  return { agent, companyId: created.body.data.company._id };
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

describe('account type', () => {
  it('starts unset and is returned with the user', async () => {
    const agent = await signUpAs(app, 'new@example.com', null);
    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.accountType).toBeNull();
  });

  it('can be chosen once and not changed', async () => {
    const agent = await signUpAs(app, 'seeker@example.com', null);

    const first = await agent
      .patch('/api/users/me/account-type')
      .send({ accountType: 'jobseeker' });
    expect(first.status).toBe(200);
    expect(first.body.data.user.accountType).toBe('jobseeker');

    const second = await agent
      .patch('/api/users/me/account-type')
      .send({ accountType: 'employer' });
    expect(second.status).toBe(409);
  });

  it('rejects an unknown type', async () => {
    const agent = await signUpAs(app, 'x@example.com', null);
    const res = await agent.patch('/api/users/me/account-type').send({ accountType: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('who may do what', () => {
  it('stops a job seeker creating a company', async () => {
    const seeker = await signUpAs(app, 'seeker@example.com', 'jobseeker');
    const res = await seeker.post('/api/companies').send(COMPANY_DETAILS);
    expect(res.status).toBe(403);
  });

  it('requires the verification details for a company', async () => {
    const employer = await signUpAs(app, 'employer@example.com', 'employer');
    const res = await employer.post('/api/companies').send({ name: 'Acme Ltd' });
    expect(res.status).toBe(400);
  });

  it('stops an employer saving a job', async () => {
    const owner = await signUpAs(app, 'owner@example.com', 'employer');
    await createApprovedCompany(owner);
    const job = await owner.post('/api/jobs').send(JOB);

    const other = await signUpAs(app, 'other@example.com', 'employer');
    const res = await other.post(`/api/jobs/${job.body.data.job._id}/save`);
    expect(res.status).toBe(403);
  });
});

describe('a pending company', () => {
  it('starts pending and cannot post jobs', async () => {
    const { agent } = await pendingEmployer();

    const mine = await agent.get('/api/companies/mine');
    expect(mine.body.data.company.status).toBe('pending');
    expect(mine.body.data.company.hasDocument).toBe(true);

    const res = await agent.post('/api/jobs').send(JOB);
    expect(res.status).toBe(403);
  });

  it('keeps its jobs off the public board until approved', async () => {
    const { agent, companyId } = await pendingEmployer();
    // Approve, post, then send the company back to pending.
    await Company.updateOne({ _id: companyId }, { status: 'approved' });
    const job = await agent.post('/api/jobs').send(JOB);
    await Company.updateOne({ _id: companyId }, { status: 'pending' });

    const board = await request(app).get('/api/jobs');
    expect(board.body.data.jobs).toHaveLength(0);

    const page = await request(app).get(`/api/jobs/${job.body.data.job._id}`);
    expect(page.status).toBe(404);

    // The employer can still see their own job.
    const own = await agent.get(`/api/jobs/${job.body.data.job._id}`);
    expect(own.status).toBe(200);
  });
});

describe('admin review', () => {
  it('lists pending companies with a count per status', async () => {
    await pendingEmployer();
    const admin = await signInAdmin();

    const res = await admin.get('/api/admin/companies?status=pending');
    expect(res.status).toBe(200);
    expect(res.body.data.companies).toHaveLength(1);
    expect(res.body.data.counts).toEqual({ pending: 1, approved: 0, rejected: 0 });
    expect(res.body.data.companies[0].hasDocument).toBe(true);
    expect(res.body.data.companies[0].documentFile).toBeUndefined();
  });

  it('approves a company, which can then post', async () => {
    const { agent, companyId } = await pendingEmployer();
    const admin = await signInAdmin();

    const res = await admin
      .patch(`/api/admin/companies/${companyId}/status`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);

    const posted = await agent.post('/api/jobs').send(JOB);
    expect(posted.status).toBe(201);
  });

  it('will not approve a company with no document', async () => {
    const employer = await signUpAs(app, 'employer@example.com', 'employer');
    const created = await employer.post('/api/companies').send(COMPANY_DETAILS);
    const admin = await signInAdmin();

    const res = await admin
      .patch(`/api/admin/companies/${created.body.data.company._id}/status`)
      .send({ status: 'approved' });
    expect(res.status).toBe(400);
  });

  it('needs a reason to reject, and the employer sees it', async () => {
    const { agent, companyId } = await pendingEmployer();
    const admin = await signInAdmin();

    const noReason = await admin
      .patch(`/api/admin/companies/${companyId}/status`)
      .send({ status: 'rejected' });
    expect(noReason.status).toBe(400);

    await admin
      .patch(`/api/admin/companies/${companyId}/status`)
      .send({ status: 'rejected', reason: 'The registration number does not match.' });

    const mine = await agent.get('/api/companies/mine');
    expect(mine.body.data.company.status).toBe('rejected');
    expect(mine.body.data.company.rejectionReason).toMatch(/registration number/);
  });

  it('puts a rejected company back to pending when it is edited', async () => {
    const { agent, companyId } = await pendingEmployer();
    await Company.updateOne(
      { _id: companyId },
      { status: 'rejected', rejectionReason: 'Wrong number' },
    );

    const res = await agent.put('/api/companies/mine').send({ registrationNumber: 'REG-99999' });
    expect(res.body.data.company.status).toBe('pending');
    expect(res.body.data.company.rejectionReason).toBe('');
  });

  it('is admin only', async () => {
    const seeker = await signUpAs(app, 'seeker@example.com', 'jobseeker');
    const res = await seeker.get('/api/admin/companies');
    expect(res.status).toBe(403);
  });
});

describe('an approved company', () => {
  it('cannot have its details edited', async () => {
    const employer = await signUpAs(app, 'employer@example.com', 'employer');
    await createApprovedCompany(employer);

    const res = await employer.put('/api/companies/mine').send({ name: 'A Different Name' });
    expect(res.status).toBe(403);

    const mine = await employer.get('/api/companies/mine');
    expect(mine.body.data.company.name).toBe(COMPANY_DETAILS.name);
  });

  it('cannot replace its registration document', async () => {
    const employer = await signUpAs(app, 'employer@example.com', 'employer');
    await createApprovedCompany(employer);

    const res = await employer
      .post('/api/companies/mine/document')
      .attach('document', PDF, { filename: 'new.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(403);
  });

  it('can still be edited while pending', async () => {
    const { agent } = await pendingEmployer();
    const res = await agent.put('/api/companies/mine').send({ name: 'Acme Nepal Ltd' });
    expect(res.status).toBe(200);
    expect(res.body.data.company.name).toBe('Acme Nepal Ltd');
  });
});

describe('the registration document', () => {
  it('can be read by its owner and the admin, and no one else', async () => {
    const { agent, companyId } = await pendingEmployer();
    const admin = await signInAdmin();
    const stranger = await signUpAs(app, 'stranger@example.com', 'employer');

    expect((await agent.get(`/api/companies/${companyId}/document`)).status).toBe(200);
    expect((await admin.get(`/api/companies/${companyId}/document`)).status).toBe(200);
    expect((await stranger.get(`/api/companies/${companyId}/document`)).status).toBe(404);
  });

  it('rejects a file that is not a PDF or image', async () => {
    const employer = await signUpAs(app, 'employer@example.com', 'employer');
    await employer.post('/api/companies').send(COMPANY_DETAILS);

    const res = await employer
      .post('/api/companies/mine/document')
      .attach('document', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});
