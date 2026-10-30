import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { InterviewPosition } from '../../src/models/InterviewPosition.js';
import { InterviewQuestion } from '../../src/models/InterviewQuestion.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Creates an admin the way the seed script does, then logs in as them.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
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

/**
 * Registers an ordinary user and returns an agent holding their session.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUpUser() {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Normal User', email: 'user@example.com', password: 'password123' });
  return agent;
}

/** A valid question body, with anything the caller wants overridden. */
function questionBody(positionId, overrides = {}) {
  return {
    position: positionId,
    level: 'junior',
    text: 'What does the dependency array control?',
    options: [
      { text: 'Styling' },
      { text: 'When it re-runs' },
      { text: 'State' },
      { text: 'Imports' },
    ],
    correctIndex: 1,
    explanation: 'An empty array runs the effect once, on mount.',
    topic: 'hooks',
    ...overrides,
  };
}

/**
 * Adds `count` active questions at one level, so a position can reach the
 * threshold the activation guard enforces.
 * @param {import('supertest').SuperAgentTest} admin - A logged-in admin.
 * @param {string} positionId - The position to add them to.
 * @param {string} level - The level they belong to.
 * @param {number} count - How many to add.
 */
async function addQuestions(admin, positionId, level, count) {
  for (let index = 0; index < count; index += 1) {
    await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(positionId, { level, text: `Question ${level} ${index}` }))
      .expect(201);
  }
}

beforeAll(connectMemoryDb);
afterEach(clearMemoryDb);
afterAll(closeMemoryDb);

describe('admin interview positions', () => {
  it('creates a position that starts switched off', async () => {
    const admin = await signInAdmin();

    const response = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Frontend Developer', levels: ['junior'] })
      .expect(201);

    const { position } = response.body.data;
    // A position with no questions must never be offered to a user, so
    // activation is always a deliberate second step.
    expect(position.isActive).toBe(false);
    expect(position.slug).toBe('frontend-developer');
    expect(position.examSettings.questionCount).toBe(10);
    expect(position.examSettings.passMark).toBe(60);
  });

  it('gives a second position with the same title a distinct slug', async () => {
    const admin = await signInAdmin();

    await admin.post('/api/admin/interview/positions').send({ title: 'QA Engineer' }).expect(201);
    const second = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'QA Engineer' })
      .expect(201);

    expect(second.body.data.position.slug).toBe('qa-engineer-2');
  });

  it('reports how many active questions each level has', async () => {
    const admin = await signInAdmin();
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Data Analyst', levels: ['junior', 'mid'] })
      .expect(201);

    await addQuestions(admin, body.data.position.id, 'junior', 2);

    const listed = await admin.get('/api/admin/interview/positions').expect(200);
    const position = listed.body.data.positions[0];

    // Every level is reported, including the empty ones, so the admin
    // screen can show "mid: 0" rather than leaving it out.
    expect(position.questionCounts).toEqual({ junior: 2, mid: 0, senior: 0 });
  });

  it('refuses to be used by a user who is not an admin', async () => {
    const user = await signUpUser();
    await user.get('/api/admin/interview/positions').expect(403);
    await user.post('/api/admin/interview/positions').send({ title: 'Nope' }).expect(403);
  });
});

