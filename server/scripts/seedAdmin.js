/**
 * Creates or updates the single admin account from the credentials in
 * `server/.env`.
 *
 * This is the only way an admin account can come into existence: the public
 * register endpoint always creates a `user`. Running it twice is safe — an
 * existing admin has its password and status reset rather than being
 * duplicated.
 *
 * Usage: npm run seed:admin
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

/**
 * Checks the password meets the same policy the register endpoint enforces.
 * @param {string} password - The candidate password.
 * @returns {string|null} An error message, or null when the password is fine.
 */
function validatePassword(password) {
  if (!password || password.length < 8) return 'ADMIN_PASSWORD must be at least 8 characters long';
  if (!/[A-Za-z]/.test(password)) return 'ADMIN_PASSWORD must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'ADMIN_PASSWORD must contain at least one number';
  return null;
}

/**
 * Creates the admin account, or resets it if it already exists.
 * @returns {Promise<void>}
 */
async function seedAdmin() {
  const { name, email, password } = env.admin;

  if (!email || !password) {
    console.error('[seed:admin] ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env');
    process.exitCode = 1;
    return;
  }

  const passwordProblem = validatePassword(password);
  if (passwordProblem) {
    console.error(`[seed:admin] ${passwordProblem}`);
    process.exitCode = 1;
    return;
  }

  if (password === 'change_this_password1') {
    console.error('[seed:admin] Refusing to use the example password. Change it in server/.env');
    process.exitCode = 1;
    return;
  }

  await connectDB(env.mongoUri);

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.status = 'active';
    existing.isDeleted = false;
    existing.passwordHash = password; // re-hashed by the pre-save hook
    await existing.save();
    console.log(`[seed:admin] Existing account updated to admin: ${existing.email}`);
  } else {
    const admin = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'admin',
      status: 'active',
    });
    console.log(`[seed:admin] Admin account created: ${admin.email}`);
  }

  await disconnectDB();
}

seedAdmin().catch(async (error) => {
  console.error('[seed:admin] failed:', error.message);
  if (mongoose.connection.readyState === 1) await disconnectDB();
  process.exit(1);
});
