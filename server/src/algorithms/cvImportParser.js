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

/**
 * Words that identify each section. The parser matches a heading against
 * these, so "Work History", "Employment" and "Professional Experience" all
 * map to `experience`.
 */
const SECTION_SYNONYMS = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'professional profile',
    'about me',
    'about',
    'objective',
    'career objective',
    'personal statement',
  ],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment',
    'employment history',
    'work history',
    'career history',
    'positions held',
  ],
  education: [
    'education',
    'academic background',
    'academic qualifications',
    'qualifications',
    'education and training',
  ],
  skills: [
    'skills',
    'technical skills',
    'key skills',
    'core competencies',
    'competencies',
    'areas of expertise',
    'technologies',
  ],
  projects: ['projects', 'personal projects', 'key projects', 'selected projects', 'portfolio'],
  certifications: [
    'certifications',
    'certificates',
    'licenses',
    'licences',
    'courses',
    'training',
    'professional development',
  ],
  languages: ['languages', 'language skills'],
  references: ['references', 'referees'],
};

/** Characters commonly used as bullet markers in CVs. */
const BULLET_MARKERS = /^[•●▪‣⁃·*\-–—>]\s+/;

/** Month names and their abbreviations, for date parsing. */
const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** Words meaning a role has not ended. */
const PRESENT_WORDS = ['present', 'current', 'now', 'ongoing', 'to date', 'till date'];

/** Skill levels the CV model accepts, lowercased for matching. */
const LEVEL_WORDS = {
  beginner: 'Beginner',
  basic: 'Beginner',
  elementary: 'Beginner',
  intermediate: 'Intermediate',
  proficient: 'Advanced',
  advanced: 'Advanced',
  expert: 'Expert',
  fluent: 'Expert',
  native: 'Expert',
};

// ---------------------------------------------------------------------------
// Step 1: normalising
// ---------------------------------------------------------------------------

/**
 * Turns raw extracted text into a tidy array of non-empty lines.
 *
 * PDF extraction in particular produces odd whitespace: non-breaking spaces,
 * repeated spaces from column alignment, and stray carriage returns. Cleaning
 * this up first means every later rule can assume simple input.
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
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

// ---------------------------------------------------------------------------
// Step 2: contact details
// ---------------------------------------------------------------------------

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

  return { email, phone, linkedin, github, website };
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
 * @returns {{fullName: string, headline: string}}
 */
