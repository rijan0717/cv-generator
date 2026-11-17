/**
 * Reading the date ranges on an uploaded CV.
 *
 * Converts the many ways a CV writes "March 2021 - present" into the
 * YYYY-MM strings the builder stores.
 */

import { MONTHS, PRESENT_WORDS } from './dictionaries.js';

/**
 * Parses a date range such as "Jan 2023 - Present" or "03/2021 – 06/2025".
 *
 * Returns dates in the `YYYY-MM` form the CV model stores. When only a year
 * is given, January is assumed, because the model needs a month and the
 * builder shows the value for the user to correct.
 *
 * @param {string} line - A line that may contain a date range.
 * @returns {{startDate: string, endDate: string, isCurrent: boolean,
 *            matched: string}|null} Null when no range is found.
 */
export function parseDateRange(line) {
  const lower = line.toLowerCase();

  // Written months: "March 2021", "Mar 2021", "Mar. 2021"
  const written = String.raw`(?:${Object.keys(MONTHS).join('|')})\.?\s+\d{4}`;
  // Numeric: "03/2021", "3-2021", "2021"
  const numeric = String.raw`(?:\d{1,2}[/.\-]\d{4}|\d{4})`;
  const single = `(?:${written}|${numeric})`;
  const present = PRESENT_WORDS.join('|');

  const rangePattern = new RegExp(
    String.raw`(${single})\s*(?:-|–|—|to|until)\s*(${single}|${present})`,
    'i',
  );

  const match = lower.match(rangePattern);
  if (!match) return null;

  const isCurrent = PRESENT_WORDS.some((word) => match[2].trim() === word);

  return {
    startDate: toYearMonth(match[1]),
    endDate: isCurrent ? '' : toYearMonth(match[2]),
    isCurrent,
    // Taken from the original line, not the lowercased copy used for
    // matching, so that callers can strip it with a plain replace().
    matched: line.slice(match.index, match.index + match[0].length),
  };
}

/**
 * Converts one parsed date fragment into `YYYY-MM`.
 * @param {string} fragment - e.g. "mar 2021", "03/2021", "2021".
 * @returns {string} The date as YYYY-MM, or '' if it cannot be read.
 */
export function toYearMonth(fragment) {
  const value = fragment.trim().toLowerCase().replace(/\./g, '');

  // "mar 2021"
  const written = value.match(/^([a-z]+)\s+(\d{4})$/);
  if (written && MONTHS[written[1]]) {
    return `${written[2]}-${String(MONTHS[written[1]]).padStart(2, '0')}`;
  }

  // "03/2021" or "3-2021"
  const numeric = value.match(/^(\d{1,2})[/-](\d{4})$/);
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) {
      return `${numeric[2]}-${String(month).padStart(2, '0')}`;
    }
  }

  // Year only.
  const yearOnly = value.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01`;

  return '';
}

// ---------------------------------------------------------------------------
// Step 5: splitting sections into entries
// ---------------------------------------------------------------------------
