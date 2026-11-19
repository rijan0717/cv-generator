/**
 * Migration: make room for applications sent by email.
 *
 * Run once on a database created before a letter emailed to a company
 * could be tracked as an application:  npm run migrate:applications
 *
 * Why it is needed at all:
 *
 * `Application` has always carried a unique index on `{ job, applicant }`,
 * so one person cannot apply to the same posting twice. An emailed
 * application has no posting — the company may not use this system — so
 * its `job` is null, and MongoDB treats every missing value as the same
 * value. Under the old index the *second* letter a user ever sent would
 * be refused as a duplicate of the first.
 *
 * The model now declares the same index as a partial one, covering only
 * documents that really do have a job. MongoDB will not change an
 * existing index's options in place, so the old one has to be dropped
 * before the new one can be built — which is all this script does.
 *
 * Safe to run more than once: a missing index is treated as already done.
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Application } from '../src/models/Application.js';

/** The index Mongoose generates for `{ job: 1, applicant: 1 }`. */
const INDEX_NAME = 'job_1_applicant_1';

async function migrate() {
  await connectDB(env.mongoUri);

  const collection = Application.collection;
  const existing = await collection.indexes();
  const old = existing.find((index) => index.name === INDEX_NAME);

  if (!old) {
    console.log('No old index to replace; nothing to do.');
  } else if (old.partialFilterExpression) {
    console.log('The index is already the partial one; nothing to do.');
  } else {
    await collection.dropIndex(INDEX_NAME);
    console.log(`Dropped ${INDEX_NAME}.`);
  }

  // Builds whatever the model declares and is not there yet, which is
  // the partial replacement plus the lookup the email duplicate check
  // uses. `syncIndexes` would also drop anything the model no longer
  // declares, which is more authority than a migration needs.
  await Application.createIndexes();
  console.log('Rebuilt the application indexes.');

  // Applications that predate the source field are all board ones: they
  // were made with the Apply button, because nothing else existed.
  const updated = await Application.updateMany(
    { source: { $exists: false } },
    { $set: { source: 'board' } },
  );
  console.log(`Marked ${updated.modifiedCount} existing applications as board applications.`);

  await disconnectDB();
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
