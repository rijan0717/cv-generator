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
};

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
