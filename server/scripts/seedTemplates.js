/**
 * Fills the template catalogue from `src/data/templateCatalogue.js`.
 *
 * Safe to run as often as you like. Each template is matched on its key
 * and updated rather than inserted a second time, and — the part that
 * matters — **everything the admin can edit is written only when the
 * row is first created**. Re-running the seed after an admin has
 * switched a template off, or renamed one, must not quietly undo them.
 *
 * Usage: npm run seed:templates
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Template } from '../src/models/Template.js';
import { TEMPLATE_CATALOGUE } from '../src/data/templateCatalogue.js';

async function seed() {
  await connectDB(env.mongoUri);

  let created = 0;
  let updated = 0;

  for (const [index, entry] of TEMPLATE_CATALOGUE.entries()) {
    const result = await Template.updateOne(
      { key: entry.key },
      {
        // A fact about the component, not a setting: whether it draws
        // the photo is decided by the markup, so the catalogue wins.
        $set: { usesPhoto: entry.usesPhoto },

        // Everything the admin can edit is written once, at creation.
        // Re-running the seed after somebody has renamed a template or
        // switched it off must not quietly undo them — a seed that
        // reverts admin decisions is worse than one that runs twice.
        //
        // The cost is that a reworded description in the catalogue does
        // not reach a database that already has the row; change it on
        // the admin screen, which is where it is owned.
        $setOnInsert: {
          key: entry.key,
          name: entry.name,
          description: entry.description,
          sortOrder: index,
          isActive: true,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const active = await Template.countDocuments({ isActive: true });

  console.log(`[seed:templates] Created: ${created}`);
  console.log(`[seed:templates] Updated: ${updated}`);
  console.log(`[seed:templates] Active:  ${active} of ${TEMPLATE_CATALOGUE.length}`);

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:templates] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
