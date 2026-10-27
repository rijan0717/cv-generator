/**
 * Admin reports.
 *
 * Each report is built in two steps, and the split is the point of this
 * file: `buildReport` produces a plain description of a table — a title,
 * columns, rows and a few summary figures — and the renderers turn that
 * same description into Excel or PDF. Adding a report therefore means
 * writing one aggregation, not an aggregation plus two exporters, and the
 * two formats can never drift apart because they read the same object.
 *
 * Every report takes a date range. The range filters whatever "happened"
 * means for that report: when the account registered, when the CV was
 * created, when the download was recorded.
 */
import ExcelJS from 'exceljs';
import { User } from '../models/User.js';
import { CV } from '../models/CV.js';
import { JobMatch } from '../models/JobMatch.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { renderHtmlToPdf } from './pdfService.js';
import { TEMPLATE_KEYS } from '../models/CV.js';

/** The reports the admin may ask for. Used by the route's validator too. */
export const REPORT_TYPES = ['users', 'cvs', 'downloads', 'templates', 'job-matches'];

/** Which download actions count, and how each is labelled. */
const DOWNLOAD_LABELS = {
  DOWNLOAD_PDF: 'PDF',
  DOWNLOAD_DOCX: 'Word',
  DOWNLOAD_EXCEL: 'Excel',
};

/**
 * Turns the `from` and `to` query values into a Mongo range.
 *
 * `to` is pushed to the end of its day, because a user asking for a range
 * ending on the 5th means the whole of the 5th — not midnight, which
 * would silently drop a day's data and make the totals wrong.
 *
 * @param {string|undefined} from - ISO date, inclusive.
 * @param {string|undefined} to - ISO date, inclusive.
 * @returns {{$gte?: Date, $lte?: Date}|null} A range, or null for "all time".
 */
export function buildDateRange(from, to) {
  const range = {};

  if (from) range.$gte = new Date(from);

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return Object.keys(range).length > 0 ? range : null;
}

/** A readable description of the range, printed under the report title. */
function describeRange(from, to) {
  const format = (value) => new Date(value).toLocaleDateString('en-GB');

  if (from && to) return `${format(from)} to ${format(to)}`;
  if (from) return `From ${format(from)}`;
  if (to) return `Up to ${format(to)}`;
  return 'All time';
}

// --- The individual reports ------------------------------------------------

/** Registered accounts, with what each one is and how many CVs they have. */
async function usersReport(range) {
  const filter = { isDeleted: false };
  if (range) filter.createdAt = range;

  const users = await User.find(filter).sort({ createdAt: -1 }).lean();

  const counts = await CV.aggregate([
    { $match: { user: { $in: users.map((user) => user._id) }, isDeleted: false } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const cvCount = new Map(counts.map((row) => [row._id.toString(), row.count]));

  const byRole = users.reduce((totals, user) => {
    totals[user.role] = (totals[user.role] ?? 0) + 1;
    return totals;
  }, {});

  return {
    title: 'Users report',
    columns: [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'CVs', key: 'cvs', width: 8 },
      { header: 'Registered', key: 'registered', width: 14 },
      { header: 'Last login', key: 'lastLogin', width: 14 },
    ],
    rows: users.map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      cvs: cvCount.get(user._id.toString()) ?? 0,
      registered: new Date(user.createdAt).toLocaleDateString('en-GB'),
      lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB') : 'Never',
    })),
    summary: [
      { label: 'Accounts', value: users.length },
      { label: 'Job seekers', value: byRole.jobseeker ?? 0 },
      { label: 'Employers', value: byRole.employer ?? 0 },
      { label: 'Blocked', value: users.filter((user) => user.status === 'blocked').length },
    ],
  };
}

