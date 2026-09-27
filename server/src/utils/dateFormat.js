/**
 * Date formatting shared by the export services.
 *
 * The client has its own copy of this in `templates/templateUtils.js`. They
 * are kept separate rather than shared because the server cannot import from
 * the client package, and duplicating twenty lines is cheaper than adding a
 * shared build step to an academic project. The two must produce the same
 * strings, and a test asserts the formats used here.
 */

/**
 * Formats a stored `YYYY-MM` value for display.
 * @param {string} value - The stored date, or an empty string.
 * @returns {string} e.g. "Mar 2024", or '' when there is nothing to show.
 */
export function formatMonth(value) {
  if (!value) return '';

  const [year, month] = String(value).split('-');
  if (!year) return '';
  if (!month) return year;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Builds a "Mar 2024 – Present" style range.
 * @param {string} startDate - Stored start date.
 * @param {string} endDate - Stored end date.
 * @param {boolean} [isCurrent] - True when the role is ongoing.
 * @returns {string} The formatted range, or '' when no dates are set.
 */
export function formatDateRange(startDate, endDate, isCurrent = false) {
  const start = formatMonth(startDate);
  const end = isCurrent ? 'Present' : formatMonth(endDate);

  if (!start && !end) return '';
  if (!start) return end;
  if (!end) return start;

  return `${start} – ${end}`;
}

/**
 * Makes a string safe to use as a download filename.
 *
 * Path separators and characters Windows forbids are removed, so a CV titled
 * "../../etc/passwd" cannot influence where anything is written or how the
 * browser saves it.
 *
 * @param {string} value - The raw text, e.g. a person's name or CV title.
 * @returns {string} A safe filename fragment.
 */
export function sanitiseFilename(value) {
  return String(value ?? '')
    .replace(/[/\\?%*:|"<>]/g, '') // characters that are illegal in filenames
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 60)
    .trim();
}

/**
 * Builds the download filename for an export.
 * @param {object} cv - The CV document.
 * @param {string} extension - e.g. 'pdf', 'docx', 'xlsx'.
 * @returns {string} e.g. "Jane_Doe_Developer_CV.pdf"
 */
export function buildExportFilename(cv, extension) {
  const name = sanitiseFilename(cv.personal?.fullName) || 'CV';
  const title = sanitiseFilename(cv.title);

  return [name, title, 'CV'].filter(Boolean).join('_') + `.${extension}`;
}
