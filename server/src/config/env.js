/**
 * Loads environment variables from `.env` and exposes them as one typed,
 * validated config object. Importing this module is the only place in the
 * server where `process.env` is read, so every setting is easy to find.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src/config -> server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Reads a required environment variable, or throws so the problem is obvious
 * at start-up rather than at the first request.
 * @param {string} key - Name of the environment variable.
 * @returns {string} The variable's value.
 */
function required(key) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}. See server/.env.example`);
  }
  return value;
}

/**
 * Reads an optional boolean environment variable.
 *
 * Anything in the list below counts as true so the `.env` file can be written
 * naturally (`HTTPS_ENABLED=true`, `=1` or `=yes` all work); everything else,
 * including an unset variable, is false.
 *
 * @param {string} key - Name of the environment variable.
 * @param {boolean} fallback - Value to use when the variable is not set.
 * @returns {boolean} The parsed value.
 */
function optionalBool(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Reads an optional environment variable, falling back to a default.
 * @param {string} key - Name of the environment variable.
 * @param {string} fallback - Value to use when the variable is not set.
 * @returns {string} The variable's value or the fallback.
 */
function optional(key, fallback) {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '5000')),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),

  mongoUri: required('MONGODB_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  cookieName: optional('COOKIE_NAME', 'cvg_token'),

  printTokenSecret: optional('PRINT_TOKEN_SECRET', process.env.JWT_SECRET ?? ''),
  printTokenExpiresIn: optional('PRINT_TOKEN_EXPIRES_IN', '2m'),

  admin: {
    name: optional('ADMIN_NAME', 'System Administrator'),
    email: optional('ADMIN_EMAIL', ''),
    password: optional('ADMIN_PASSWORD', ''),
  },

  maxUploadSizeMb: Number(optional('MAX_UPLOAD_SIZE_MB', '2')),

  // --- Optional HTTPS ------------------------------------------------------
  // The developer decides whether the Express server speaks HTTP or HTTPS.
  // When HTTPS_ENABLED is off (the default) nothing changes, so a normal
  // `npm run dev` keeps working exactly as before. When it is on, the key and
  // certificate below are loaded and the server listens over TLS instead.
  https: {
    enabled: optionalBool('HTTPS_ENABLED', false),
    keyPath: optional('HTTPS_KEY_PATH', '../certs/localhost-key.pem'),
    certPath: optional('HTTPS_CERT_PATH', '../certs/localhost-cert.pem'),
    // A locally generated certificate is self-signed, so Puppeteer would
    // refuse to open the print page unless it is told to accept it. Set this
    // to false only if you use a certificate a real authority signed.
    allowSelfSigned: optionalBool('HTTPS_ALLOW_SELF_SIGNED', true),
  },
};

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';

/**
 * True when the server itself is serving HTTPS. Used to decide the protocol in
 * start-up logs and whether the auth cookie may be marked `secure`.
 */
export const isHttps = env.https.enabled;
