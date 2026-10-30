import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { InterviewPosition } from '../../src/models/InterviewPosition.js';
import { InterviewQuestion } from '../../src/models/InterviewQuestion.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Registers a user and returns an agent holding their session.
 * @param {string} [email] - The account to create.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUpUser(email = 'user@example.com') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'User', email, password: 'password123' });
  return agent;
}

/**
 * Puts one active position with questions in the database.
 * @param {{questionCount?: number, levels?: string[], count?: number}} [options]
 * @returns {Promise<object>} The position.
 */
async function seedPosition({ questionCount = 3, levels = ['junior'], count = 6 } = {}) {
  const position = await InterviewPosition.create({
    title: 'Frontend Developer',
    slug: 'frontend-developer',
    description: 'Builds the parts of a web application people see.',
    industry: 'Information Technology',
    tags: ['react', 'css'],
    levels,
    examSettings: { questionCount, passMark: 60, timeLimitMinutes: 0 },
    isActive: true,
  });

  for (const level of levels) {
    for (let index = 0; index < count; index += 1) {
      await InterviewQuestion.create({
        position: position._id,
        level,
        text: `Question ${level} ${index}`,
        options: [
          { text: 'right' },
          { text: 'wrong one' },
          { text: 'wrong two' },
          { text: 'wrong three' },
        ],
        correctIndex: 0,
        explanation: `The reason for ${index}.`,
        topic: index % 2 === 0 ? 'css' : 'react',
      });
    }
  }

  return position;
}

beforeAll(connectMemoryDb);
afterEach(clearMemoryDb);
afterAll(closeMemoryDb);

describe('finding a position', () => {
  it('lists the active positions', async () => {
    await seedPosition();
    const user = await signUpUser();

    const { body } = await user.get('/api/interview/positions').expect(200);

    expect(body.data.positions).toHaveLength(1);
    expect(body.data.positions[0].title).toBe('Frontend Developer');
    expect(body.data.positions[0].questionCounts.junior).toBe(6);
  });

  it('hides a position that is not switched on', async () => {
    const position = await seedPosition();
    position.isActive = false;
    await position.save();

    const user = await signUpUser();
    const { body } = await user.get('/api/interview/positions').expect(200);

    expect(body.data.positions).toEqual([]);
  });

  it('finds a position from a loosely typed search', async () => {
    await seedPosition();
    const user = await signUpUser();

    const { body } = await user
      .get('/api/interview/positions')
      .query({ search: 'front end dev' })
      .expect(200);

    expect(body.data.positions[0].title).toBe('Frontend Developer');
  });

  it('requires a signed-in user', async () => {
    await seedPosition();
    await request(app).get('/api/interview/positions').expect(401);
  });
});

describe('study mode', () => {
  it('gives the answers and the explanations, deliberately', async () => {
    await seedPosition();
    const user = await signUpUser();

    const { body } = await user
      .get('/api/interview/positions/frontend-developer/study')
      .query({ level: 'junior' })
      .expect(200);

    const [question] = body.data.questions;
    expect(question.answer).toBe('right');
    expect(question.explanation).toMatch(/The reason for/);
  });

  it('refuses a level the position does not offer', async () => {
    await seedPosition({ levels: ['junior'] });
    const user = await signUpUser();

    await user
      .get('/api/interview/positions/frontend-developer/study')
      .query({ level: 'senior' })
      .expect(400);
  });
});

