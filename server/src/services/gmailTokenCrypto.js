/**
 * Encrypts the Gmail refresh token before it is stored, and decrypts it when
 * the server needs to act on the user's behalf.
 *
 * Why this exists at all:
 *
 * A Google *refresh* token does not expire on a timetable. Anyone holding one,
 * together with our client ID and secret, can mint fresh access tokens and
 * compose mail as that user until the user revokes it. Storing it as plain
 * text in MongoDB would mean a database dump — or a `mongodump` left in a
 * downloads folder, which is the realistic version of this risk — hands over
 * mailbox access for every connected account.
 *
 * So the token is encrypted with a key that lives only in `server/.env`, and
 * never in the database. Someone who steals the database gets ciphertext;
 * they need the `.env` file as well, which is a second, separate mistake.
 *
 * The cipher is AES-256-GCM:
 *   - AES-256 for the encryption itself.
 *   - GCM because it is *authenticated*: it produces an "auth tag" that is
 *     checked on decryption, so a row someone edited in the database fails
 *     loudly instead of quietly decrypting to rubbish. A plain cipher like
 *     AES-CBC would not notice.
 *   - A fresh random 12-byte IV per token, which is what GCM is specified
 *     for. The IV is not secret and is stored next to the ciphertext; what
 *     matters is that the same IV is never reused with the same key.
 *
 * Everything here is Node's built-in `node:crypto`. No library, and no
 * hand-rolled cryptography either — rolling your own cipher is the classic
 * way to get this wrong.
 */
import crypto from 'node:crypto';
import { env } from '../config/env.js';

/** AES-256-GCM: a 32-byte key, a 12-byte IV, a 16-byte authentication tag. */
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

/**
 * Turns the hex string from `.env` into the 32-byte key the cipher wants.
 *
 * Kept as a function rather than a constant so that a server with the Gmail
 * feature switched off still starts: the key is only demanded at the moment
 * a token is actually encrypted or decrypted.
 *
 * @param {string} [hexKey] - Overrides the configured key. Used by tests.
 * @returns {Buffer} The 32-byte key.
 * @throws {Error} When the key is missing or the wrong length.
 */
function toKey(hexKey) {
  const value = hexKey ?? env.gmail.tokenKey;

  if (!value) {
    throw new Error(
      'GMAIL_TOKEN_KEY is not set. Run `npm run setup:gmail` to generate one before connecting a Gmail account.',
    );
  }

  let key;
  try {
    key = Buffer.from(value, 'hex');
  } catch {
    throw new Error('GMAIL_TOKEN_KEY is not valid hex. Expected 64 hex characters.');
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `GMAIL_TOKEN_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex characters), got ${key.length}.`,
    );
  }

  return key;
}

/**
 * Encrypts a refresh token for storage.
 *
 * @param {string} plainText - The refresh token exactly as Google issued it.
 * @param {string} [hexKey] - Overrides the configured key. Used by tests.
 * @returns {{cipherText: string, iv: string, authTag: string}} All three parts
 *   are hex, and all three are needed to decrypt. Store them together.
 * @throws {Error} When the token is empty or the key is unusable.
 */
export function encryptToken(plainText, hexKey) {
  if (typeof plainText !== 'string' || plainText === '') {
    throw new Error('Refusing to encrypt an empty refresh token.');
  }

  const key = toKey(hexKey);

  // A new IV every time. Reusing one with the same key is the single mistake
  // that breaks GCM, so it is generated here and never passed in.
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  return {
    cipherText: cipherText.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

/**
 * Decrypts a stored refresh token.
 *
 * @param {{cipherText: string, iv: string, authTag: string}} stored - The three
 *   parts as `encryptToken` produced them.
 * @param {string} [hexKey] - Overrides the configured key. Used by tests.
 * @returns {string} The refresh token.
 * @throws {Error} When a part is missing, the key is wrong, or the stored row
 *   has been tampered with. The message deliberately does not say which,
 *   since that distinction is only useful to an attacker.
 */
export function decryptToken(stored, hexKey) {
  const { cipherText, iv, authTag } = stored ?? {};

  if (!cipherText || !iv || !authTag) {
    throw new Error('Stored Gmail token is incomplete. The account must be reconnected.');
  }

  const key = toKey(hexKey);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    // `final()` is where GCM verifies the auth tag, so a wrong key or an
    // altered ciphertext throws here rather than returning bad data.
    return Buffer.concat([
      decipher.update(Buffer.from(cipherText, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Stored Gmail token could not be read. The account must be reconnected.');
  }
}
