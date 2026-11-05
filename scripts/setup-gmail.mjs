/**
 * Sets up "Connect Gmail" from the JSON file Google Cloud Console downloads
 * for a Web application OAuth client (Google Auth Platform → Clients → ⬇).
 *
 *   npm run setup:gmail -- "C:\\Users\\me\\Documents\\gmail-oauth-client.json"
 *
 * This is the sibling of `setup:google`, and the difference between the two
 * is worth understanding:
 *
 *   - Sign-in ("Continue with Google") only needs to know *who* someone is.
 *     The browser is handed a signed ID token and the server checks it, so
 *     the client ID alone is enough and the secret is never used.
 *   - Composing mail acts *as* that person against the Gmail API, which is
 *     the authorisation-code flow: the server trades a one-time code for a
 *     refresh token, and that trade has to be authenticated. So this flow
 *     does need the client secret, and a redirect URI Google will send the
 *     code back to.
 *
 * What it writes into server/.env:
 *   GOOGLE_CLIENT_SECRET   from the file
 *   GOOGLE_REDIRECT_URI    from the file's redirect list (the /api/gmail one)
 *   GMAIL_TOKEN_KEY        32 random bytes, generated here, not from Google
 *
 * GOOGLE_CLIENT_ID is left alone: the same client serves both features, and
 * `setup:google` has already written it.
 *
 * The downloaded JSON itself is never copied into the repository. Keep it
 * outside the project folder.
 *
 * Safe to run again with a new file. Re-running regenerates nothing that is
 * already set, so an existing GMAIL_TOKEN_KEY is kept — changing it would
 * make every stored refresh token undecryptable.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The redirect path the server will serve in stage 2. */
const CALLBACK_PATH = '/api/gmail/callback';

/** Stops with a message, without a stack trace. */
function fail(message) {
  console.error(`[setup:gmail] ${message}`);
  process.exit(1);
}

/**
 * Accepts a Windows path even when the script is running under WSL.
 *
 * The project is developed from Windows but run from a WSL shell, so the
 * path copied out of File Explorer ("C:\Users\me\…") is meaningless to the
 * Linux side. Rather than make that the developer's problem, translate it.
 *
 * @param {string} input - The path as the developer typed it.
 * @returns {string} A path this process can actually open.
 */
function resolveInputPath(input) {
  const windowsDrive = /^([A-Za-z]):[\\/](.*)$/.exec(input);
  if (windowsDrive && process.platform !== 'win32') {
    const [, drive, rest] = windowsDrive;
    const translated = `/mnt/${drive.toLowerCase()}/${rest.replace(/\\/g, '/')}`;
    if (fs.existsSync(translated)) {
      console.log(`[setup:gmail] Reading the Windows path through WSL: ${translated}`);
      return translated;
    }
  }
  return input;
}

// 1. Read the client.
const given = process.argv[2];
if (!given) {
  fail(
    'Pass the downloaded JSON file: npm run setup:gmail -- "<path to the OAuth client JSON>"',
  );
}

const file = resolveInputPath(given);
if (!fs.existsSync(file)) fail(`File not found: ${file}`);

let json;
try {
  json = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  fail('That file is not valid JSON.');
}

const client = json.web;
if (!client) {
  fail(
    'This is not a "Web application" OAuth client. In Google Auth Platform → Clients, ' +
      'open the Web application client and download its JSON again.',
  );
}

if (!client.client_secret) {
  fail(
    'The file has no client_secret. Download the JSON from the client detail page ' +
      '(the ⬇ button), not the one saved when the client was first created.',
  );
}

// 2. Work out the redirect URI to record.
//    Prefer the one that matches the route the server will serve, so a client
//    carrying several redirects (dev, HTTPS, deployed) still configures the
//    right one instead of whichever happens to be first.
const redirects = client.redirect_uris ?? [];
const redirectUri = redirects.find((uri) => uri.endsWith(CALLBACK_PATH));

