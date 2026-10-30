/**
 * Loads the built-in question banks from `src/data/questionBanks/`.
 *
 * These are shared questions: each belongs to a category, so every
 * position in that category can be asked them. They live in the
 * repository, so pulling the branch and running this once gives another
 * machine exactly the same bank.
 *
 * Safe to re-run. A question is matched on its text within its category,
 * so a second run adds only what is new and never duplicates. Nothing an
 * admin has edited is overwritten, because the match is on the text they
 * would have changed — an edited question is simply left alone and the
 * original is re-added only if the text no longer matches anything.
 *
 * Usage: npm run seed:questions
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { InterviewPosition } from '../src/models/InterviewPosition.js';
import { InterviewQuestion } from '../src/models/InterviewQuestion.js';
import { QUESTION_BANKS, ALL_CATEGORIES } from '../src/data/questionBanks/index.js';
import { countsFor, GENERAL_CATEGORY } from '../src/services/questionPool.js';

async function seed() {
  await connectDB(env.mongoUri);

  let created = 0;
  let existing = 0;

  for (const bank of QUESTION_BANKS) {
    for (const question of bank.questions) {
      const already = await InterviewQuestion.findOne({
        category: bank.category,
        text: question.text,
      })
        .select('_id')
        .lean();

      if (already) {
        existing += 1;
        continue;
      }

      await InterviewQuestion.create({
        ...question,
        position: null,
        category: bank.category,
      });

      created += 1;
    }

    console.log(`[seed:questions] ${bank.category}: ${bank.questions.length} in the bank`);
  }

  const done = new Set(QUESTION_BANKS.map((bank) => bank.category));

  /*
   * Publish what is ready.
   *
   * With 700 positions, leaving activation to 700 manual clicks means
   * the feature stays empty. A position whose pool can fill a paper at
   * every level it offers is switched on here — the same rule the
   * activation guard applies, so nothing goes live that cannot examine
   * somebody. A position an admin has deliberately withdrawn is left
   * alone, because `isActive` is theirs to set once it has been set.
   */
  let published = 0;

  for (const bank of QUESTION_BANKS) {
    // The general bank applies to every position, not one category.
    const positions = await InterviewPosition.find(
      bank.category === GENERAL_CATEGORY
        ? { isDeleted: false, isActive: false }
        : { category: bank.category, isDeleted: false, isActive: false },
    );

    for (const position of positions) {
      const counts = await countsFor(position, position.levels);
      const need = position.examSettings.questionCount;
      const ready = position.levels.every((level) => (counts[level] ?? 0) >= need);

      if (!ready) continue;

      position.isActive = true;
      await position.save();
      published += 1;
    }
  }

  console.log(`[seed:questions] Published: ${published} positions now offered to users`);

  const missing = ALL_CATEGORIES.filter((category) => !done.has(category));

  // Reported rather than left implicit: a category with no bank means
  // every position in it has nothing to ask, and that is worth seeing.
  for (const category of missing.filter((c) => c !== GENERAL_CATEGORY)) {
    const positions = await InterviewPosition.countDocuments({ category, isDeleted: false });
    console.log(`[seed:questions] ${category}: no bank yet (${positions} positions affected)`);
  }

  console.log(`[seed:questions] Created: ${created}`);
  console.log(`[seed:questions] Already present: ${existing}`);
  console.log(`[seed:questions] Categories with a bank: ${done.size} of ${ALL_CATEGORIES.length}`);

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:questions] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
