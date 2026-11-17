/**
 * CV Import Parser.
 *
 * Takes the plain text of an existing CV — extracted from a .docx or .pdf —
 * and works out its structure, so the builder can be filled in automatically
 * instead of the user retyping everything.
 *
 * This module is written from scratch in plain JavaScript. No NLP or parsing
 * library is used; the libraries in this feature only turn a binary file into
 * text, and everything below is our own logic.
 *
 * The approach, in order:
 *
 *   1. Normalise the text into clean lines.
 *   2. Pull out contact details, which can appear anywhere.
 *   3. Find section headings by scoring each line against a set of rules.
 *   4. Split the lines between the headings into entries.
 *   5. Parse each entry into fields the CV model understands.
 *
 * The parser is deliberately conservative: when it is not confident it leaves
 * a field empty rather than guessing, because a wrong value is more annoying
 * to fix than a blank one.
 */

import { parseContact, parseNameAndHeadline } from './import/contact.js';
import { parseEducationEntry, parseExperienceEntry } from './import/entries.js';
import { normaliseLines, splitIntoEntries, splitIntoSections } from './import/layout.js';
import { parseCertifications, parseLanguages, parseProjects, parseSkills } from './import/lists.js';
import { detectHeading, extractBullets } from './import/layout.js';
import { parseDateRange } from './import/dates.js';

// Re-exported so this module's public surface is unchanged by the split:
// the controllers and the unit tests import these from here as before.
export {
  normaliseLines,
  parseContact,
  parseNameAndHeadline,
  detectHeading,
  splitIntoSections,
  parseDateRange,
  splitIntoEntries,
  extractBullets,
  parseExperienceEntry,
  parseEducationEntry,
  parseSkills,
  parseLanguages,
  parseProjects,
  parseCertifications,
};

/**
 * Parses the full text of a CV into the shape the CV model expects.
 *
 * Only the fields the parser is confident about are returned. The caller
 * merges the result into an existing CV, and the user reviews it in the
 * builder before saving — so this never needs to be perfect, only helpful.
 *
 * @param {string} text - The extracted document text.
 * @returns {{personal: object, summary: string, experience: Array<object>,
 *            education: Array<object>, skills: Array<object>,
 *            projects: Array<object>, certifications: Array<object>,
 *            languages: Array<object>,
 *            stats: {linesRead: number, sectionsFound: string[]}}}
 */
export function parseCVText(text) {
  const lines = normaliseLines(text);
  const { header, sections } = splitIntoSections(lines);

  // Contact details are searched for across the whole document, because a
  // sidebar CV may put them below the first heading.
  const contact = parseContact(lines);
  const { fullName, headline } = parseNameAndHeadline(header.length > 0 ? header : lines, contact);

  return {
    personal: {
      fullName,
      headline,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      website: contact.website,
      linkedin: contact.linkedin,
      github: contact.github,
    },

    summary: (sections.summary ?? []).join(' ').trim(),

    experience: (sections.experience ? splitIntoEntries(sections.experience) : []).map(
      parseExperienceEntry,
    ),

    education: (sections.education ? splitIntoEntries(sections.education) : []).map(
      parseEducationEntry,
    ),

    skills: parseSkills(sections.skills ?? []),
    projects: parseProjects(sections.projects ?? []),
    certifications: parseCertifications(sections.certifications ?? []),
    languages: parseLanguages(sections.languages ?? []),

    stats: {
      linesRead: lines.length,
      sectionsFound: Object.keys(sections),
    },
  };
}

export default parseCVText;