if (!redirectUri) {
  fail(
    `None of this client's redirect URIs ends in ${CALLBACK_PATH}.\n` +
      `               Add http://localhost:5000${CALLBACK_PATH} under "Authorised redirect URIs" ` +
      'in Google Cloud Console, save, then download the JSON again.\n' +
      `               Found: ${redirects.length ? redirects.join(', ') : '(none)'}`,
  );
}

/**
 * Reads an env file, creating it from its example when it is missing.
 * @param {string} envPath - The .env file.
 * @returns {string} Its current contents.
 */
function readEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    const example = `${envPath}.example`;
    fs.writeFileSync(envPath, fs.existsSync(example) ? fs.readFileSync(example, 'utf8') : '');
    console.log(`[setup:gmail] Created ${path.relative(root, envPath)} from its example.`);
  }
  return fs.readFileSync(envPath, 'utf8');
}

/**
 * Sets KEY=value in an env file, keeping every other line as it was.
 * @param {string} envPath - The .env file.
 * @param {string} key - The variable name.
 * @param {string} value - Its value.
 */
function setEnv(envPath, key, value) {
  const text = readEnv(envPath);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const line = new RegExp(`^${key}=.*$`, 'm');

  const updated = line.test(text)
    ? text.replace(line, `${key}=${value}`)
    : `${text.replace(/\s*$/, '')}${newline}${newline}${key}=${value}${newline}`;

  fs.writeFileSync(envPath, updated);
  console.log(`[setup:gmail] ${key} set in ${path.relative(root, envPath)}`);
}

/**
 * Reads a key already present in an env file.
 * @param {string} envPath - The .env file.
 * @param {string} key - The variable name.
 * @returns {string} The value, or an empty string when it is unset.
 */
function getEnv(envPath, key) {
  if (!fs.existsSync(envPath)) return '';
  const match = new RegExp(`^${key}=(.*)$`, 'm').exec(fs.readFileSync(envPath, 'utf8'));
  return match ? match[1].trim() : '';
}

// 3. Write the three values.
const serverEnv = path.join(root, 'server', '.env');

setEnv(serverEnv, 'GOOGLE_CLIENT_SECRET', client.client_secret);
setEnv(serverEnv, 'GOOGLE_REDIRECT_URI', redirectUri);

// The encryption key is ours, not Google's. It is generated once and then
// left alone: every refresh token in the database is encrypted with it, so
// replacing it would lock every connected account out and force everyone to
// reconnect.
const existingKey = getEnv(serverEnv, 'GMAIL_TOKEN_KEY');
if (existingKey && existingKey.length === 64) {
  console.log('[setup:gmail] GMAIL_TOKEN_KEY already set — kept, so stored tokens stay readable.');
} else {
  setEnv(serverEnv, 'GMAIL_TOKEN_KEY', crypto.randomBytes(32).toString('hex'));
}

// 4. Check the client ID matches what sign-in is already using, since the
//    two features share one client.
const clientId = getEnv(serverEnv, 'GOOGLE_CLIENT_ID');
if (!clientId) {
  setEnv(serverEnv, 'GOOGLE_CLIENT_ID', client.client_id);
} else if (clientId !== client.client_id) {
  console.warn(
    '[setup:gmail] Warning: GOOGLE_CLIENT_ID in server/.env belongs to a different OAuth client\n' +
      '              than the file you just passed. Sign-in and Gmail would then use two clients.\n' +
      '              That works, but only if both are configured in Google Cloud Console.',
  );
}

console.log(
  '\n[setup:gmail] Done. Add these to server/.env.example as empty keys (values never committed):\n' +
    '                GOOGLE_CLIENT_SECRET=\n' +
    '                GOOGLE_REDIRECT_URI=\n' +
    '                GMAIL_TOKEN_KEY=\n\n' +
    '[setup:gmail] Then restart "npm run dev" so the new values are read.',
);
