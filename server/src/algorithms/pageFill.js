/**
 * How much of an A4 page a CV fills.
 *
 * A tailored CV that stops half way down the page looks unfinished
 * whatever it says, and the rewrite had no way of knowing it had produced
 * one. This module is the missing measurement: it estimates the rendered
 * height of a CV in lines of text and compares that with the number of
 * lines an A4 page holds at the CV's own font size.
 *
 * It is an estimate, and deliberately a simple one. The exact height is
 * decided by the browser laying out the chosen template, which the server
 * cannot see — and asking it to would mean rendering a page through
 * Puppeteer on every keystroke of a rewrite. A line count is accurate
 * enough for the only question being asked: is this page full, half full,
 * or overflowing? Templates that put sections in a side column are
 * measured as the taller of their two columns, because that is where the
 * page actually ends — treating one as a single column would report a
 * sidebar full of skills as though it filled the main column too.
 *
 * Everything it knows is in `PAGE_FILL_CONFIG`, so the numbers can be
 * explained and adjusted in one place.
 */
import { PAGE_FILL_CONFIG } from '../config/scoringConfig.js';

/**
 * How many lines of body text fit on one A4 page at a given font size.
 *
 * A point is 0.3528mm. A line of text occupies its font size times the
 * line height, so the usable height of the page divided by that is the
 * number of lines it holds.
 *
 * @param {object} settings - A CV's `settings` sub-document.
 * @returns {number} Lines per page, not rounded.
 */
export function pageCapacity(settings = {}) {
  const { usableHeightMm, lineHeight, pointToMm, fontSizePt } = PAGE_FILL_CONFIG;

  const points = fontSizePt[settings.fontSize] ?? fontSizePt.medium;
  const lineMm = points * pointToMm * lineHeight;

  return usableHeightMm / lineMm;
}

/**
 * How many lines a block of prose wraps to.
 *
 * Words per line rather than characters: character counting is more
 * precise for a fixed font and no more precise than this across the six
 * the user can choose between, since their widths differ.
 *
 * @param {string} text - The prose.
 * @param {object} settings - The CV's settings, for the font size.
 * @returns {number} Lines, at least 1 for any non-empty text.
 */
function prosLines(text, settings) {
  const words = String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (words === 0) return 0;

  const perLine =
    PAGE_FILL_CONFIG.wordsPerLine[settings.fontSize] ?? PAGE_FILL_CONFIG.wordsPerLine.medium;

  return Math.ceil(words / perLine);
}

/**
 * The lines one section costs: its heading, its gap, and its entries.
 *
 * @param {number} entryLines - Lines the entries themselves occupy.
 * @param {object} settings - The CV's settings, for the spacing.
 * @returns {number} Total lines, or 0 for a section with no entries.
 */
function sectionLines(entryLines, settings) {
  if (entryLines <= 0) return 0;

  const gap =
    PAGE_FILL_CONFIG.spacingLines[settings.spacing] ?? PAGE_FILL_CONFIG.spacingLines.normal;

  // One line for the heading, plus the gap above the section.
  return entryLines + 1 + gap;
}

/**
 * Estimates the height of each section of a CV, in lines.
 *
 * Returned per section rather than as one total so the caller can say
 * *which* part of the CV is thin, which is the only advice worth giving
 * about a half-empty page.
 *
 * @param {object} cv - The CV or draft to measure.
 * @returns {Record<string, number>} Lines per section.
 */
