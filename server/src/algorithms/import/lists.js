/**
 * Reading the list sections of an uploaded CV.
 *
 * Skills, languages, projects and certifications are written as lists,
 * separated by commas, bullets or line breaks depending on the author.
 */

import { parseDateRange } from './dates.js';
import { BULLET_MARKERS, LEVEL_WORDS } from './dictionaries.js';
import { extractBullets } from './layout.js';

/**
 * Parses the skills section.
 *
 * Skills are written either as one comma-separated line, as bullets, or as
 * "Category: a, b, c". All three are flattened into individual skills, and a
 * level word in brackets is picked up when present.
 *
 * A category is also recognised when it is set in a left-hand column with no
 * colon — "Automation    Playwright, Cypress" — which is how most one-page
 * technical CVs lay the section out.
 *
 * @param {string[]} lines - The lines of the skills section.
 * @returns {Array<{name: string, level: string}>}
 */
export function parseSkills(lines) {
  const collected = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(BULLET_MARKERS, '');

    // Drop a leading category label: "Languages: JavaScript, Python", or the
    // same thing written as a column.
    let withoutCategory = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;

    const columnLabel = withoutCategory.match(/^[A-Za-z][A-Za-z &/]{2,28}?\s{2,}(.+)$/);
    if (columnLabel) withoutCategory = columnLabel[1];

    // A bracketed list is itself a list of skills — "Playwright (TypeScript,
    // JavaScript, Python)" names four of them — so its brackets become
    // separators. A bracket without a comma is left alone, because that is
    // how a level is written: "JavaScript (Advanced)".
    withoutCategory = withoutCategory.replace(/\(([^)]*,[^)]*)\)/g, ', $1');

    for (const piece of withoutCategory.split(/[,;|•·]/)) {
      const name = piece.trim();
      if (!name || name.length > 40) continue;

      // "JavaScript (Advanced)" or "JavaScript - Expert"
      const levelMatch = name.match(/^(.*?)\s*[([\-–]\s*([A-Za-z]+)\s*[)\]]?$/);

      if (levelMatch && LEVEL_WORDS[levelMatch[2].toLowerCase()]) {
        collected.push({
          name: levelMatch[1].trim(),
          level: LEVEL_WORDS[levelMatch[2].toLowerCase()],
        });
      } else {
        collected.push({ name, level: 'Intermediate' });
      }
    }
  }

  // Remove duplicates, keeping the first occurrence.
  const seen = new Set();
  return collected.filter((skill) => {
    const key = skill.name.toLowerCase();
    if (!skill.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parses the languages section, e.g. "English (Fluent)" or "Nepali - Native".
 * @param {string[]} lines - The lines of the languages section.
 * @returns {Array<{language: string, proficiency: string}>}
 */
export function parseLanguages(lines) {
  const results = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(BULLET_MARKERS, '');

    for (const piece of line.split(/[,;|•·]/)) {
      const text = piece.trim();
      if (!text) continue;

      const match = text.match(/^(.*?)\s*[([\-–:]\s*([^)\]]+)\s*[)\]]?$/);

      if (match) {
        results.push({ language: match[1].trim(), proficiency: match[2].trim() });
      } else {
        results.push({ language: text, proficiency: '' });
      }
    }
  }

  return results.filter((item) => item.language && item.language.length <= 40);
}

/**
 * Parses the projects section.
 * @param {string[]} lines - The lines of the projects section.
 * @returns {Array<object>} Project sub-documents.
 */
export function parseProjects(lines) {
  const entries = splitProjectEntries(lines);

  return entries.map((entryLines) => {
    const { bullets, prose } = extractBullets(entryLines);
    const [first = '', ...rest] = prose;

    const parts = splitOnSeparators(first);
    const link = entryLines.join(' ').match(/https?:\/\/[^\s,;]+/)?.[0] ?? '';

    // "Technologies: React, Node" anywhere in the entry.
    const techLine = entryLines.find((line) =>
      /\b(tech|technologies|stack|built with)\b/i.test(line),
    );
    const technologies = techLine
      ? (techLine.split(':')[1] ?? '')
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // A short second part with no digits is a role ("Lead Developer");
    // anything longer is the start of the description, as in
    // "Ease-meds — Online medicine delivery system in core PHP and MySQL".
    const second = (parts[1] ?? '').trim();
    const role = second.length <= 40 && !/\d/.test(second) ? second : '';

    // Whatever of the first line was not the name or the role is description,
    // so none of it is lost.
    const tail = parts.slice(role ? 2 : 1).join(', ');

    return {
      name: (parts[0] ?? '').trim(),
      role,
      description: [tail, ...rest.filter((line) => line !== techLine), ...bullets]
        .filter(Boolean)
        .join(' ')
        .trim(),
      technologies,
      link,
    };
  });
}

/**
 * Splits the projects section into entries.
 *
 * Projects rarely carry dates, so the rule used for jobs does not apply. A
 * new project starts at a non-bullet line that either names itself with a
 * dash — "Ease-meds — Online medicine delivery system…" — or is a short line
 * following a finished sentence.
 *
 * The second half of that rule matters because a PDF breaks a paragraph into
 * lines wherever it ran out of width. Treating every short line as a title,
 * as a simpler rule would, turns the tail of one description into a project
 * of its own; requiring the previous line to have ended in a full stop keeps
 * a wrapped sentence together.
 *
 * @param {string[]} lines - The lines of the projects section.
 * @returns {string[][]}
 */
export function splitProjectEntries(lines) {
  const entries = [];
  let current = [];
  let previous = '';

  for (const line of lines) {
    const namedWithDash = /^.{2,60}?\s[–—]\s/.test(line);
    const afterFullStop = previous.endsWith('.') && line.length <= 80 && !line.endsWith('.');

    const isTitle = !BULLET_MARKERS.test(line) && (namedWithDash || afterFullStop);

    if (isTitle && current.length > 0) {
      entries.push(current);
      current = [];
    }

    current.push(line);
    previous = line;
  }

  if (current.length > 0) entries.push(current);
  return entries;
}

/**
 * Parses the certifications section.
 * @param {string[]} lines - The lines of the certifications section.
 * @returns {Array<object>} Certification sub-documents.
 */
export function parseCertifications(lines) {
  return lines
    .map((rawLine) => {
      const line = rawLine.replace(BULLET_MARKERS, '').trim();
      if (!line) return null;

      const dates = parseDateRange(line);
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const withoutDate = dates ? line.replace(dates.matched, '') : line;

      const parts = splitOnSeparators(withoutDate);

      return {
        name: (parts[0] ?? '').trim(),
        issuer: (parts[1] ?? '').trim(),
        date: dates?.startDate ?? (yearMatch ? `${yearMatch[0]}-01` : ''),
        credentialLink: line.match(/https?:\/\/[^\s,;]+/)?.[0] ?? '',
      };
    })
    .filter((item) => item && item.name);
}

/**
 * Splits a line on the separators CVs commonly use between fields.
 * @param {string} line - The line to split.
 * @returns {string[]} The non-empty parts.
 */
export function splitOnSeparators(line) {
  return line
    .split(/\s[|–—]\s|,|\sat\s|·|\s{2,}/i)
    .map((part) => part.replace(/^[\s,|-]+|[\s,|-]+$/g, '').trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// The public entry point
// ---------------------------------------------------------------------------
