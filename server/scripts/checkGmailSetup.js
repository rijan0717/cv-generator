/**
 * Says whether "Connect Gmail" is configured, and if not, which setting is
 * wrong.
 *
 *   npm run check:gmail
 *
 * The profile card can only report a yes or a no: the server deliberately
 * does not tell the browser which credential is missing, because that is
 * information an attacker would like and a user cannot act on. From a
 * terminal on the developer's own machine the full answer is safe, so this
 * script gives it.
 *
 * It prints the *shape* of each value — present, right length, right prefix —
 * and never the value itself, so its output can be pasted into a chat, an
 * issue or a report without leaking the client secret or the encryption key.
 */
import crypto from 'node:crypto';
import { env, isGmailConfigured } from '../src/config/env.js';

/** One check against one setting. */
const checks = [
  {
    key: 'GOOGLE_CLIENT_ID',
    value: env.googleClientId,
    expected: 'ends with .apps.googleusercontent.com',
    ok: (v) => v.endsWith('.apps.googleusercontent.com'),
    hint: 'Run `npm run setup:google` with the OAuth client JSON, or copy the Client ID from Google Cloud Console.',
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    value: env.gmail.clientSecret,
    expected: 'starts with GOCSPX-',
    ok: (v) => v.startsWith('GOCSPX-'),
    hint:
      'Google Auth Platform → Clients → your Web application client → Client secrets → + Add secret.\n' +
      '    A 64-character hex string here is almost certainly GMAIL_TOKEN_KEY pasted into the wrong line.',
  },
  {
    key: 'GOOGLE_REDIRECT_URI',
    value: env.gmail.redirectUri,
    expected: 'ends with /api/gmail/callback',
    ok: (v) => v.endsWith('/api/gmail/callback'),
    hint: 'Must match an "Authorised redirect URI" on the client exactly, including http vs https and the port.',
  },
  {
    key: 'GMAIL_TOKEN_KEY',
    value: env.gmail.tokenKey,
    expected: '64 hexadecimal characters (32 bytes)',
    ok: (v) => /^[0-9a-fA-F]{64}$/.test(v),
    hint: 'Generate once with:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
];

console.log('\nConnect Gmail — configuration check\n');

let failed = 0;

for (const check of checks) {
  const value = check.value ?? '';

  if (!value) {
    console.log(`  ✗ ${check.key}`);
    console.log(`      missing or empty — expected ${check.expected}`);
    console.log(`      ${check.hint}\n`);
    failed += 1;
    continue;
  }

  if (!check.ok(value)) {
    console.log(`  ✗ ${check.key}`);
    console.log(`      set, but the wrong shape — expected ${check.expected}`);
    // Length is a shape, not a secret, and it is usually enough to spot the
    // mistake. The value itself is never printed.
    console.log(`      found: ${value.length} characters`);
    console.log(`      ${check.hint}\n`);
    failed += 1;
    continue;
  }

  console.log(`  ✓ ${check.key}  (${value.length} characters, ${check.expected})`);
}

console.log('');

if (failed === 0 && isGmailConfigured()) {
  console.log('All four settings look right. Restart the server and the Connect button appears.\n');

  // A last sanity check the eye cannot do: that the key actually works as a
  // cipher key. A value that is the right length but, say, has a stray space
  // would pass the shape test and fail at the moment a token is stored.
  try {
    crypto.createCipheriv('aes-256-gcm', Buffer.from(env.gmail.tokenKey, 'hex'), crypto.randomBytes(12));
    console.log('GMAIL_TOKEN_KEY is usable as an encryption key.\n');
  } catch {
    console.log('Warning: GMAIL_TOKEN_KEY is 64 characters but is not usable as a key. Generate a new one.\n');
  }
  process.exit(0);
}

console.log(
  `${failed} setting${failed === 1 ? '' : 's'} need attention. The file is server/.env\n` +
    'Remember: the server reads .env only at start-up, so restart it after editing.\n',
);
process.exit(1);