export function sectionHeights(cv) {
  const settings = cv.settings ?? {};
  const hidden = new Set(settings.hiddenSections ?? []);

  /**
   * Zero for a hidden section: it is not on the page, so it does not
   * fill it.
   * @param {string} key - The section name.
   * @param {number} lines - What it would cost if shown.
   * @returns {number} Its real contribution.
   */
  const visible = (key, lines) => (hidden.has(key) ? 0 : lines);

  const personal = cv.personal ?? {};

  // The header: name, headline, and the contact details that wrap under
  // it. Always present, never a "section" with a heading of its own.
  const contactFields = [
    personal.email,
    personal.phone,
    personal.address,
    personal.website,
    personal.linkedin,
    personal.github,
  ].filter(Boolean).length;

  const header =
    1.6 + // the name, set larger than body text
    (personal.headline ? 1 : 0) +
    Math.ceil(contactFields / PAGE_FILL_CONFIG.contactPerLine) +
    1; // the rule and gap under the header

  const summary = visible('summary', sectionLines(prosLines(cv.summary, settings), settings));

  const experience = visible(
    'experience',
    sectionLines(
      (cv.experience ?? []).reduce(
        (total, entry) =>
          total +
          2 + // position, then company and dates
          prosLines(entry?.description, settings) +
          (entry?.achievements ?? []).filter(Boolean).length +
          PAGE_FILL_CONFIG.entryGapLines,
        0,
      ),
      settings,
    ),
  );

  const education = visible(
    'education',
    sectionLines(
      (cv.education ?? []).reduce(
        (total, entry) =>
          total +
          2 + // degree, then institution and dates
          (entry?.grade ? 1 : 0) +
          prosLines(entry?.description, settings) +
          PAGE_FILL_CONFIG.entryGapLines,
        0,
      ),
      settings,
    ),
  );

  const projects = visible(
    'projects',
    sectionLines(
      (cv.projects ?? []).reduce(
        (total, entry) =>
          total +
          1 + // name and role on one line
          prosLines(entry?.description, settings) +
          (entry?.technologies ? 1 : 0) +
          PAGE_FILL_CONFIG.entryGapLines,
        0,
      ),
      settings,
    ),
  );

  const certifications = visible(
    'certifications',
    sectionLines((cv.certifications ?? []).length * (1 + PAGE_FILL_CONFIG.entryGapLines), settings),
  );

  // Skills and languages are laid out as chips or short rows, several to
  // a line, rather than one per line like the dated sections.
  const skills = visible(
    'skills',
    sectionLines(Math.ceil((cv.skills ?? []).length / PAGE_FILL_CONFIG.chipsPerLine), settings),
  );

  const languages = visible(
    'languages',
    sectionLines(Math.ceil((cv.languages ?? []).length / PAGE_FILL_CONFIG.chipsPerLine), settings),
  );

  const referenceEntries = cv.referencesOnRequest ? 1 : (cv.references ?? []).length * 2;
  const references = visible('references', sectionLines(referenceEntries, settings));

  return {
    header,
    summary,
    experience,
    education,
    projects,
    certifications,
    skills,
    languages,
    references,
  };
}

/**
 * How full the page is, and by how much it misses.
 *
 * Two-column templates are measured as the taller of their two columns
 * rather than as the sum of every section, because that is how the page
 * actually ends: a sidebar of skills sits *beside* the experience, not
 * under it. Summing them would report a page as nearly full when half
 * the main column is white space, which is the very situation this is
 * here to detect.
 *
 * @param {object} cv - The CV or draft to measure.
 * @returns {{lines: number, capacity: number, ratio: number,
 *            shortfallLines: number, isFull: boolean, sections: object}}
 */
export function estimateFill(cv) {
  const sections = sectionHeights(cv);
  const side = PAGE_FILL_CONFIG.sideColumns[cv.templateKey] ?? [];

  let lines;

  if (side.length > 0) {
    const inSide = (key) => side.includes(key);

    // The name and headline sit in the main column of both two-column
    // templates, so the header counts towards it.
    const main = Object.entries(sections)
      .filter(([key]) => !inSide(key))
      .reduce((total, [, value]) => total + value, 0);

    const rail = side.reduce((total, key) => total + (sections[key] ?? 0), 0);

    lines = Math.max(main, rail);
  } else {
    lines = Object.values(sections).reduce((total, value) => total + value, 0);
  }

  const capacity = pageCapacity(cv.settings ?? {});
  const target = capacity * PAGE_FILL_CONFIG.targetRatio;

  return {
    lines: Math.round(lines * 10) / 10,
    capacity: Math.round(capacity * 10) / 10,
    ratio: Math.round((lines / capacity) * 100) / 100,
    shortfallLines: Math.max(0, Math.round((target - lines) * 10) / 10),
    isFull: lines >= target,
    sections,
  };
}

export default estimateFill;
