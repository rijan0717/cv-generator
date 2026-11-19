import { describe, it, expect } from 'vitest';
import {
  parseMessage,
  extractPlainText,
  listAttachments,
  headerValue,
  htmlToText,
  decodeBase64Url,
} from '../../src/services/mimeParser.js';

/**
 * Reading a Gmail message back into the fields a form holds.
 *
 * The shapes tested here are the three a mailbox really contains: a
 * plain letter, a letter with the CV attached, and a message written in
 * Gmail's own composer, which sends the same words twice as text and as
 * HTML. A draft that cannot be read back cannot be edited, so each shape
 * is pinned down rather than assumed.
 */

/** Encodes a body part the way Gmail does. */
function part(mimeType, text, filename) {
  return {
    mimeType,
    ...(filename ? { filename } : {}),
    body: { data: Buffer.from(text, 'utf8').toString('base64url'), size: text.length },
  };
}

describe('decodeBase64Url', () => {
  it('decodes the URL-safe alphabet Gmail uses', () => {
    const encoded = Buffer.from('subjects: a>b & c', 'utf8').toString('base64url');
    expect(decodeBase64Url(encoded)).toBe('subjects: a>b & c');
  });

  it('answers empty for nothing, rather than throwing', () => {
    expect(decodeBase64Url(undefined)).toBe('');
  });
});

describe('headerValue', () => {
  it('finds a header whatever case Gmail used', () => {
    const headers = [{ name: 'To', value: 'a@example.com' }];
    expect(headerValue(headers, 'to')).toBe('a@example.com');
    expect(headerValue(headers, 'TO')).toBe('a@example.com');
  });

  it('answers empty for a header that is not there', () => {
    expect(headerValue([], 'subject')).toBe('');
  });
});

describe('extractPlainText', () => {
  it('reads a single-part plain letter', () => {
    const payload = part('text/plain', 'Dear Hiring Manager,\n\nI am writing.');
    expect(extractPlainText(payload)).toContain('I am writing.');
  });

  it('finds the letter beside an attachment', () => {
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [part('text/plain', 'The letter'), part('application/pdf', 'PDF', 'CV.pdf')],
    };

    expect(extractPlainText(payload)).toBe('The letter');
  });

  it('prefers the plain part over the HTML one', () => {
    const payload = {
      mimeType: 'multipart/alternative',
      parts: [part('text/html', '<p>HTML version</p>'), part('text/plain', 'Text version')],
    };

    expect(extractPlainText(payload)).toBe('Text version');
  });

  it('falls back to the HTML when there is no plain part', () => {
    const payload = {
      mimeType: 'multipart/alternative',
      parts: [part('text/html', '<p>First</p><p>Second</p>')],
    };

    expect(extractPlainText(payload)).toBe('First\nSecond');
  });

  it('never mistakes an attached text file for the letter', () => {
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [part('text/plain', 'The letter'), part('text/plain', 'notes', 'notes.txt')],
    };

    expect(extractPlainText(payload)).toBe('The letter');
  });

  it('reaches a letter nested inside a second multipart', () => {
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'multipart/alternative', parts: [part('text/plain', 'Nested letter')] },
        part('application/pdf', 'PDF', 'CV.pdf'),
      ],
    };

    expect(extractPlainText(payload)).toBe('Nested letter');
  });

  it('answers empty for a message with no readable body', () => {
    expect(extractPlainText({ mimeType: 'multipart/mixed', parts: [] })).toBe('');
  });
});

describe('htmlToText', () => {
  it('turns block tags into the line breaks they stand for', () => {
    expect(htmlToText('<p>One</p><p>Two</p>')).toBe('One\nTwo');
    expect(htmlToText('One<br>Two')).toBe('One\nTwo');
  });

  it('decodes the entities a mail client writes', () => {
    expect(htmlToText('<p>Smith&nbsp;&amp;&nbsp;Co &lt;sales&gt;</p>')).toBe('Smith & Co <sales>');
  });
});

describe('listAttachments', () => {
  it('names what is attached without transferring it', () => {
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [part('text/plain', 'Letter'), part('application/pdf', 'PDF', 'Rijan_CV.pdf')],
    };

    expect(listAttachments(payload)).toEqual([
      { filename: 'Rijan_CV.pdf', mimeType: 'application/pdf', size: 3 },
    ]);
  });

  it('answers an empty list for a letter sent on its own', () => {
    expect(listAttachments(part('text/plain', 'Letter'))).toEqual([]);
  });
});

describe('parseMessage', () => {
  it('reads a whole draft into the fields the compose form holds', () => {
    const message = {
      payload: {
        mimeType: 'multipart/mixed',
        headers: [
          { name: 'To', value: 'hiring@example.com' },
          { name: 'Subject', value: 'Application for Operations Manager' },
          { name: 'Date', value: 'Thu, 5 Nov 2026 05:30:12 -0600' },
        ],
        parts: [part('text/plain', 'Dear Hiring Manager,'), part('application/pdf', 'x', 'CV.pdf')],
      },
    };

    expect(parseMessage(message)).toEqual({
      to: 'hiring@example.com',
      subject: 'Application for Operations Manager',
      body: 'Dear Hiring Manager,',
      date: 'Thu, 5 Nov 2026 05:30:12 -0600',
      attachments: [{ filename: 'CV.pdf', mimeType: 'application/pdf', size: 1 }],
    });
  });

  it('survives a message with no payload at all', () => {
    expect(parseMessage({})).toEqual({
      to: '',
      subject: '',
      body: '',
      date: '',
      attachments: [],
    });
  });
});