export function parseNameAndHeadline(lines) {
  const candidates = lines.slice(0, 6);

  const nameIndex = candidates.findIndex((line) => looksLikeName(line));
  if (nameIndex === -1) return { fullName: '', headline: '' };

  const fullName = candidates[nameIndex];

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
 * Reports whether a line plausibly is a person's name.
 * @param {string} line - A normalised line.
 * @returns {boolean}
 */
function looksLikeName(line) {
  if (line.length < 3 || line.length > 50) return false;
  if (/\d|@|https?:\/\//.test(line)) return false;
  if (detectHeading(line)) return false;

  const words = line.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;

  // Every word should start with a capital, or the whole line is upper case
  // as many CVs render the name.
  const isAllCaps = line === line.toUpperCase();
  const isTitleCase = words.every((word) => /^[A-Z][\w'’-]*$/.test(word));

  return isAllCaps || isTitleCase;
}

// ---------------------------------------------------------------------------
// Step 3: finding section headings
// ---------------------------------------------------------------------------

/**
 * Decides whether a line is a section heading, and which section it names.
 *
 * A heading is recognised by matching the line against the synonym lists
 * after stripping decoration. The line must also be short: "Experience" is a
 * heading, but "Experience of working with large teams" inside a summary is
 * not, and length is the cheapest way to tell them apart.
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

  for (const [key, synonyms] of Object.entries(SECTION_SYNONYMS)) {
    if (synonyms.includes(cleaned)) return key;
  }

  return null;
}

/**
 * Splits the document into sections at each heading.
 *
 * Anything before the first heading is returned as `header`, since that is
 * where the name and contact details normally live.
 *
 * @param {string[]} lines - Normalised lines.
 * @returns {{header: string[], sections: Record<string, string[]>}}
 */
export function splitIntoSections(lines) {
  const header = [];
  const sections = {};

  let current = null;

  for (const line of lines) {
    const heading = detectHeading(line);

    if (heading) {
      current = heading;
      // A repeated heading appends rather than replacing, so a CV split
      // across columns or pages does not lose half its content.
      if (!sections[current]) sections[current] = [];
      continue;
    }

    if (current) sections[current].push(line);
    else header.push(line);
  }

  return { header, sections };
}

// ---------------------------------------------------------------------------
// Step 4: dates
// ---------------------------------------------------------------------------

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
function toYearMonth(fragment) {
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

/**
 * Splits a section's lines into separate entries.
 *
 * A new entry is assumed to begin at a line that carries a date range and is
 * not a bullet, because in practice every role and qualification is headed by
 * its dates. If no line has dates, the whole section is treated as one entry
 * rather than being lost.
 *
 * @param {string[]} lines - The lines belonging to one section.
 * @returns {string[][]} One array of lines per entry.
 */
export function splitIntoEntries(lines) {
  const entries = [];
  let current = [];

  for (const line of lines) {
    const isBullet = BULLET_MARKERS.test(line);
    const startsNewEntry = !isBullet && parseDateRange(line) !== null;

    if (startsNewEntry && current.length > 0) {
      entries.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) entries.push(current);

  return entries;
}

/**
 * Separates an entry's bullet lines from its prose lines.
 * @param {string[]} lines - The lines of one entry.
 * @returns {{bullets: string[], prose: string[]}}
 */
export function extractBullets(lines) {
  const bullets = [];
  const prose = [];

  for (const line of lines) {
    if (BULLET_MARKERS.test(line)) {
      bullets.push(line.replace(BULLET_MARKERS, '').trim());
    } else {
      prose.push(line);
    }
  }

  return { bullets, prose };
}

// ---------------------------------------------------------------------------
// Step 6: turning entries into CV fields
// ---------------------------------------------------------------------------

/**
 * Parses one experience entry.
 *
 * The usual shape is a title line carrying the dates, then a line naming the
 * company, then bullets. The title line is split on the common separators so
 * "Developer, Acme Ltd" and "Developer | Acme" both work.
 *
 * @param {string[]} lines - The lines of one entry.
 * @returns {object} An experience sub-document.
 */
export function parseExperienceEntry(lines) {
  const { bullets, prose } = extractBullets(lines);
  const [first = '', second = '', ...rest] = prose;

  const dates = parseDateRange(first) ?? parseDateRange(second) ?? null;

  // Remove the matched date text so it does not end up in the job title.
  const titleLine = dates ? first.replace(dates.matched, '') : first;
  const parts = splitOnSeparators(titleLine);

  let position = parts[0] ?? '';
  let company = parts[1] ?? '';
  let location = parts[2] ?? '';

  // When the title line held only the position, the next line is usually the
  // employer.
  if (!company && second && second !== first && !parseDateRange(second)) {
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
  const [first = '', second = '', ...rest] = prose;

  const dates = parseDateRange(first) ?? parseDateRange(second) ?? null;
  const titleLine = dates ? first.replace(dates.matched, '') : first;
  const parts = splitOnSeparators(titleLine);

  // "BSc Computer Science" -> degree "BSc", field "Computer Science".
  const qualification = parts[0] ?? '';
  const degreeMatch = qualification.match(
    /^(BSc|BA|BE|BCA|BBA|MSc|MA|MBA|MCA|PhD|Diploma|Certificate|Bachelor[^,]*|Master[^,]*)\b[\s,]*(.*)$/i,
  );

  const degree = degreeMatch ? degreeMatch[1].trim() : qualification.trim();
  const fieldOfStudy = degreeMatch ? degreeMatch[2].trim() : '';

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

/**
 * Parses the skills section.
 *
 * Skills are written either as one comma-separated line, as bullets, or as
 * "Category: a, b, c". All three are flattened into individual skills, and a
 * level word in brackets is picked up when present.
 *
 * @param {string[]} lines - The lines of the skills section.
 * @returns {Array<{name: string, level: string}>}
 */
export function parseSkills(lines) {
  const collected = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(BULLET_MARKERS, '');

    // Drop a leading category label: "Languages: JavaScript, Python".
    const withoutCategory = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;

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

    for (const piece of line.split(/[,;|]/)) {
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

    return {
      name: (parts[0] ?? '').trim(),
      role: (parts[1] ?? '').trim(),
      description: [...rest.filter((line) => line !== techLine), ...bullets].join(' ').trim(),
      technologies,
      link,
    };
  });
}

/**
 * Splits the projects section into entries.
 *
 * Projects rarely carry dates, so the rule used for jobs does not apply. A
 * new project is assumed to start at a non-bullet line that is short enough
 * to be a title.
 *
 * @param {string[]} lines - The lines of the projects section.
 * @returns {string[][]}
 */
function splitProjectEntries(lines) {
  const entries = [];
  let current = [];

  for (const line of lines) {
    const isTitle = !BULLET_MARKERS.test(line) && line.length <= 80 && !line.endsWith('.');

    if (isTitle && current.length > 0) {
      entries.push(current);
      current = [];
    }
    current.push(line);
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
function splitOnSeparators(line) {
  return line
    .split(/\s[|–—]\s|,|\sat\s|·|\s{2,}/i)
    .map((part) => part.replace(/^[\s,|-]+|[\s,|-]+$/g, '').trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// The public entry point
// ---------------------------------------------------------------------------

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
  const { fullName, headline } = parseNameAndHeadline(header.length > 0 ? header : lines);

  return {
    personal: {
      fullName,
      headline,
      email: contact.email,
      phone: contact.phone,
      address: '',
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
