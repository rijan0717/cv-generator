/**
 * Unit tests for the Gmail refresh-token encryption.
 *
 * The point of these is not that AES works — Node's crypto is not under test.
 * It is that *our use of it* holds up: that a token survives the round trip
 * unchanged, that a wrong key cannot read it, and above all that a row
 * someone has edited in the database is rejected rather than quietly
 * decrypted into something wrong. That last property is the reason GCM was
 * chosen over a plain cipher, so it deserves a test that would fail if
 * somebody "simplified" it to AES-CBC later.
 */
import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../../src/services/gmailTokenCrypto.js';

/** Two distinct 32-byte keys, as 64 hex characters each. */
const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

/** Shaped like a real Google refresh token. */
const TOKEN = '1//09xQf3LlK2mNoPqRsTuVwXyZ-abcdefghijklmnop_qrstuvwxyz0123456789';

describe('gmailTokenCrypto', () => {
  it('returns the original token after a round trip', () => {
    const stored = encryptToken(TOKEN, KEY);
    expect(decryptToken(stored, KEY)).toBe(TOKEN);
  });

  it('never leaves the token readable in the stored value', () => {
    const stored = encryptToken(TOKEN, KEY);

    expect(stored.cipherText).not.toContain(TOKEN);
    expect(stored.cipherText).not.toContain(TOKEN.slice(0, 12));
    // Hex only: nothing here should be legible as text.
    expect(stored.cipherText).toMatch(/^[0-9a-f]+$/);
    expect(stored.iv).toMatch(/^[0-9a-f]{24}$/); // 12 bytes
    expect(stored.authTag).toMatch(/^[0-9a-f]{32}$/); // 16 bytes
  });

  it('produces a different ciphertext every time, so equal tokens are not obviously equal', () => {
    const first = encryptToken(TOKEN, KEY);
    const second = encryptToken(TOKEN, KEY);

    // A fresh IV per encryption is what guarantees this. Without it, two
    // users holding the same token would store identical rows.
    expect(first.iv).not.toBe(second.iv);
    expect(first.cipherText).not.toBe(second.cipherText);
    expect(decryptToken(second, KEY)).toBe(TOKEN);
  });

  it('refuses to decrypt with the wrong key', () => {
    const stored = encryptToken(TOKEN, KEY);
    expect(() => decryptToken(stored, OTHER_KEY)).toThrow(/reconnected/i);
  });

  it('rejects a ciphertext that has been tampered with', () => {
    const stored = encryptToken(TOKEN, KEY);

    // Flip one hex digit, as an attacker with write access to the database
    // would. GCM's auth tag is what catches this.
    const firstChar = stored.cipherText[0];
    const tampered = {
      ...stored,
      cipherText: (firstChar === '0' ? '1' : '0') + stored.cipherText.slice(1),
    };

    expect(() => decryptToken(tampered, KEY)).toThrow(/could not be read/i);
  });

  it('rejects a swapped authentication tag', () => {
    const stored = encryptToken(TOKEN, KEY);
    const other = encryptToken(TOKEN, KEY);

    expect(() => decryptToken({ ...stored, authTag: other.authTag }, KEY)).toThrow(
      /could not be read/i,
    );
  });

  it('reports an incomplete stored row clearly', () => {
    const stored = encryptToken(TOKEN, KEY);

    expect(() => decryptToken({ ...stored, authTag: undefined }, KEY)).toThrow(/incomplete/i);
    expect(() => decryptToken(null, KEY)).toThrow(/incomplete/i);
  });

  it('refuses an empty token rather than storing an empty row', () => {
    expect(() => encryptToken('', KEY)).toThrow(/empty/i);
    expect(() => encryptToken(undefined, KEY)).toThrow(/empty/i);
  });

  it('explains a key of the wrong length instead of failing obscurely', () => {
    expect(() => encryptToken(TOKEN, 'abc')).toThrow(/32 bytes|64 hex/i);
  });
});
