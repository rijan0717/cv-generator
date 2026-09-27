/**
 * Export and import endpoints for a CV.
 *
 * Every download is recorded in the activity log, which is what the admin
 * reports in Phase 6 are built from.
 */
import { CV } from '../models/CV.js';
import { generatePdf, verifyPrintToken } from '../services/pdfService.js';
import { generateDocx } from '../services/docxService.js';
import { generateExcel } from '../services/excelService.js';
import { extractText } from '../services/documentTextService.js';
import { parseCVText } from '../algorithms/cvImportParser.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { buildExportFilename } from '../utils/dateFormat.js';

/**
 * Loads a CV owned by the given user, or throws 404.
 * @param {string} cvId - The CV's id.
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<object>} The CV document.
 */
async function findOwnedCV(cvId, userId) {
  const cv = await CV.findOne({ _id: cvId, user: userId, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');
  return cv;
}

/**
 * Sends a generated file as a download.
 * @param {import('express').Response} res - Express response.
 * @param {Buffer} buffer - The file contents.
 * @param {string} filename - The download filename.
 * @param {string} contentType - The MIME type.
 */
function sendDownload(res, buffer, filename, contentType) {
  res.setHeader('Content-Type', contentType);
  // The filename is sanitised in buildExportFilename, so it cannot inject
  // extra header directives here.
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

/**
 * GET /api/cvs/:id/export/pdf
 * Renders the CV through the real print page so the PDF matches the preview.
 */
export async function exportPdf(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);

  const buffer = await generatePdf({
    cvId: cv._id.toString(),
    userId: req.user._id.toString(),
  });

  await logActivity({
    userId: req.user._id,
    action: 'DOWNLOAD_PDF',
    cvId: cv._id,
    meta: { template: cv.templateKey },
    ip: req.ip,
  });

  sendDownload(res, buffer, buildExportFilename(cv, 'pdf'), 'application/pdf');
}

/**
 * GET /api/cvs/:id/export/docx
 * Builds an editable Word version of the same content.
 */
export async function exportDocx(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);
  const buffer = await generateDocx(cv);

  await logActivity({
    userId: req.user._id,
    action: 'DOWNLOAD_DOCX',
    cvId: cv._id,
    ip: req.ip,
  });

  sendDownload(
    res,
    buffer,
    buildExportFilename(cv, 'docx'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
}

/**
 * GET /api/cvs/:id/export/excel
 * One worksheet per section.
 */
export async function exportExcel(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);
  const buffer = await generateExcel(cv);

  await logActivity({
    userId: req.user._id,
    action: 'DOWNLOAD_EXCEL',
    cvId: cv._id,
    ip: req.ip,
  });

  sendDownload(
    res,
    buffer,
    buildExportFilename(cv, 'xlsx'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

/**
 * GET /api/cvs/:id/print-data
 *
 * Used only by the Puppeteer print page. It is authorised by a short-lived
 * print token in the query string rather than by the session cookie, because
 * the headless browser has no session.
 */
export async function getPrintData(req, res) {
  const payload = verifyPrintToken(req.query.token, req.params.id);

  const cv = await CV.findOne({ _id: req.params.id, user: payload.sub, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');

  sendSuccess(res, { cv }, 'Print data');
}

/**
 * POST /api/cvs/:id/import
 *
 * Reads an uploaded PDF, Word or text CV and returns the fields it could
 * recognise. Nothing is saved: the parsed data is sent back for the user to
 * review in the builder, because an importer that silently overwrote a CV
 * with a bad guess would be worse than no importer at all.
 */
export async function importCV(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose a file to import');

  // Confirms the CV exists and belongs to the caller before doing the work.
  await findOwnedCV(req.params.id, req.user._id);

  const text = await extractText(req.file);

  if (!text || text.trim().length < 40) {
    throw ApiError.badRequest(
      'Almost no text could be read from that file. If it is a scanned image, the text cannot be extracted.',
    );
  }

  const parsed = parseCVText(text);

  sendSuccess(
    res,
    { parsed },
    `Read ${parsed.stats.linesRead} lines and found ${parsed.stats.sectionsFound.length} sections`,
  );
}
