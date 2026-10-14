/**
 * Test helpers for the two kinds of account.
 *
 * Since account types and company approval were added, a test that posts
 * a job needs an *employer* with an *approved* company, and a test that
 * builds CVs or applies needs a *job seeker*. These helpers set both up the
 * way the real flow does — register, choose the account type, register a
 * company — and then approve the company directly in the database, which
 * stands in for the admin's review.
 */
import request from 'supertest';
import { Company } from '../../src/models/Company.js';

/** Valid company details: every field the form requires. */
export const COMPANY_DETAILS = {
  name: 'Acme Ltd',
  location: 'Kathmandu',
  registrationNumber: 'REG-12345',
  phone: '+977 1 4000000',
  email: 'hr@acme.example.com',
};

/**
 * Registers a user, chooses their account type, and returns an agent that
 * keeps their session cookie.
 *
 * @param {import('express').Express} app
 * @param {string} email
 * @param {'jobseeker'|'employer'|null} [accountType] - null leaves it unchosen.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
export async function signUpAs(app, email, accountType = 'jobseeker') {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Test Person', email, password: 'password123' });

  if (accountType) {
    await agent.patch('/api/users/me/account-type').send({ accountType });
  }
  return agent;
}

/**
 * Registers a company for a signed-in employer and approves it, as the
 * admin would after checking it.
 *
 * @param {import('supertest').SuperAgentTest} agent - An employer's agent.
 * @param {object} [overrides] - Company fields to change.
 * @returns {Promise<object>} The created company, as the API returned it.
 */
export async function createApprovedCompany(agent, overrides = {}) {
  const res = await agent.post('/api/companies').send({ ...COMPANY_DETAILS, ...overrides });
  const company = res.body.data.company;

  await Company.updateOne(
    { _id: company._id },
    { $set: { status: 'approved', documentFile: 'test-document.pdf', reviewedAt: new Date() } },
  );
  return company;
}
