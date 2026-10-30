/**
 * Imports the built-in positions from `src/data/builtInPositions.json`.
 *
 * That file is in the repository, which is the whole point: pull the
 * branch on another machine, run this once, and the same 700 positions
 * are there. Nothing has to be re-entered by hand, and two machines
 * cannot drift apart.
 *
 * Safe to run as often as you like. A position is matched on its slug
 * and, as with the template seed, **everything an admin can edit is
 * written only when the row is first created**. Re-running after
 * somebody has reworded a position or switched one off must not undo
 * them.
 *
 * Positions are created **inactive**. 700 positions with no questions
 * would otherwise appear in the user's search as 700 dead ends.
 *
 * Usage: npm run seed:positions
 */
import { readFileSync } from 'node:fs';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { InterviewPosition } from '../src/models/InterviewPosition.js';
import { InterviewQuestion } from '../src/models/InterviewQuestion.js';
// Read rather than imported: an import attribute (`with { type: 'json' }`)
// is valid in Node 22 but not yet understood by the ESLint parser, and a
// file the linter cannot read is a file nobody checks.
const BUILT_IN_POSITIONS = JSON.parse(
  readFileSync(new URL('../src/data/builtInPositions.json', import.meta.url), 'utf8'),
);

async function seed() {
  await connectDB(env.mongoUri);

  let created = 0;
  let existing = 0;

  // Written in batches rather than one at a time: 700 round trips is
  // slow enough to look broken.
  const BATCH = 100;

  for (let start = 0; start < BUILT_IN_POSITIONS.length; start += BATCH) {
    const batch = BUILT_IN_POSITIONS.slice(start, start + BATCH);

    const result = await InterviewPosition.bulkWrite(
      batch.map((entry) => ({
        updateOne: {
          filter: { slug: entry.slug },
          update: {
            // A fact about the position, not a setting an admin owns:
            // which family it belongs to decides which shared questions
            // it draws on, so the file stays authoritative.
            $set: { category: entry.category, isBuiltIn: true },

            $setOnInsert: {
              slug: entry.slug,
              title: entry.title,
              description: '',
              industry: entry.category,
              tags: [],
              levels: ['junior', 'mid', 'senior'],
              examSettings: { questionCount: 20, passMark: 60, timeLimitMinutes: 0 },
              isActive: false,
              isDeleted: false,
            },
          },
          upsert: true,
        },
      })),
    );

    // `matchedCount` counts rows that already existed; upserts are
    // reported separately, so the two must not be subtracted.
    created += result.upsertedCount ?? 0;
    existing += result.matchedCount ?? 0;

    process.stdout.write(
      `\r[seed:positions] ${Math.min(start + BATCH, BUILT_IN_POSITIONS.length)} of ${BUILT_IN_POSITIONS.length}`,
    );
  }

  process.stdout.write('\n');

  const total = await InterviewPosition.countDocuments({ isDeleted: false });
  const categories = await InterviewPosition.distinct('category', { isBuiltIn: true });
  // `$ne: ''` would also match documents with no category field at all,
  // which is every question written before shared questions existed.
  const shared = await InterviewQuestion.countDocuments({
    category: { $exists: true, $nin: ['', null] },
    isDeleted: false,
  });

  console.log(`[seed:positions] Created: ${created}`);
  console.log(`[seed:positions] Already present: ${existing}`);
  console.log(`[seed:positions] Totals: ${total} positions in ${categories.length} categories`);
  console.log(`[seed:positions] Shared category questions: ${shared}`);
  console.log(
    '[seed:positions] Positions are switched off until their category has enough questions.',
  );

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:positions] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