/** CVs created, with their template and strength score. */
async function cvsReport(range) {
  const filter = { isDeleted: false };
  if (range) filter.createdAt = range;

  const cvs = await CV.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .select('title templateKey strengthScore isPrimary user createdAt updatedAt')
    .lean();

  const scored = cvs.filter((cv) => Number.isFinite(cv.strengthScore));
  const average = scored.length
    ? Math.round(scored.reduce((total, cv) => total + cv.strengthScore, 0) / scored.length)
    : 0;

  return {
    title: 'CV generation report',
    columns: [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Owner', key: 'owner', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Template', key: 'template', width: 14 },
      { header: 'Score', key: 'score', width: 8 },
      { header: 'Primary', key: 'primary', width: 10 },
      { header: 'Created', key: 'created', width: 14 },
    ],
    rows: cvs.map((cv) => ({
      title: cv.title,
      owner: cv.user?.name ?? 'Deleted user',
      email: cv.user?.email ?? '',
      template: cv.templateKey,
      score: cv.strengthScore ?? 0,
      primary: cv.isPrimary ? 'Yes' : 'No',
      created: new Date(cv.createdAt).toLocaleDateString('en-GB'),
    })),
    summary: [
      { label: 'CVs created', value: cvs.length },
      { label: 'Average strength score', value: average },
      { label: 'Marked primary', value: cvs.filter((cv) => cv.isPrimary).length },
    ],
  };
}

/** Downloads per day, split by format. */
async function downloadsReport(range) {
  const filter = { action: { $in: Object.keys(DOWNLOAD_LABELS) } };
  if (range) filter.createdAt = range;

  const rows = await ActivityLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          action: '$action',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.day': -1 } },
  ]);

  // One row per day with a column per format, which is how somebody reads
  // a downloads report — not one row per day per format.
  const byDay = new Map();
  rows.forEach((row) => {
    const day = row._id.day;
    const entry = byDay.get(day) ?? { day, PDF: 0, Word: 0, Excel: 0 };
    entry[DOWNLOAD_LABELS[row._id.action]] += row.count;
    byDay.set(day, entry);
  });

  const days = [...byDay.values()].map((entry) => ({
    date: new Date(entry.day).toLocaleDateString('en-GB'),
    pdf: entry.PDF,
    docx: entry.Word,
    excel: entry.Excel,
    total: entry.PDF + entry.Word + entry.Excel,
  }));

  const totals = days.reduce(
    (sum, day) => ({
      pdf: sum.pdf + day.pdf,
      docx: sum.docx + day.docx,
      excel: sum.excel + day.excel,
    }),
    { pdf: 0, docx: 0, excel: 0 },
  );

  return {
    title: 'Downloads report',
    columns: [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'PDF', key: 'pdf', width: 10 },
      { header: 'Word', key: 'docx', width: 10 },
      { header: 'Excel', key: 'excel', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
    ],
    rows: days,
    summary: [
      { label: 'PDF', value: totals.pdf },
      { label: 'Word', value: totals.docx },
      { label: 'Excel', value: totals.excel },
      { label: 'All downloads', value: totals.pdf + totals.docx + totals.excel },
    ],
  };
}

