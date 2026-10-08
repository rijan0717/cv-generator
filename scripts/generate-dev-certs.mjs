/**
 * Creates a self-signed TLS certificate for local development.
 *
 * Run it with `npm run certs:dev`. It writes `certs/localhost-key.pem` and
 * `certs/localhost-cert.pem`, which are the files the Express server and the
 * Vite dev server look for when HTTPS is enabled. The folder is git-ignored:
 * a private key must never be committed.
 *
 * It shells out to OpenSSL (already present on Linux, macOS and WSL) rather
 * than adding a certificate library, keeping the dependency list unchanged.
 *
 * The certificate is valid for `localhost`, `127.0.0.1` and `::1` for 365
 * days. Because nobody trusted signed it, the browser shows a warning the
 * first time — that is expected, and is the only cost of not using a real
 * certificate authority in development.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const certsDir = path.join(projectRoot, 'certs');

const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost-cert.pem');

const force = process.argv.includes('--force');

/**
 * Stops with a readable message instead of a stack trace.
 * @param {string} message - What went wrong and what to do about it.
 * @returns {never}
 */
function fail(message) {
  console.error(`\n[certs] ${message}\n`);
  process.exit(1);
}

if (fs.existsSync(keyPath) && fs.existsSync(certPath) && !force) {
  console.log('[certs] a development certificate already exists:');
  console.log(`        ${keyPath}`);
  console.log(`        ${certPath}`);
  console.log('[certs] re-run with --force to replace it.');
  process.exit(0);
}

try {
  execFileSync('openssl', ['version'], { stdio: 'ignore' });
} catch {
  fail(
    'OpenSSL was not found on this machine.\n' +
      '        Install it (Ubuntu/WSL: sudo apt install openssl) and run this again.',
  );
}

fs.mkdirSync(certsDir, { recursive: true });

// -nodes leaves the private key unencrypted, so the servers can start without
// anyone typing a passphrase. That is acceptable for a throwaway development
// key that never leaves this machine.
const args = [
  'req',
  '-x509',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-sha256',
  '-days',
  '365',
  '-keyout',
  keyPath,
  '-out',
  certPath,
  '-subj',
  '/C=NP/ST=Bagmati/L=Kathmandu/O=Smart CV Generator (development)/CN=localhost',
  // Modern browsers ignore the common name and read this extension instead,
  // so the host names must be listed here too.
  '-addext',
  'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1',
];

try {
  execFileSync('openssl', args, { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
  fail(`OpenSSL failed to create the certificate:\n        ${error.stderr?.toString().trim()}`);
}

// The private key is readable only by the current user.
fs.chmodSync(keyPath, 0o600);

console.log('[certs] development certificate created:');
console.log(`        ${keyPath}`);
console.log(`        ${certPath}`);
console.log('\n[certs] next steps:');
console.log('        1. server/.env : HTTPS_ENABLED=true and CLIENT_URL=https://localhost:5173');
console.log(
  '        2. client/.env : VITE_HTTPS_ENABLED=true and VITE_API_PROXY_TARGET=https://localhost:5000',
);
console.log('        3. npm run dev, then open https://localhost:5173 and accept the warning.');
