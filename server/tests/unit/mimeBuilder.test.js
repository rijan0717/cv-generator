import { describe, it, expect } from 'vitest';
import {
  buildMimeMessage,
  toBase64Url,
  encodeHeader,
  formatAddress,
} from '../../src/services/mimeBuilder.js';

/** Decodes a base64 body part back to text, for checking what was encoded. */
function decodePart(raw, index = 0) {
  const parts = raw.split(/\r\n\r\n/);
  return Buffer.from(parts[index + 1] ?? '', 'base64').toString('utf8');
}

describe('encodeHeader', () => {
  it('leaves plain ASCII exactly as typed', () => {
    expect(encodeHeader('Application for Operations Manager')).toBe(
      'Application for Operations Manager',
    );
  });

  it('encodes a non-ASCII subject as an RFC 2047 word', () => {
    const encoded = encodeHeader('Application — Pokhará');
    expect(encoded.startsWith('=?UTF-8?B?')).toBe(true);
    expect(encoded.endsWith('?=')).toBe(true);

    const base64 = encoded.slice('=?UTF-8?B?'.length, -2);
    expect(Buffer.from(base64, 'base64').toString('utf8')).toBe('Application — Pokhará');
  });

  it('treats an empty value as ASCII', () => {
    expect(encodeHeader('')).toBe('');
  });
});

describe('formatAddress', () => {
  it('returns a bare address when there is no display name', () => {
    expect(formatAddress('rijan@example.com')).toBe('rijan@example.com');
  });

  it('quotes the display name so a comma cannot split the address', () => {
    expect(formatAddress('rijan@example.com', 'Pariyar, Rijan')).toBe(
      '"Pariyar, Rijan" <rijan@example.com>',
    );
  });
});

describe('buildMimeMessage', () => {
  const base = {
    to: 'hiring@example.com',
    subject: 'Application for Operations Manager',
    body: 'Dear Hiring Manager,\n\nI am writing to apply.\n\nKind regards,\nRijan',
  };

  it('uses CRLF between header lines', () => {
    const raw = buildMimeMessage(base);
    expect(raw).toContain('\r\n');
    expect(raw.split('\r\n')[0]).toBe('To: hiring@example.com');
  });

  it('writes a single-part message when nothing is attached', () => {
    const raw = buildMimeMessage(base);
    expect(raw).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(raw).not.toContain('multipart/mixed');
  });

  it('round-trips the letter through base64', () => {
    const raw = buildMimeMessage(base);
    expect(decodePart(raw)).toBe(base.body);
  });

  it('becomes multipart when a file is attached', () => {
    const raw = buildMimeMessage({
      ...base,
      attachment: {
        filename: 'Rijan_Pariyar_CV.pdf',
        content: Buffer.from('%PDF-1.4 pretend'),
        mimeType: 'application/pdf',
      },
    });

    expect(raw).toContain('multipart/mixed; boundary="');
    expect(raw).toContain('Content-Disposition: attachment; filename="Rijan_Pariyar_CV.pdf"');
    expect(raw).toContain('application/pdf');
  });

  it('closes the multipart message with the final boundary', () => {
    const raw = buildMimeMessage({
      ...base,
      attachment: {
        filename: 'cv.pdf',
        content: Buffer.from('x'),
        mimeType: 'application/pdf',
      },
    });

    const boundary = raw.match(/boundary="([^"]+)"/)[1];
    expect(raw.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
  });

  it('wraps base64 so no line exceeds the limit the standard sets', () => {
    const raw = buildMimeMessage({
      ...base,
      attachment: {
        filename: 'cv.pdf',
        content: Buffer.alloc(5000, 65),
        mimeType: 'application/pdf',
      },
    });

    const longest = Math.max(...raw.split('\r\n').map((line) => line.length));
    expect(longest).toBeLessThanOrEqual(76);
  });

  it('encodes a non-ASCII subject in the header', () => {
    const raw = buildMimeMessage({ ...base, subject: 'Application — Pokhará' });
    expect(raw).toContain('Subject: =?UTF-8?B?');
  });

  it('carries a non-ASCII body through unmangled', () => {
    const body = 'Dear Hiring Manager,\n\nI worked in Pokhará for three years.';
    const raw = buildMimeMessage({ ...base, body });
    expect(decodePart(raw)).toBe(body);
  });
});

describe('toBase64Url', () => {
  it('uses the URL-safe alphabet and drops the padding', () => {
    const encoded = toBase64Url('any message >>> with ???');
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('round-trips back to the original message', () => {
    const raw = buildMimeMessage({
      to: 'hiring@example.com',
      subject: 'Subject',
      body: 'Body',
    });

    const decoded = Buffer.from(
      toBase64Url(raw).replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');

    expect(decoded).toBe(raw);
  });
});
