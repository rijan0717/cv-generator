/**
 * Reading the person off the top of an uploaded CV.
 *
 * The name, headline and contact details sit above the first heading and
 * follow no agreed layout, so each is found by what it looks like.
 */

import { detectHeading } from './layout.js';

/**
 * Extracts contact details from anywhere in the document.
 *
 * These are found by pattern rather than by position, because CVs put them in
 * a header, a sidebar or a footer with equal enthusiasm.
 *
 * @param {string[]} lines - Normalised lines.
 * @returns {{email: string, phone: string, linkedin: string, github: string,
 *            website: string}}
 */
export function parseContact(lines) {
  const text = lines.join('\n');

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? '';

  // Phone numbers vary hugely by country, so this deliberately looks for a
  // run of 7 or more digits that may contain spaces, dashes, dots, brackets
  // and a leading +, rather than trying to validate a real number.
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
  const phone = phoneMatch ? phoneMatch[1].trim() : '';

  const linkedin = text.match(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/[\w\-/%.]+/i)?.[0] ?? '';
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-/%.]+/i)?.[0] ?? '';

  // A general URL, excluding the two we have already identified.
  const urls = text.match(/https?:\/\/[^\s,;]+/gi) ?? [];
  const website =
    urls.find((url) => !/linkedin\.com|github\.com/i.test(url))?.replace(/[.,;)]+$/, '') ?? '';

  return { email, phone, linkedin, github, website, address: findAddress(lines, email, phone) };
}

/**
 * Finds the town or address on the contact line.
 *
 * Most CVs put it beside the email and phone:
 *     sita@gmail.com | +977 9841234567 | Kathmandu, Nepal
 * So:
 *   1. Take the lines that hold the email or phone number.
 *   2. Split them on the separators used between contact details.
 *   3. Keep the first part that is only words and commas — not the email,
 *      phone or a link — and is short enough to be a place.
 *
 * @param {string[]} lines - Normalised lines.
 * @param {string} email - The email already found, if any.
 * @param {string} phone - The phone number already found, if any.
 * @returns {string} The address, or '' when none is found.
 */
export function findAddress(lines, email, phone) {
  const contactLines = lines.filter(
    (line) => (email && line.includes(email)) || (phone && line.includes(phone)),
  );

  for (const line of contactLines) {
    const parts = line.split(/\s[|•·]\s|\s{2,}|\|/).map((part) => part.trim());

    const place = parts.find(
      (part) =>
        part.length >= 3 &&
        part.length <= 60 &&
        /^[A-Za-z][A-Za-z .'-]*(,\s*[A-Za-z][A-Za-z .'-]*)*$/.test(part) &&
        !/linkedin|github|www\./i.test(part),
    );

    if (place) return place;
  }

  return '';
}

/**
 * Guesses the candidate's name and headline from the top of the document.
 *
 * The name is almost always the first substantial line, so the rule is: take
 * the first line that is short, contains no digits or contact punctuation,
 * and looks like a name. The line after it, if it is also short, is treated
 * as the headline.
 *
 * @param {string[]} lines - Normalised lines.
 * @param {{linkedin?: string, github?: string, email?: string}} [contact] -
 *        Contact details, used to put the space back into a name whose
 *        spacing the PDF lost.
 * @returns {{fullName: string, headline: string}}
 */
export function parseNameAndHeadline(lines, contact = {}) {
  const candidates = lines.slice(0, 6);

  const nameIndex = candidates.findIndex((line) => looksLikeName(line));
  if (nameIndex === -1) return { fullName: '', headline: '' };

  const fullName = restoreNameSpacing(candidates[nameIndex], contact);

  // The headline is the next line, provided it is short prose rather than a
  // contact line or a section heading.
  //
  // It is deliberately NOT excluded for looking like a name: a job title such
  // as "Software Developer" has exactly the same shape as one, so that test
  // would throw away the common case.
  const next = candidates[nameIndex + 1] ?? '';
  const headline =
    next && next.length <= 70 && !/@|\d{4}|https?:\/\//.test(next) && !detectHeading(next)
      ? next
      : '';

  return { fullName, headline };
}

/**
 * Puts the space back into a name the PDF ran together.
 *
 * A name set in letter-spaced capitals — R I J A N   P A R I Y A R — reaches
 * us as "RIJANPARIYAR", because the gap between the two words is written in
 * the file exactly like the gaps between the letters. Nothing in the text can
 * say where the name ends, but the CV almost always repeats it in a profile
 * link, where a hyphen or a dot keeps the two parts apart.
 *
 * So the handle is split, and if its parts spell the same letters as the run
 * of capitals, the run is cut in the same places. The check is all or
 * nothing: a handle that does not match the name exactly is ignored rather
 * than guessed at.
 *
 * @param {string} name - The name as it was read.
 * @param {{linkedin?: string, github?: string, email?: string}} contact
 * @returns {string} The name, spaced if it could be, unchanged if not.
 */
export function restoreNameSpacing(name, contact) {
  if (name.includes(' ') || name.length < 6) return name;

  const handles = [contact.linkedin, contact.github, (contact.email ?? '').split('@')[0]]
    .filter(Boolean)
    .flatMap((value) => value.split('/'))
    .filter((segment) => /[-._]/.test(segment));

  for (const handle of handles) {
    const parts = handle.split(/[-._]+/).filter(Boolean);

    if (parts.length >= 2 && parts.join('').toLowerCase() === name.toLowerCase()) {
      let position = 0;

      return parts
        .map((part) => {
          const slice = name.slice(position, position + part.length);
          position += part.length;
          return slice;
        })
        .join(' ');
    }
  }

  return name;
}

/**
 * Reports whether a line plausibly is a person's name.
 *
 * One word is allowed as well as two to five, because a letter-spaced name
 * arrives from a PDF as a single run of capitals. It has to be long enough
 * and plain enough not to be a stray word from a header.
 *
 * @param {string} line - A normalised line.
 * @returns {boolean}
 */
export function looksLikeName(line) {
  if (line.length < 3 || line.length > 50) return false;
  if (/\d|@|https?:\/\//.test(line)) return false;
  if (detectHeading(line)) return false;

  const words = line.split(' ').filter(Boolean);
  if (words.length > 5) return false;

  if (words.length === 1) {
    return line.length >= 6 && /^[A-Za-z][A-Za-z'’-]*$/.test(line);
  }

  // Every word should start with a capital, or the whole line is upper case
  // as many CVs render the name.
  const isAllCaps = line === line.toUpperCase();
  const isTitleCase = words.every((word) => /^[A-Z][\w'’-]*$/.test(word));

  return isAllCaps || isTitleCase;
}

// ---------------------------------------------------------------------------
// Step 3: finding section headings
// ---------------------------------------------------------------------------
