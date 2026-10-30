/**
 * Sets up "Continue with Google" from the JSON file Google Cloud Console
 * downloads for an OAuth client (APIs & Services → Credentials → ⬇).
 *
 *   npm run setup:google -- "C:\Users\me\Downloads\client_secret_….json"
 *
 * What it does:
 *   1. Reads the file and takes the client ID from it.
 *   2. Writes GOOGLE_CLIENT_ID into server/.env and VITE_GOOGLE_CLIENT_ID
 *      into client/.env — replacing the line if it is there, adding it if
 *      not, and creating the file from its .env.example if it is missing.
 *   3. Warns if http://localhost:5173 is not an allowed origin.
 *
 * The client *secret* in that file is never copied anywhere: the Google
 * button gives the browser an ID token, and checking that token needs only
 * the client ID. Keep the downloaded file out of the repository.
 *
 * Safe to run again with a new file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Stops with a message, without a stack trace. */
function fail(message) {
  console.error(`[setup:google] ${message}`);
  process.exit(1);
}

// 1. Read the client ID.
const file = process.argv[2];
if (!file)
  fail('Pass the downloaded JSON file: npm run setup:google -- "<path to client_secret_….json>"');
if (!fs.existsSync(file)) fail(`File not found: ${file}`);

let json;
try {
  json = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  fail('That file is not valid JSON.');
}

const client = json.web;
if (!client)
  fail(
    'This is not a "Web application" OAuth client. Create one of that type and download it again.',
  );
if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(client.client_id ?? '')) {
  fail('The file has no usable client_id.');
}

/**
 * Sets KEY=value in an env file, keeping every other line as it was.
 * @param {string} envPath - The .env file.
 * @param {string} key - The variable name.
 * @param {string} value - Its value.
 */
function setEnv(envPath, key, value) {
  if (!fs.existsSync(envPath)) {
    const example = `${envPath}.example`;
    fs.writeFileSync(envPath, fs.existsSync(example) ? fs.readFileSync(example, 'utf8') : '');
    console.log(`[setup:google] Created ${path.relative(root, envPath)} from its example.`);
  }

  const text = fs.readFileSync(envPath, 'utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const line = new RegExp(`^${key}=.*$`, 'm');

  const updated = line.test(text)
    ? text.replace(line, `${key}=${value}`)
    : `${text.replace(/\s*$/, '')}${newline}${newline}${key}=${value}${newline}`;

  fs.writeFileSync(envPath, updated);
  console.log(`[setup:google] ${key} set in ${path.relative(root, envPath)}`);
}

// 2. Write it to both sides.
setEnv(path.join(root, 'server', '.env'), 'GOOGLE_CLIENT_ID', client.client_id);
setEnv(path.join(root, 'client', '.env'), 'VITE_GOOGLE_CLIENT_ID', client.client_id);

// 3. Check the origin the app runs on.
const origins = client.javascript_origins ?? [];
if (!origins.includes('http://localhost:5173')) {
  console.warn(
    '[setup:google] Warning: http://localhost:5173 is not in "Authorised JavaScript origins" for this client.\n' +
      '               Add it in Google Cloud Console, or the button will show an error.',
  );
}

console.log('[setup:google] Done. Restart "npm run dev" so the new values are read.');
