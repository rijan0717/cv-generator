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
 * Extracts text from a PDF buffer.
 *
 * pdfjs-dist returns each page as a list of positioned text items rather than
 * as lines, so the items are grouped back into lines by their vertical
 * position. Without this, every word would arrive on its own line and the
 * parser could not tell a heading from a bullet.
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

    for (const item of content.items) {
      if (!item.str) continue;

      const y = Math.round(item.transform[5]);

      if (currentY === null || Math.abs(y - currentY) <= 2) {
        currentLine.push(item.str);
        currentY = currentY ?? y;
      } else {
        lines.push(currentLine.join(' '));
        currentLine = [item.str];
        currentY = y;
      }
    }

    if (currentLine.length > 0) lines.push(currentLine.join(' '));

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
  if (!IMPORT_MIME_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest('Please upload a PDF, a Word (.docx) file or a plain text file');
  }

  try {
    if (file.mimetype === 'application/pdf') {
      return await extractFromPdf(file.buffer);
    }

    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf8');
    }

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
