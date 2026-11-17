/**
 * Finding the shape of an uploaded CV.
 *
 * Tidies the raw lines, spots which are headings, and cuts the document
 * into sections and then into entries. Nothing here reads meaning: it
 * only decides where one thing ends and the next begins.
 */

import { parseDateRange } from './dates.js';
import { BULLET_MARKERS, SECTION_SYNONYMS } from './dictionaries.js';

/**
 * Turns raw extracted text into a tidy array of non-empty lines.
 *
 * PDF extraction in particular produces odd whitespace: non-breaking spaces,
 * repeated spaces from column alignment, and stray carriage returns. Cleaning
 * this up first means every later rule can assume simple input.
 *
 * A run of two or more spaces is kept (as exactly two), because in a CV it is
 * not noise: it is the gap between two columns, such as an employer on the
 * left and its dates on the right, or a label beside its values. Several
 * rules below split on it, so flattening it to one space would throw away the
 * only clue that those are separate fields.
 *
 * @param {string} text - Raw text from the document.
 * @returns {string[]} Trimmed, non-empty lines.
 */
export function normaliseLines(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n') // Windows and old Mac line endings
    .replace(new RegExp(String.fromCharCode(0xa0), 'g'), ' ') // non-breaking spaces
    .replace(/[‘’]/g, "'") // smart quotes
    .replace(/[“”]/g, '"')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, (run) => (run.length > 1 ? '  ' : ' ')).trim())
    .filter((line) => line.length > 0);
}

// ---------------------------------------------------------------------------
// Step 2: contact details
// ---------------------------------------------------------------------------

/**
 * Decides whether a line is a section heading, and which section it names.
 *
 * A heading is recognised by matching the line against the synonym lists
 * after stripping decoration. The line must also be short: "Experience" is a
 * heading, but "Experience of working with large teams" inside a summary is
 * not, and length is the cheapest way to tell them apart.
 *
 * Matching ignores spaces entirely. A heading set in letter-spaced capitals
 * loses its word boundaries when the PDF is read, so "PROFESSIONAL SUMMARY"
 * can arrive as "PROFESSIONALSUMMARY"; comparing without spaces recognises
 * both and costs nothing, as no two section names differ only by a space.
 *
 * @param {string} line - A normalised line.
 * @returns {string|null} The section key, or null if this is not a heading.
 */
