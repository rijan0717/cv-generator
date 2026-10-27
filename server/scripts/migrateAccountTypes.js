/**
 * Migration: account types and company approval.
 *
 * Run once after upgrading a database created before account types and
 * company approval existed:  npm run migrate:accounts
 *
 * What it does, step by step:
 *   1. Every company without a review status is marked `approved`, so the
 *      jobs already on the board stay visible. They were live before the
 *      approval step existed; hiding them would break the board.
 *   2. Every user who owns a company becomes an `employer`.
 *   3. Every non-admin `role` is set from the account type, so an employer
 *      reads `employer` in the database rather than `user`.
 *   4. Everyone else is left without an account type, so they see the
 *      one-time "I'm an employer / I'm a job seeker" choice on their next
 *      login.
 *
 * Safe to run more than once: each step only touches documents that do not
 * have the new field yet.
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';

async function migrate() {
  await connectDB(env.mongoUri);

  // Step 1: existing companies are approved.
  const companies = await Company.updateMany({ status: { $exists: false } }, [
    {
      $set: {
        status: 'approved',
        reviewedAt: '$$NOW',
        submittedAt: '$createdAt',
        rejectionReason: '',
      },
    },
  ]);

  // Step 2: company owners are employers.
  const ownerIds = await Company.distinct('owner', { isDeleted: false });
  const employers = await User.updateMany(
    { _id: { $in: ownerIds }, role: { $ne: 'admin' }, accountType: { $in: [null, undefined] } },
    { $set: { accountType: 'employer', role: 'employer' } },
  );

  // Step 3: the role now follows the account type, so a database written
  // before that was true still reads `user` for everybody. Bring the two
  // into line. Admins are skipped: they have no account type, and
  // rewriting their role would shut them out of the admin panel.
  const roles = await User.updateMany({ role: { $ne: 'admin' } }, [
    { $set: { role: { $ifNull: ['$accountType', 'user'] } } },
  ]);

  // Step 4: nothing to write — a missing account type already means
  // "ask on next login". Counted for the report only.
  const undecided = await User.countDocuments({
    role: { $ne: 'admin' },
    isDeleted: false,
    accountType: { $in: [null, undefined] },
  });

  console.log(`[migrate:accounts] Companies marked approved: ${companies.modifiedCount}`);
  console.log(`[migrate:accounts] Company owners made employers: ${employers.modifiedCount}`);
  console.log(`[migrate:accounts] Roles matched to account type: ${roles.modifiedCount}`);
  console.log(`[migrate:accounts] Users who will choose on next login: ${undecided}`);

  await disconnectDB();
}

migrate().catch(async (error) => {
  console.error('[migrate:accounts] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
