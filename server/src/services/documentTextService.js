/**
 * Extracts plain text from an uploaded CV file.
 *
 * This is the only part of the import feature that uses libraries, and it is
 * strictly infrastructure: turning a binary file into text. A .docx is a ZIP
 * of XML parts, and a PDF stores glyphs with positions rather than lines of
 * text, so neither can sensibly be decoded by hand.
 *
 * All the actual understanding of the CV — finding sections, dates, entries
 * and skills — is our own code in `algorithms/cvImportParser.js`.
 */
import mammoth from 'mammoth';
import { ApiError } from '../utils/ApiError.js';

/** File types the importer accepts. */
export const IMPORT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
];

/** The media type a browser reports, mapped to the reader that handles it. */
const KIND_BY_MIME = new Map([
  ['application/pdf', 'pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['text/plain', 'text'],
]);

/** The same, by file extension. */
const KIND_BY_EXTENSION = new Map([
  ['.pdf', 'pdf'],
  ['.docx', 'docx'],
  ['.txt', 'text'],
]);

/**
 * Works out which reader an uploaded file needs.
 *
 * The media type is tried first and the file extension second, because
 * the media type the browser sends cannot be relied on. A file dragged
 * from a file manager frequently arrives as `application/octet-stream`
 * or with no type at all, and Windows reports a .docx as
 * `application/octet-stream` when Office is not installed. Judging by
 * media type alone therefore rejects Word files that are perfectly
 * readable — which is a bug the user experiences as "it does not accept
 * Word files", with no way to tell why.
 *
 * This is not a security control. It chooses a reader; whether the bytes
 * really are a PDF or a ZIP is settled by the reader itself failing,
 * which is caught and reported as a bad request.
 *
 * @param {{mimetype?: string, originalname?: string}} file - The upload.
 * @returns {'pdf'|'docx'|'text'|null} The reader, or null if unsupported.
 */
export function resolveDocumentKind(file) {
  const byMime = KIND_BY_MIME.get(file?.mimetype);
  if (byMime) return byMime;

  const name = (file?.originalname ?? '').toLowerCase();

  for (const [extension, kind] of KIND_BY_EXTENSION) {
    if (name.endsWith(extension)) return kind;
  }

  return null;
}

/**
 * Extracts text from a .docx buffer.
 *
 * mammoth is asked for raw text rather than HTML, but its conversion still
 * preserves paragraph boundaries as newlines, which is exactly what the
 * parser needs to find headings and entries.
 *
 * @param {Buffer} buffer - The uploaded file.
 * @returns {Promise<string>} The document text.
 */
async function extractFromDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

/**
 * Collapses a run of letter-spaced capitals back into words.
 *
 * Designers set headings with wide letter spacing — "PROFESSIONAL SUMMARY"
 * drawn as P·R·O·F… — and a PDF stores the result as glyphs with gaps, so
 * pdfjs hands back "P R O F E S S I O N A L". Every later rule in the parser
 * compares whole words, so that heading would never be recognised and the
 * whole CV would be read as one unstructured block.
 *
 * A run is treated as letter-spaced only when at least three of its pieces are
 * single characters and nearly all of them are, which ordinary prose never
 * is. Where the wide spacing left a double gap, that is kept as a word
 * boundary; a single gap is a letter gap and is removed.
 *
 * @param {string} text - One text item from the PDF.
 * @returns {string} The text with letter spacing removed.
 */
function collapseLetterSpacing(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);

  if (tokens.length < 3) return text;

  const singles = tokens.filter((token) => token.length === 1 && /[A-Za-z0-9]/.test(token)).length;
  if (singles / tokens.length < 0.8) return text;

  return text
    .trim()
    .split(/\s{2,}/)
    .map((word) => word.replace(/\s+/g, ''))
    .join(' ');
}

/**
 * Extracts text from a PDF buffer.
 *
 * pdfjs-dist returns each page as a list of positioned text items rather than
 * as lines, so the items are grouped back into lines by their vertical
 * position. Without this, every word would arrive on its own line and the
 * parser could not tell a heading from a bullet.
 *
 * Within a line the items are joined by their horizontal positions rather
 * than with a space each, because an item is not a word: a PDF splits a line
 * wherever the font or the spacing changes, so "e-commerce" arrives as three
 * items and "requests" as two. Joining those with spaces invents words that
 * are not in the CV and loses the ones that are. A gap wide enough to be a
 * real space becomes one, and a gap wide enough to be a column becomes two —
 * which is how the parser tells "Sterling Wells    November 2025" apart from
 * an ordinary sentence.
 *
 * @param {Buffer} buffer - The uploaded file.
 * @returns {Promise<string>} The document text, one line per visual line.
 */
async function extractFromPdf(buffer) {
  // Imported lazily: pdfjs is large, and a server that never imports a PDF
  // should not pay for loading it at start-up.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // The worker and system fonts are unnecessary for text extraction and
    // only add failure modes on a headless server.
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();

    // Group items into lines by their y coordinate. transform[5] is the y
    // position; items within 2 units of each other are on the same line.
    const lines = [];
    let currentY = null;
    let currentLine = [];

    // Where the previous item ended, and how tall it was. The height stands
    // in for the font size, which is what decides whether a gap is a space.
    let previousEnd = null;
    let previousHeight = 0;

    /** Closes the line being built and starts a new one. */
    const endLine = () => {
      if (currentLine.length > 0) lines.push(currentLine.join('').trim());
      currentLine = [];
      previousEnd = null;
    };

    for (const item of content.items) {
      if (!item.str) continue;

      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const height = item.height || previousHeight || 10;

      if (currentY !== null && Math.abs(y - currentY) > 2) endLine();
      currentY = y;

      // A gap is a space once it is a fifth of the font size, and a column
      // break — worth two spaces — once it is one and a half times it.
      if (previousEnd !== null) {
        const gap = x - previousEnd;

        if (gap > height * 1.5) currentLine.push('  ');
        else if (gap > height * 0.2) currentLine.push(' ');
      }

      // An item that is only whitespace carries its width rather than its
      // text: a wide one is a column break, a narrow one a single space.
      if (item.str.trim() === '') {
        currentLine.push(item.width > height * 1.5 ? '  ' : ' ');
      } else {
        currentLine.push(collapseLetterSpacing(item.str));
      }

      previousEnd = x + (item.width ?? 0);
      previousHeight = height;
    }

    endLine();

    pages.push(lines.join('\n'));
  }

  await document.destroy();

  return pages.join('\n');
}

/**
 * Extracts text from an uploaded file, choosing the right reader for its type.
 *
 * @param {{buffer: Buffer, mimetype: string, originalname: string}} file
 * @returns {Promise<string>} The document text.
 * @throws {ApiError} When the type is unsupported or the file cannot be read.
 */
export async function extractText(file) {
  const kind = resolveDocumentKind(file);

  if (!kind) {
    throw ApiError.badRequest('Please upload a PDF, a Word (.docx) file or a plain text file');
  }

  try {
    if (kind === 'pdf') return await extractFromPdf(file.buffer);
    if (kind === 'text') return file.buffer.toString('utf8');

    return await extractFromDocx(file.buffer);
  } catch (error) {
    console.error('[documentTextService] extraction failed:', error.message);

    // A corrupt, encrypted or image-only file is the user's problem to fix,
    // so it is reported as a 400 rather than a server error.
    throw ApiError.badRequest(
      'That file could not be read. It may be password protected, or a scanned image rather than text.',
    );
  }
}
