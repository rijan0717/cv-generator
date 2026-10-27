/**
 * Admin report controller.
 *
 * One route serves every report and both formats. The alternative — a
 * route per report, times two for the formats — would be ten endpoints
 * doing the same three things, and the client would need ten functions
 * to call them.
 *
 * Reached only through the admin router, which applies `requireAuth` and
 * `requireAdmin` to everything beneath it.
 */
import { buildReport, reportToExcel, reportToPdf, REPORT_TYPES } from '../services/reportService.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';

/** Content types and extensions, keyed by the requested format. */
const FORMATS = {
  xlsx: {
    extension: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    render: reportToExcel,
  },
  pdf: {
    extension: 'pdf',
    contentType: 'application/pdf',
    render: reportToPdf,
  },
};

/**
 * Builds the download filename, e.g. `users-report_2026-10-27.xlsx`.
 * @param {string} type - The report type.
 * @param {string} extension - The file extension.
 * @returns {string} A filename safe to put in a header.
 */
function buildFilename(type, extension) {
  const date = new Date().toISOString().slice(0, 10);
  // The type comes from a fixed list, but the sanitise stays: it is one
  // line, and it means the header cannot be broken by a future type name.
  const safeType = type.replace(/[^a-z0-9-]/gi, '');
  return `${safeType}-report_${date}.${extension}`;
}

/**
 * GET /api/admin/reports/:type?from=&to=&format=xlsx|pdf
 *
 * With no `format`, the report comes back as JSON so the page can show it
 * on screen. With one, the same report is sent as a file. Previewing and
 * downloading therefore cannot disagree: they are one aggregation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getReport(req, res) {
  const { type } = req.params;
  const { from, to, format } = req.query;

  const report = await buildReport(type, { from, to });

  if (!format) {
    sendSuccess(res, { report }, report.title);
    return;
  }

  const target = FORMATS[format];
  const buffer = await target.render(report);
  const filename = buildFilename(type, target.extension);

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'REPORT_EXPORT', report: type, format, from, to },
    ip: req.ip,
  });

  res.setHeader('Content-Type', target.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

export { REPORT_TYPES };