export function detectHeading(line) {
  // Strip trailing colons, surrounding punctuation and rule characters.
  const cleaned = line
    .replace(/[:_|]+$/g, '')
    .replace(/^[\s#*_=-]+|[\s#*_=-]+$/g, '')
    .trim()
    .toLowerCase();

  if (!cleaned || cleaned.length > 40) return null;

  const direct = matchSectionName(cleaned);
  if (direct) return direct;

  // A combined heading such as "Education and Languages" or
  // "Skills & Technologies". Both halves must name a section, or an ordinary
  // sentence containing "and" would be mistaken for one. The first half wins,
  // and the inline labels handled in splitIntoSections usually pick the
  // second half up from the lines underneath.
  const halves = cleaned.split(/\s+(?:and|&|\/)\s+|\s*\/\s*/).filter(Boolean);

  if (halves.length >= 2) {
    const keys = halves.map(matchSectionName);
    if (keys.every(Boolean)) return keys[0];
  }

  return null;
}

/**
 * Matches one cleaned, lowercased name against the synonym lists.
 * @param {string} name - A candidate section name.
 * @returns {string|null} The section key, or null.
 */
export function matchSectionName(name) {
  const squashed = name.replace(/\s+/g, '');
  if (!squashed) return null;

  for (const [key, synonyms] of Object.entries(SECTION_SYNONYMS)) {
    if (synonyms.some((synonym) => synonym.replace(/\s+/g, '') === squashed)) return key;
  }

  return null;
}

/**
 * Splits the document into sections at each heading.
 *
 * Anything before the first heading is returned as `header`, since that is
 * where the name and contact details normally live.
 *
 * A section also starts at an inline label — a line such as
 * "Languages    English, Nepali", where the name of the section sits in a
 * left-hand column instead of on a line of its own. Compact one-page CVs are
 * written this way constantly, and without this rule everything under a
 * combined heading like "Education and Languages" would be filed as
 * education. The label is removed and the rest of the line kept as content.
 *
 * Inline labels are ignored inside the skills section, where lines like
 * "Languages    JavaScript, Python" are category labels for skills rather
 * than a new section, and reading them as one would move half the skills
 * somewhere else.
 *
 * @param {string[]} lines - Normalised lines.
 * @returns {{header: string[], sections: Record<string, string[]>}}
 */
export function splitIntoSections(lines) {
  const header = [];
  const sections = {};

  let current = null;

  /** Starts (or resumes) a section, keeping anything already collected. */
  const startSection = (key) => {
    current = key;
    // A repeated heading appends rather than replacing, so a CV split
    // across columns or pages does not lose half its content.
    if (!sections[current]) sections[current] = [];
  };

  for (const line of lines) {
    const heading = detectHeading(line);

    if (heading) {
      startSection(heading);
      continue;
    }

    const inline = current === 'skills' ? null : detectInlineLabel(line);

    if (inline) {
      startSection(inline.key);
      if (inline.rest) sections[current].push(inline.rest);
      continue;
    }

    if (current) sections[current].push(line);
    else header.push(line);
  }

  return { header, sections };
}

/**
 * Detects a section name used as a label at the start of a line.
 *
 * The label must be followed by a column gap (two or more spaces, which
 * `normaliseLines` preserves) or a colon, so a sentence that merely begins
 * with the word "Education" is not mistaken for one.
 *
 * @param {string} line - A normalised line.
 * @returns {{key: string, rest: string}|null} The section and the remaining
 *          text, or null when the line has no inline label.
 */
export function detectInlineLabel(line) {
  if (BULLET_MARKERS.test(line)) return null;

  const match = line.match(/^([A-Za-z][A-Za-z &/]{2,28}?)\s*(?::|\s{2,})\s*(.+)$/);
  if (!match) return null;

  const key = matchSectionName(match[1].trim().toLowerCase());
  return key ? { key, rest: match[2].trim() } : null;
}

// ---------------------------------------------------------------------------
// Step 4: dates
// ---------------------------------------------------------------------------

/**
 * Splits a section's lines into separate entries.
 *
 * A new entry is assumed to begin at a line that carries a date range and is
 * not a bullet, because in practice every role and qualification is headed by
 * its dates. If no line has dates, the whole section is treated as one entry
 * rather than being lost.
 *
 * Many CVs put the dates on the line *below* the heading instead:
 *
 *     Accountant, ABC Traders — Kathmandu
 *     Jan 2021 – Present
 *     • Prepared monthly VAT returns
 *
 * Splitting at the dated line there would cut every heading off from its
 * dates, and file each heading as the last line of the entry before. So:
 *   1. The first entry tells us the layout: how many plain lines come
 *      before its date line (0 when the dates are on the heading itself).
 *   2. When the next date line arrives, that many lines are taken back off
 *      the end of the previous entry and start the new one with it.
 *
 * @param {string[]} lines - The lines belonging to one section.
 * @returns {string[][]} One array of lines per entry.
 */
export function splitIntoEntries(lines) {
  const entries = [];
  let current = [];

  const isBullet = (line) => BULLET_MARKERS.test(line);
  const isDateLine = (line) => !isBullet(line) && parseDateRange(line) !== null;

  for (const line of lines) {
    // Only a date line can start a new entry, and only once the current
    // entry already has its own date line; until then the dates belong to
    // the heading just read.
    if (isDateLine(line) && current.some(isDateLine)) {
      // Step 1: how many heading lines this entry had above its dates
      // (at most two: a title and a company).
      const headingLines = Math.min(current.findIndex(isDateLine), 2);

      // Step 2: take the same number back off the end, as long as they are
      // plain lines and not the previous entry's own date line.
      const tail = headingLines > 0 ? current.slice(-headingLines) : [];
      const moveTail =
        tail.length > 0 &&
        current.length > headingLines + 1 &&
        tail.every((tailLine) => !isBullet(tailLine) && !isDateLine(tailLine));

      const carried = moveTail ? tail : [];
      if (moveTail) current = current.slice(0, -headingLines);

      entries.push(current);
      current = [...carried];
    }

    current.push(line);
  }

  if (current.length > 0) entries.push(current);

  return entries;
}

/**
 * Separates an entry's bullet lines from its prose lines.
 *
 * A bullet longer than the page is wide is stored as several lines, and only
 * the first carries the bullet character. A plain line that follows an
 * unfinished bullet is therefore the rest of it, not a new thought, and is
 * joined back on — otherwise every achievement is cut off mid-sentence and
 * its ending is filed as the job description.
 *
 * @param {string[]} lines - The lines of one entry.
 * @returns {{bullets: string[], prose: string[]}}
 */
export function extractBullets(lines) {
  const bullets = [];
  const prose = [];

  for (const line of lines) {
    if (BULLET_MARKERS.test(line)) {
      bullets.push(line.replace(BULLET_MARKERS, '').trim());
      continue;
    }

    const last = bullets[bullets.length - 1];

    // Unfinished means it does not end in sentence punctuation.
    if (last && !/[.!?:]$/.test(last)) {
      bullets[bullets.length - 1] = `${last} ${line}`;
      continue;
    }

    prose.push(line);
  }

  return { bullets, prose };
}

// ---------------------------------------------------------------------------
// Step 6: turning entries into CV fields
// ---------------------------------------------------------------------------
