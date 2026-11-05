/**
 * Builds the raw RFC 2822 message the Gmail API takes.
 *
 * Gmail's `drafts.create` and `messages.send` do not accept fields — no
 * `to`, no `subject`, no attachment array. They accept one string: the
 * whole email, headers and body and attachment together, exactly as it
 * would travel between mail servers, encoded base64url. This module is
 * what turns our fields into that string.
 *
 * Three things here are easy to get wrong and are handled deliberately:
 *
 *   1. **Non-ASCII headers.** A subject or a name containing "Pariyar" is
 *      fine; one containing "Pokhará" is not — header lines are ASCII by
 *      definition. RFC 2047 encoded-words are used for anything else.
 *   2. **Line endings.** The standard says CRLF, and Gmail rejects a
 *      message that uses bare newlines between headers.
 *   3. **base64url, not base64.** The API passes the message in a URL-safe
 *      alphabet: `+` and `/` become `-` and `_`, and the padding goes.
 *
 * No library is used — `Buffer` does the encoding, and the message format
 * is a few lines of text. Adding a MIME package for this would be adding
 * a dependency to avoid writing twenty lines (CLAUDE.md section 2).
 */

/** The standard says header and body lines end CRLF, not LF. */
const CRLF = '\r\n';

/**
 * How long a base64 line may be before it must wrap.
 *
 * RFC 2045 puts the limit at 76 characters. Some servers accept longer
 * lines, but a PDF encoded as one multi-megabyte line is exactly the kind
 * of message that gets silently mangled in transit.
 */
const BASE64_LINE_LENGTH = 76;

/**
 * Encodes a header value only if it needs it.
 *
 * Plain ASCII is left exactly as the user typed it, because an encoded
 * word in a subject line shows up as gibberish in any client that does
 * not decode it, and most of our subjects are ASCII.
 *
 * @param {string} value - The header value, e.g. a subject.
 * @returns {string} The value, RFC 2047 encoded if it is not ASCII.
 */
export function encodeHeader(value) {
  const text = String(value ?? '');

  // eslint-disable-next-line no-control-regex -- the ASCII range is the test
  if (/^[\x00-\x7F]*$/.test(text)) return text;

  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

/**
 * Encodes a display name and address pair as one header value.
 *
 * The name is quoted so a comma in it cannot be read as a second
 * recipient — "Pariyar, Rijan <r@example.com>" would otherwise be two
 * broken addresses rather than one person.
 *
 * @param {string} address - The email address.
 * @param {string} [name] - The display name, if any.
 * @returns {string} e.g. `"Rijan Pariyar" <rijan@example.com>`
 */
export function formatAddress(address, name = '') {
  const email = String(address ?? '').trim();
  const display = String(name ?? '').trim();

  if (!display) return email;
  return `"${encodeHeader(display).replace(/"/g, '')}" <${email}>`;
}

/**
 * Wraps base64 text to the line length the standard allows.
 *
 * @param {string} base64 - Unwrapped base64.
 * @returns {string} The same data, wrapped with CRLF.
 */
function wrapBase64(base64) {
  const lines = [];
  for (let index = 0; index < base64.length; index += BASE64_LINE_LENGTH) {
    lines.push(base64.slice(index, index + BASE64_LINE_LENGTH));
  }
  return lines.join(CRLF);
}

/**
 * A boundary string no part of the message can contain.
 *
 * Built from a random value rather than a fixed string: a boundary that
 * appears inside an attachment would split the message in the wrong
 * place, and with a fixed boundary that is a matter of luck.
 *
 * @returns {string} The boundary.
 */
function makeBoundary() {
  return `----cvgen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Builds the complete message.
 *
 * With no attachment the message is a plain `text/plain` email; with one
 * it becomes `multipart/mixed` with the letter as the first part. Both
 * shapes are valid, and sending a single-part message as multipart would
 * show an empty attachment list in some clients.
 *
 * @param {object} options - The message.
 * @param {string} options.to - The recipient's address.
 * @param {string} options.subject - The subject line.
 * @param {string} options.body - The letter, as plain text.
 * @param {string} [options.fromName] - The sender's display name.
 * @param {{filename: string, content: Buffer, mimeType: string}} [options.attachment]
 * @returns {string} The raw message, ready to base64url.
 */
export function buildMimeMessage({ to, subject, body, fromName = '', attachment = null }) {
  const headers = [
    `To: ${formatAddress(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
  ];

  // `From` is deliberately omitted when there is no display name: Gmail
  // fills it in with the authenticated account, which is the only address
  // this app is ever allowed to send as.
  if (fromName) headers.unshift(`From: ${formatAddress('', fromName).replace(' <>', '')}`);

  const text = String(body ?? '');

  if (!attachment) {
    return [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(text, 'utf8').toString('base64')),
    ].join(CRLF);
  }

  const boundary = makeBoundary();

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(text, 'utf8').toString('base64')),
    '',
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(attachment.content.toString('base64')),
    '',
    `--${boundary}--`,
  ].join(CRLF);
}

/**
 * Encodes a raw message the way the Gmail API expects it.
 *
 * @param {string} raw - The message from `buildMimeMessage`.
 * @returns {string} base64url, unpadded.
 */
export function toBase64Url(raw) {
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default buildMimeMessage;
