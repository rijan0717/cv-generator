/**
 * Cleans the HTML an admin writes in the editor.
 *
 * The body is stored as HTML so the editor can offer bold, headings,
 * alignment and images placed in the flow of the text. That means the
 * database holds markup somebody typed, and markup somebody typed is
 * the oldest way there is to put a script on another person's page.
 *
 * So nothing reaches the database unsanitised. The allow-list below is
 * what the editor can produce and nothing else: no `<script>`, no
 * `<iframe>`, no event handlers, no `style` attributes, and — the one
 * that is easy to forget — no `src` pointing anywhere but our own
 * uploads, so a post cannot quietly report every reader to a third
 * party.
 *
 * Sanitising happens on write rather than on render: it is done once
 * per save instead of once per page view, and it means nothing
 * dangerous is ever at rest in the database. The client sanitises
 * again before rendering, which costs little and covers a row written
 * by some future code path that forgets to come through here.
 */
import createDOMPurify from 'isomorphic-dompurify';

/** The tags the editor can produce. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'figure',
  'figcaption',
  'hr',
  'code',
  'pre',
];

/**
 * The attributes those tags may carry.
 *
 * `class` is allowed because the editor writes alignment as a class,
 * and DOMPurify will not let a class name become anything executable.
 */
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'width', 'height'];

/**
 * Strips everything that is not on the allow-list, then checks every
 * image is one of ours.
 *
 * @param {string} html - Whatever the editor sent.
 * @returns {string} HTML that is safe to store and to render.
 */
export function sanitiseHtml(html) {
  const clean = createDOMPurify.sanitize(String(html ?? ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Belt and braces: these are already absent from the allow-list.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    // `javascript:` and `data:` URLs never survive this.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/)/i,
  });

  // DOMPurify is happy with any http(s) image. We are not: an external
  // image makes every reader's browser announce itself to a server we
  // do not control, so only our own uploads are kept.
  return clean.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\ssrc\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    return /^\/uploads\/[\w.-]+$/.test(src) ? tag : '';
  });
}

/**
 * The plain words in a body, for a summary or a search index.
 *
 * @param {string} html - Sanitised HTML.
 * @param {number} [limit] - Characters to keep.
 * @returns {string} The text, with the markup removed.
 */
export function htmlToText(html, limit = 300) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export default sanitiseHtml;
