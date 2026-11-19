/**
 * Reads a Gmail message back into the fields a form can show.
 *
 * The opposite of `mimeBuilder.js`. Gmail returns a message as a tree:
 * one `payload` with headers and either a body or a list of `parts`,
 * each of which may itself have parts. A letter with a CV attached is
 * `multipart/mixed` holding a `text/plain` part and a `application/pdf`
 * part; a letter without one is `text/plain` on its own; and a message
 * written in Gmail's own composer is usually `multipart/alternative`
 * with the same words twice, as text and as HTML.
 *
 * All three shapes have to come back as one string in a textarea, so the
 * tree is walked rather than assumed — the plain-text part is preferred
 * wherever it is, and the HTML one is only read when there is no other.
 *
 * Pure functions, no I/O and no Gmail call, so each shape can be tested
 * on its own.
 */

/**
 * Decodes the base64url Gmail puts message data in.
 *
 * The alphabet is URL-safe — `-` and `_` where base64 has `+` and `/` —
 * and the padding is dropped, which `Buffer` tolerates on the way in.
 *
 * @param {string} data - The `body.data` field of a part.
 * @returns {string} The decoded text, or '' if there was nothing.
 */
export function decodeBase64Url(data) {
  if (!data) return '';

  return Buffer.from(String(data).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/**
 * Reads one header by name, case-insensitively.
 *
 * Header names are not case-sensitive and Gmail is not consistent about
 * them, so "To", "to" and "TO" all have to answer the same question.
 *
 * @param {Array<{name: string, value: string}>} headers - The part's headers.
 * @param {string} name - The header wanted, e.g. 'subject'.
 * @returns {string} The value, or ''.
 */
export function headerValue(headers = [], name = '') {
  const wanted = name.toLowerCase();
  return headers.find((header) => header.name?.toLowerCase() === wanted)?.value ?? '';
}

/**
 * Turns an HTML body into something readable in a plain textarea.
 *
 * Only used when a message carries no plain-text part at all. It is not
 * a sanitiser and makes no attempt to be one — nothing here is ever
 * rendered as markup — it just stops the user seeing their own letter as
 * a wall of tags. Block-level tags become line breaks so paragraphs
 * survive; everything else is dropped.
 *
 * @param {string} html - The HTML body.
 * @returns {string} The same words, as text.
 */
export function htmlToText(html) {
  return (
    String(html ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      // Three or more blank lines are a side effect of stripping tags, not
      // something the writer typed.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Collects every part of the tree into one flat list.
 *
 * Depth first, parents before children, because the order decides which
 * text part wins when a message holds more than one.
 *
 * @param {object} payload - The message payload.
 * @returns {Array<object>} Every part, including the payload itself.
 */
function flattenParts(payload) {
  if (!payload) return [];

  const parts = [payload];

  for (const child of payload.parts ?? []) {
    parts.push(...flattenParts(child));
  }

  return parts;
}

/**
 * Pulls the readable text out of a message.
 *
 * A part that has a filename is an attachment, never the letter, even
 * when it is a text file — otherwise an attached `.txt` would replace
 * the message the user wrote.
 *
 * @param {object} payload - The message payload from Gmail.
 * @returns {string} The message body as text, or '' if it has none.
 */
export function extractPlainText(payload) {
  const parts = flattenParts(payload).filter((part) => !part.filename);

  const plain = parts.find((part) => part.mimeType === 'text/plain' && part.body?.data);
  if (plain) return decodeBase64Url(plain.body.data);

  const html = parts.find((part) => part.mimeType === 'text/html' && part.body?.data);
  if (html) return htmlToText(decodeBase64Url(html.body.data));

  return '';
}

/**
 * Lists what is attached to the message, by filename.
 *
 * Names only. The Mail page shows them so the user knows their CV is on
 * the draft; downloading one would be a second Gmail call for a file
 * they already have, and the message is in their own mailbox anyway.
 *
 * @param {object} payload - The message payload from Gmail.
 * @returns {Array<{filename: string, mimeType: string, size: number}>}
 */
export function listAttachments(payload) {
  return flattenParts(payload)
    .filter((part) => part.filename)
    .map((part) => ({
      filename: part.filename,
      mimeType: part.mimeType ?? 'application/octet-stream',
      size: part.body?.size ?? 0,
    }));
}

/**
 * Reads a whole Gmail message into the fields the compose form holds.
 *
 * @param {object} message - A message, as `drafts.get?format=full` returns one.
 * @returns {{to: string, subject: string, body: string, date: string,
 *   attachments: Array<{filename: string, mimeType: string, size: number}>}}
 */
export function parseMessage(message = {}) {
  const payload = message.payload ?? {};
  const headers = payload.headers ?? [];

  return {
    to: headerValue(headers, 'to'),
    subject: headerValue(headers, 'subject'),
    body: extractPlainText(payload),
    date: headerValue(headers, 'date'),
    attachments: listAttachments(payload),
  };
}

export default parseMessage;