/** How often each template is used, and how well its CVs score. */
async function templatesReport(range) {
  const filter = { isDeleted: false };
  if (range) filter.createdAt = range;

  const rows = await CV.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$templateKey',
        count: { $sum: 1 },
        averageScore: { $avg: '$strengthScore' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  // Templates nobody used are listed with a zero rather than left out:
  // "which templates is nobody choosing?" is the question this report is
  // usually asked, and a missing row cannot answer it.
  const used = new Set(rows.map((row) => row._id));
  const unused = TEMPLATE_KEYS.filter((key) => !used.has(key)).map((key) => ({
    _id: key,
    count: 0,
    averageScore: 0,
  }));

  return {
    title: 'Template usage report',
    columns: [
      { header: 'Template', key: 'template', width: 20 },
      { header: 'CVs', key: 'count', width: 10 },
      { header: 'Share', key: 'share', width: 10 },
      { header: 'Average score', key: 'average', width: 16 },
    ],
    rows: [...rows, ...unused].map((row) => ({
      template: row._id ?? 'unknown',
      count: row.count,
      share: total ? `${Math.round((row.count / total) * 100)}%` : '0%',
      average: Math.round(row.averageScore ?? 0),
    })),
    summary: [
      { label: 'CVs in range', value: total },
      { label: 'Templates in use', value: rows.length },
      { label: 'Never chosen', value: unused.length },
    ],
  };
}

/** Job matches run, and the keywords candidates most often lack. */
async function jobMatchesReport(range) {
  const filter = {};
  if (range) filter.createdAt = range;

  const [matches, gaps] = await Promise.all([
    JobMatch.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .select('jobTitle matchScore cosineSimilarity skillCoverage user createdAt')
      .lean(),
    // The skill gap: which keywords come back missing most often. This is
    // the report with something to say — it points at what the people
    // using the system cannot yet show on a CV.
    //
    // Grouped by `missingKeywords.keyword`, not by the element itself: an
    // element is `{ keyword, weight }`, and grouping by the whole object
    // would split one keyword across every weight it was ever given, as
    // well as printing "[object Object]".
    JobMatch.aggregate([
      { $match: filter },
      { $unwind: '$missingKeywords' },
      {
        $group: {
          _id: '$missingKeywords.keyword',
          count: { $sum: 1 },
          averageWeight: { $avg: '$missingKeywords.weight' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
  ]);

  const average = matches.length
    ? Math.round(matches.reduce((total, match) => total + (match.matchScore ?? 0), 0) / matches.length)
    : 0;

  return {
    title: 'Job match and skill gap report',
    columns: [
      { header: 'Job title', key: 'jobTitle', width: 28 },
      { header: 'Candidate', key: 'candidate', width: 24 },
      { header: 'Match score', key: 'score', width: 14 },
      { header: 'Similarity', key: 'similarity', width: 12 },
      { header: 'Skill coverage', key: 'coverage', width: 15 },
      { header: 'Run on', key: 'date', width: 14 },
    ],
    rows: matches.map((match) => ({
      jobTitle: match.jobTitle || 'Pasted description',
      candidate: match.user?.name ?? 'Deleted user',
      score: match.matchScore ?? 0,
      similarity: Math.round((match.cosineSimilarity ?? 0) * 100) / 100,
      coverage: `${Math.round(match.skillCoverage ?? 0)}%`,
      date: new Date(match.createdAt).toLocaleDateString('en-GB'),
    })),
    summary: [
      { label: 'Analyses run', value: matches.length },
      { label: 'Average match score', value: average },
      {
        label: 'Most missing keyword',
        value: gaps[0] ? `${gaps[0]._id} (${gaps[0].count})` : 'None',
      },
    ],
    // An extra table, printed after the main one. Only this report has it.
    extraTable: {
      title: 'Top 20 missing keywords',
      columns: [
        { header: 'Keyword', key: 'keyword', width: 26 },
        { header: 'Times missing', key: 'count', width: 16 },
        { header: 'Average weight', key: 'weight', width: 16 },
      ],
      rows: gaps.map((gap) => ({
        keyword: gap._id,
        count: gap.count,
        // The TF-IDF weight, to two places: it is what separates a
        // keyword that matters from one that merely appears often.
        weight: Math.round((gap.averageWeight ?? 0) * 100) / 100,
      })),
    },
  };
}

const BUILDERS = {
  users: usersReport,
  cvs: cvsReport,
  downloads: downloadsReport,
  templates: templatesReport,
  'job-matches': jobMatchesReport,
};

/**
 * Builds one report.
 *
 * @param {string} type - One of REPORT_TYPES.
 * @param {{from?: string, to?: string}} options - The date range.
 * @returns {Promise<object>} The report description.
 */
export async function buildReport(type, { from, to } = {}) {
  const build = BUILDERS[type];
  if (!build) throw new Error(`Unknown report type: ${type}`);

  const report = await build(buildDateRange(from, to));

  return {
    ...report,
    type,
    range: describeRange(from, to),
    generatedAt: new Date(),
  };
}

// --- Renderers -------------------------------------------------------------

/** Fill used for every header row, matching the CV export. */
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

/**
 * Adds one table to a worksheet, returning the row to continue from.
 * @param {ExcelJS.Worksheet} sheet
 * @param {object} table - `{columns, rows}`.
 * @returns {void}
 */
function writeTable(sheet, table) {
  sheet.columns = table.columns.map((column) => ({ ...column }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = HEADER_FILL;
  header.height = 20;
  header.alignment = { vertical: 'middle' };

  table.rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * The report as an .xlsx workbook: a summary sheet, the data, and the
 * extra table when the report has one.
 *
 * @param {object} report - From `buildReport`.
 * @returns {Promise<Buffer>}
 */
export async function reportToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart CV Generator';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Figure', key: 'label', width: 30 },
    { header: 'Value', key: 'value', width: 24 },
  ];
  const summaryHeader = summary.getRow(1);
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = HEADER_FILL;

  summary.addRow({ label: 'Report', value: report.title });
  summary.addRow({ label: 'Date range', value: report.range });
  summary.addRow({
    label: 'Generated',
    value: report.generatedAt.toLocaleString('en-GB'),
  });
  report.summary.forEach((row) => summary.addRow(row));

  writeTable(workbook.addWorksheet('Data'), report);

  if (report.extraTable) {
    writeTable(workbook.addWorksheet('Skill gap'), report.extraTable);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Escapes text before it is put into the report's HTML.
 *
 * Report rows contain user-supplied values — a CV title, somebody's name
 * — and this HTML is handed to a real browser. Without escaping, a CV
 * titled `<script>` would run inside the renderer.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One `<table>` of the report. */
function tableHtml(table) {
  const head = table.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('');
  const body = table.rows
    .map(
      (row) =>
        `<tr>${table.columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/**
 * The report as a PDF.
 *
 * Rendered from an HTML string rather than through a client route: a
 * report is a plain table with no interactive part, so there is nothing
 * for the React application to contribute, and going through the browser
 * only to fetch a page would make the export depend on the client being
 * up.
 *
 * @param {object} report - From `buildReport`.
 * @returns {Promise<Buffer>}
 */
export async function reportToPdf(report) {
  const summaryCards = report.summary
    .map(
      (row) =>
        `<div class="card"><span class="label">${escapeHtml(row.label)}</span>` +
        `<span class="value">${escapeHtml(row.value)}</span></div>`,
    )
    .join('');

  const extra = report.extraTable
    ? `<h2>${escapeHtml(report.extraTable.title)}</h2>${tableHtml(report.extraTable)}`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.title)}</title>
    <style>
      @page { size: A4 landscape; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        font-size: 10px;
        margin: 0;
      }
      h1 { font-size: 18px; margin: 0; }
      h2 { font-size: 13px; margin: 18px 0 6px; }
      .meta { color: #64748b; font-size: 10px; margin-top: 2px; }
      .cards { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
      .card {
        border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; min-width: 110px;
      }
      .label { display: block; color: #64748b; font-size: 9px; text-transform: uppercase; }
      .value { display: block; font-size: 15px; font-weight: 700; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        border-bottom: 1px solid #e2e8f0; padding: 5px 6px; text-align: left;
        vertical-align: top; word-break: break-word;
      }
      th { background: #0f172a; color: #fff; font-size: 9px; text-transform: uppercase; }
      /* Repeat the header on every sheet of a long report, and never split
         a row across two sheets. */
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .empty { color: #64748b; padding: 24px; text-align: center; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.title)}</h1>
    <p class="meta">
      ${escapeHtml(report.range)} &middot; generated ${escapeHtml(report.generatedAt.toLocaleString('en-GB'))}
    </p>
    <div class="cards">${summaryCards}</div>
    ${report.rows.length ? tableHtml(report) : '<p class="empty">No data in this date range.</p>'}
    ${extra}
  </body>
</html>`;

  return renderHtmlToPdf(html, { landscape: true });
}
