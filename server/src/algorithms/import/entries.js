/**
 * Reading one role or one qualification off an uploaded CV.
 *
 * An entry is a few lines with no fixed order: the title, the employer
 * and the dates can each come first. These work out which is which.
 */

import { parseDateRange } from './dates.js';
import { ROLE_WORDS } from './dictionaries.js';
import { extractBullets } from './layout.js';
import { splitOnSeparators } from './lists.js';

/**
 * Reports whether a line reads as a job title rather than an employer.
 * @param {string} line - A line from an experience entry.
 * @returns {boolean}
 */
export function looksLikeJobTitle(line) {
  const lower = line.toLowerCase();
  return ROLE_WORDS.some((word) => new RegExp(`\\b${word}s?\\b`).test(lower));
}

/**
 * Finds an entry's heading lines and its dates, wherever the dates are.
 *
 * The parsers below expect the dates on the first line ("Developer, Acme
 * | Jan 2023 - Present") with an optional second heading line. When the
 * dates sit on a line of their own under the heading — one or two lines
 * down — this rearranges the lines into that expected shape:
 *   1. Look for the date range in the first three lines.
 *   2. The lines above it are the heading (title, then company).
 *   3. Any other text on the date line ("Acme Ltd | Jan 2023 - Present")
 *      becomes the second heading line if there is not one already.
 *   4. Everything after the date line is the body.
 *
 * @param {string[]} prose - The entry's non-bullet lines.
 * @returns {{first: string, second: string, rest: string[],
 *            dates: object|null}}
 */
export function arrangeHeading(prose) {
  const [first = '', second = '', ...rest] = prose;

  // Step 1: the dates are on the first or second line; the usual case.
  const dateIndex = prose.slice(0, 3).findIndex((line) => parseDateRange(line) !== null);
  if (dateIndex <= 0) {
    return {
      first,
      second,
      rest,
      dates: dateIndex === 0 ? parseDateRange(first) : null,
    };
  }

  // Steps 2-4: dates below the heading.
  const dates = parseDateRange(prose[dateIndex]);
  const heading = prose.slice(0, dateIndex);
  const leftover = prose[dateIndex]
    .replace(dates.matched, '')
    .replace(/^[\s,|–—-]+|[\s,|–—-]+$/g, '');

  return {
    first: heading[0],
    second: heading[1] ?? leftover,
    rest: prose.slice(dateIndex + 1),
    dates,
  };
}

/**
 * Parses one experience entry.
 *
 * The usual shape is a title line carrying the dates, then a line naming the
 * company, then bullets. The title line is split on the common separators so
 * "Developer, Acme Ltd" and "Developer | Acme" both work.
 *
 * Plenty of CVs invert this and put "Acme Ltd — London    Jan 2023 – Present"
 * first with the job title underneath, so the two lines are compared before
 * either is used: the one that reads as a job title becomes the position and
 * the other becomes the employer. Without that check the employer's city ends
 * up recorded as the job.
 *
 * @param {string[]} lines - The lines of one entry.
 * @returns {object} An experience sub-document.
 */
export function parseExperienceEntry(lines) {
  const { bullets, prose } = extractBullets(lines);
  const { first, second, rest, dates } = arrangeHeading(prose);

  // Remove the matched date text so it does not end up in the job title.
  const titleLine = dates ? first.replace(dates.matched, '') : first;
  const parts = splitOnSeparators(titleLine);

  let position = parts[0] ?? '';
  let company = parts[1] ?? '';
  let location = parts[2] ?? '';

  const hasSecondLine = Boolean(second) && second !== first && !parseDateRange(second);

  if (hasSecondLine && !looksLikeJobTitle(titleLine) && looksLikeJobTitle(second)) {
    // Employer first, role underneath.
    position = second.trim();
    company = parts[0] ?? '';
    // Everything after the employer is the place it was in; rejoining keeps
    // "Kathmandu, Nepal" whole instead of dropping the country.
    location = parts.slice(1).join(', ');
  } else if (!company && hasSecondLine) {
    // When the title line held only the position, the next line is usually
    // the employer.
    const secondParts = splitOnSeparators(second);
    company = secondParts[0] ?? '';
    location = location || (secondParts[1] ?? '');
  }

  return {
    position: position.trim(),
    company: company.trim(),
    location: location.trim(),
    startDate: dates?.startDate ?? '',
    endDate: dates?.endDate ?? '',
    isCurrent: dates?.isCurrent ?? false,
    description: rest.join(' ').trim(),
    achievements: bullets,
  };
}

/**
 * Parses one education entry.
 * @param {string[]} lines - The lines of one entry.
 * @returns {object} An education sub-document.
 */
export function parseEducationEntry(lines) {
  const { prose } = extractBullets(lines);
  const { first, second, rest, dates } = arrangeHeading(prose);
  const titleLine = dates ? first.replace(dates.matched, '') : first;
  const parts = splitOnSeparators(titleLine);

  // "BSc Computer Science" -> degree "BSc", field "Computer Science".
  const qualification = parts[0] ?? '';
  const degreeMatch = qualification.match(
    /^(BSc|BA|BE|BCA|BBA|MSc|MA|MBA|MCA|PhD|Diploma|Certificate|Bachelor[^,]*|Master[^,]*)\b[\s,]*(.*)$/i,
  );

  let degree = degreeMatch ? degreeMatch[1].trim() : qualification.trim();
  let fieldOfStudy = degreeMatch ? degreeMatch[2].trim() : '';

  // "Bachelor of Computer Applications (BCA)" is all one qualification, so a
  // remainder with no words in it — a stray bracket — means the split was
  // wrong and the line is better left whole.
  if (!/[A-Za-z0-9]/.test(fieldOfStudy)) {
    degree = qualification.trim();
    fieldOfStudy = '';
  }

  let institution = parts[1] ?? '';
  if (!institution && second && !parseDateRange(second)) {
    institution = splitOnSeparators(second)[0] ?? '';
  }

  // Grades appear as "GPA: 3.8", "Grade: First", "CGPA 3.5".
  const gradeLine = prose.find((line) => /\b(gpa|cgpa|grade|percentage|class)\b/i.test(line));
  const grade = gradeLine
    ? (
        gradeLine.match(/\b(?:gpa|cgpa|grade|percentage|class)\b\s*[:-]?\s*(.+)$/i)?.[1] ?? ''
      ).trim()
    : '';

  return {
    institution: institution.trim(),
    degree,
    fieldOfStudy,
    startDate: dates?.startDate ?? '',
    endDate: dates?.endDate ?? '',
    grade,
    description: rest
      .filter((line) => line !== gradeLine)
      .join(' ')
      .trim(),
  };
}