describe('the activation guard', () => {
  it('refuses to activate a position with too few questions, and says why', async () => {
    const admin = await signInAdmin();
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Frontend Developer', levels: ['junior'], examSettings: { questionCount: 3 } })
      .expect(201);

    const id = body.data.position.id;
    await addQuestions(admin, id, 'junior', 2);

    const refused = await admin
      .patch(`/api/admin/interview/positions/${id}`)
      .send({ isActive: true })
      .expect(400);

    expect(refused.body.message).toMatch(/junior has 2 of 3/);

    const stored = await InterviewPosition.findById(id).lean();
    expect(stored.isActive).toBe(false);
  });

  it('activates once every offered level has enough', async () => {
    const admin = await signInAdmin();
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({
        title: 'Frontend Developer',
        levels: ['junior', 'mid'],
        examSettings: { questionCount: 2 },
      })
      .expect(201);

    const id = body.data.position.id;
    await addQuestions(admin, id, 'junior', 2);

    // Still short at mid, so still refused.
    await admin.patch(`/api/admin/interview/positions/${id}`).send({ isActive: true }).expect(400);

    await addQuestions(admin, id, 'mid', 2);

    const activated = await admin
      .patch(`/api/admin/interview/positions/${id}`)
      .send({ isActive: true })
      .expect(200);

    expect(activated.body.data.position.isActive).toBe(true);
  });

  it('refuses a question count the existing questions cannot fill', async () => {
    const admin = await signInAdmin();
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Frontend Developer', levels: ['junior'], examSettings: { questionCount: 2 } })
      .expect(201);

    const id = body.data.position.id;
    await addQuestions(admin, id, 'junior', 2);
    await admin.patch(`/api/admin/interview/positions/${id}`).send({ isActive: true }).expect(200);

    // Raising the count on a live position can break it just as surely
    // as deactivating questions, so the guard runs on every change.
    await admin
      .patch(`/api/admin/interview/positions/${id}`)
      .send({ examSettings: { questionCount: 5 } })
      .expect(400);
  });

  it('withdraws a live position when a question is deleted below the threshold', async () => {
    const admin = await signInAdmin();
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Frontend Developer', levels: ['junior'], examSettings: { questionCount: 2 } })
      .expect(201);

    const id = body.data.position.id;
    await addQuestions(admin, id, 'junior', 2);
    await admin.patch(`/api/admin/interview/positions/${id}`).send({ isActive: true }).expect(200);

    const question = await InterviewQuestion.findOne({ position: id }).lean();
    await admin.delete(`/api/admin/interview/questions/${question._id}`).expect(200);

    // Correcting a mistake must stay possible, so the delete succeeds —
    // but the position cannot stay open to users once it cannot examine
    // them, so it is taken down instead.
    const stored = await InterviewPosition.findById(id).lean();
    expect(stored.isActive).toBe(false);
  });
});

describe('admin interview questions', () => {
  /** A position every question test can hang off. */
  async function makePosition(admin) {
    const { body } = await admin
      .post('/api/admin/interview/positions')
      .send({ title: 'Frontend Developer', levels: ['junior', 'mid'] })
      .expect(201);
    return body.data.position.id;
  }

  it('stores a question with its answer and explanation', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    const response = await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(id))
      .expect(201);

    const { question } = response.body.data;
    expect(question.options).toHaveLength(4);
    expect(question.correctIndex).toBe(1);
    expect(question.explanation).toMatch(/once, on mount/);
    expect(question.topic).toBe('hooks');
  });

  it('rejects anything other than four options', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(id, { options: [{ text: 'One' }, { text: 'Two' }] }))
      .expect(400);
  });

  it('rejects a correct answer that is not one of the options', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(id, { correctIndex: 4 }))
      .expect(400);
  });

  it('rejects a question with no explanation', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    // The explanation is what makes this preparation rather than a quiz.
    await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(id, { explanation: '' }))
      .expect(400);
  });

  it('refuses a level the position does not offer', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    const refused = await admin
      .post('/api/admin/interview/questions')
      .send(questionBody(id, { level: 'senior' }))
      .expect(400);

    expect(refused.body.message).toMatch(/does not offer the senior level/);
  });

  it('groups the questions by level for the editor', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);

    await addQuestions(admin, id, 'junior', 2);
    await addQuestions(admin, id, 'mid', 1);

    const { body } = await admin.get(`/api/admin/interview/positions/${id}/questions`).expect(200);

    expect(body.data.questions.junior).toHaveLength(2);
    expect(body.data.questions.mid).toHaveLength(1);
    expect(body.data.questions.senior).toEqual([]);
  });

  it('takes a position’s questions out of use when the position is deleted', async () => {
    const admin = await signInAdmin();
    const id = await makePosition(admin);
    await addQuestions(admin, id, 'junior', 2);

    await admin.delete(`/api/admin/interview/positions/${id}`).expect(200);

    const remaining = await InterviewQuestion.countDocuments({ position: id, isDeleted: false });
    expect(remaining).toBe(0);

    // Soft deleted, not removed: a past attempt is still reported
    // against the position it was sat for.
    expect(await InterviewQuestion.countDocuments({ position: id })).toBe(2);
  });
});