describe('sitting an exam', () => {
  it('returns a paper of the configured length', async () => {
    const position = await seedPosition({ questionCount: 3 });
    const user = await signUpUser();

    const { body } = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    expect(body.data.attempt.questions).toHaveLength(3);
    expect(body.data.attempt.questions[0].options).toHaveLength(4);
  });

  /**
   * The rule the whole feature rests on. If the correct answers are in
   * the payload, the exam measures nothing but whether somebody opened
   * the network tab.
   */
  it('never sends a correct answer while the exam is open', async () => {
    const position = await seedPosition();
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    const resumed = await user
      .get(`/api/interview/exams/${started.body.data.attempt.id}`)
      .expect(200);

    for (const payload of [started.body, resumed.body]) {
      const text = JSON.stringify(payload);
      expect(text).not.toMatch(/correctIndex/);
      expect(text).not.toMatch(/explanation/);
      expect(text).not.toMatch(/The reason for/);
    }
  });

  it('marks the paper and explains the result', async () => {
    const position = await seedPosition({ questionCount: 4 });
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    const id = started.body.data.attempt.id;

    // Every correct answer is the option reading "right", wherever the
    // shuffle has put it.
    const answers = started.body.data.attempt.questions.map((question) =>
      question.options.findIndex((option) => option.text === 'right'),
    );

    const { body } = await user
      .post(`/api/interview/exams/${id}/submit`)
      .send({ answers })
      .expect(200);

    const result = body.data.attempt;
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(4);
    // The review may now show everything.
    expect(result.questions[0].explanation).toMatch(/The reason for/);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('counts an unanswered question as wrong', async () => {
    const position = await seedPosition({ questionCount: 4 });
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    const answers = started.body.data.attempt.questions.map((question, index) =>
      index === 0 ? null : question.options.findIndex((option) => option.text === 'right'),
    );

    const { body } = await user
      .post(`/api/interview/exams/${started.body.data.attempt.id}/submit`)
      .send({ answers })
      .expect(200);

    expect(body.data.attempt.score).toBe(75);
  });

  it('refuses a second submission', async () => {
    const position = await seedPosition();
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    const id = started.body.data.attempt.id;
    await user
      .post(`/api/interview/exams/${id}/submit`)
      .send({ answers: [0, 0, 0] })
      .expect(200);

    // Otherwise the result screen becomes an answer key for a resit.
    await user
      .post(`/api/interview/exams/${id}/submit`)
      .send({ answers: [0, 0, 0] })
      .expect(400);
  });

  it('keeps the paper as it was sat when the question is edited afterwards', async () => {
    const position = await seedPosition();
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    const originalText = started.body.data.attempt.questions[0].text;

    await InterviewQuestion.updateMany({}, { $set: { text: 'Completely rewritten' } });

    const resumed = await user
      .get(`/api/interview/exams/${started.body.data.attempt.id}`)
      .expect(200);

    expect(resumed.body.data.attempt.questions[0].text).toBe(originalText);
  });

  it('will not let one user read another user’s attempt', async () => {
    const position = await seedPosition();
    const owner = await signUpUser('owner@example.com');
    const other = await signUpUser('other@example.com');

    const started = await owner
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    await other.get(`/api/interview/exams/${started.body.data.attempt.id}`).expect(404);
  });

  it('refuses to start an exam on a position that is switched off', async () => {
    const position = await seedPosition();
    position.isActive = false;
    await position.save();

    const user = await signUpUser();
    await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(404);
  });

  it('lists a submitted attempt in the history', async () => {
    const position = await seedPosition();
    const user = await signUpUser();

    const started = await user
      .post('/api/interview/exams')
      .send({ positionId: position._id.toString() })
      .expect(201);

    await user
      .post(`/api/interview/exams/${started.body.data.attempt.id}/submit`)
      .send({ answers: [0, 0, 0] })
      .expect(200);

    const { body } = await user.get('/api/interview/exams').expect(200);

    expect(body.data.attempts).toHaveLength(1);
    expect(body.data.attempts[0].positionTitle).toBe('Frontend Developer');
    expect(body.data.attempts[0].score).not.toBeNull();
  });
});

describe('an admin creating a user who is also an admin', () => {
  it('still goes through the same guards', async () => {
    // The user routes are guarded by requireAuth only, so an admin is an
    // ordinary user here — which is intended, since an admin preparing
    // for an interview is a perfectly reasonable thing.
    await seedPosition();

    await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'password123',
      role: 'admin',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    await agent.get('/api/interview/positions').expect(200);
  });
});
