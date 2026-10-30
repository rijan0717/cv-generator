/**
 * Fills interview preparation with demo positions and questions.
 *
 * Safe to run as often as you like. A position is matched on its slug,
 * and — as with the template seed — **everything the admin can edit is
 * written only when the row is first created**. Re-running after somebody
 * has reworded a question or withdrawn a position must not undo them.
 *
 * Questions are matched on their text within a position, so re-running
 * adds any that are new without duplicating the ones already there.
 *
 * Positions are left **inactive**. Activating one is a decision, and the
 * seed should not make it on the admin's behalf — open the admin panel,
 * read the questions, and switch it on.
 *
 * Usage: npm run seed:interview
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { InterviewPosition } from '../src/models/InterviewPosition.js';
import { InterviewQuestion } from '../src/models/InterviewQuestion.js';
import { INTERVIEW_SEED } from '../src/data/interviewSeed.js';
import { slugify } from '../src/controllers/interviewAdmin.controller.js';

async function seed() {
  await connectDB(env.mongoUri);

  let positionsCreated = 0;
  let questionsCreated = 0;
  let questionsSkipped = 0;

  for (const entry of INTERVIEW_SEED) {
    const slug = slugify(entry.title);

    // The same $setOnInsert reasoning as the template seed: a re-run must
    // not revert a title, a description or the exam settings that an
    // admin has since changed on purpose.
    const result = await InterviewPosition.updateOne(
      { slug },
      {
        $setOnInsert: {
          slug,
          title: entry.title,
          description: entry.description,
          industry: entry.industry,
          tags: entry.tags,
          levels: entry.levels,
          examSettings: entry.examSettings,
          isActive: false,
          isDeleted: false,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) positionsCreated += 1;

    const position = await InterviewPosition.findOne({ slug });

    for (const [level, questions] of Object.entries(entry.questions)) {
      for (const question of questions) {
        // Matched on the text so a second run adds only what is new. Two
        // questions with identical wording in the same position would be
        // a mistake anyway.
        const existing = await InterviewQuestion.findOne({
          position: position._id,
          text: question.text,
        }).lean();

        if (existing) {
          questionsSkipped += 1;
          continue;
        }

        await InterviewQuestion.create({
          position: position._id,
          level,
          text: question.text,
          options: question.options.map((text) => ({ text })),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          topic: question.topic,
        });

        questionsCreated += 1;
      }
    }
  }

  const totalPositions = await InterviewPosition.countDocuments({ isDeleted: false });
  const totalQuestions = await InterviewQuestion.countDocuments({ isDeleted: false });

  console.log(`[seed:interview] Positions created: ${positionsCreated}`);
  console.log(`[seed:interview] Questions created: ${questionsCreated}`);
  console.log(`[seed:interview] Questions already present: ${questionsSkipped}`);
  console.log(`[seed:interview] Totals: ${totalPositions} positions, ${totalQuestions} questions`);
  console.log('[seed:interview] Positions are left switched off — review and activate them in the admin panel.');

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:interview] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
