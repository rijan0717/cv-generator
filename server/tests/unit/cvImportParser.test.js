import { describe, it, expect } from 'vitest';
import {
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
  parseCVText,
} from '../../src/algorithms/cvImportParser.js';

describe('normaliseLines', () => {
  it('removes blank lines and collapses whitespace', () => {
    expect(normaliseLines('  Hello   world  \n\n\n  Second line \n')).toEqual([
      'Hello world',
      'Second line',
    ]);
  });

  it('handles Windows line endings', () => {
    expect(normaliseLines('One\r\nTwo')).toEqual(['One', 'Two']);
  });

  // PDF extraction commonly emits non-breaking spaces between columns.
  it('replaces non-breaking spaces', () => {
    expect(normaliseLines('Jane Doe')).toEqual(['Jane Doe']);
  });

  it('returns an empty array for empty input', () => {
    expect(normaliseLines('')).toEqual([]);
    expect(normaliseLines(null)).toEqual([]);
  });
});

describe('detectHeading', () => {
  it.each([
    ['EXPERIENCE', 'experience'],
    ['Work Experience', 'experience'],
    ['Employment History', 'experience'],
    ['Education', 'education'],
    ['Academic Qualifications', 'education'],
    ['Technical Skills', 'skills'],
    ['PROFILE', 'summary'],
    ['Career Objective', 'summary'],
    ['Projects:', 'projects'],
    ['-- Certifications --', 'certifications'],
    ['Languages', 'languages'],
    ['Referees', 'references'],
  ])('recognises %s as %s', (line, expected) => {
    expect(detectHeading(line)).toBe(expected);
  });

  // The word "experience" inside a sentence must not start a new section.
  it('does not treat a long sentence as a heading', () => {
    expect(detectHeading('Experience of working with large distributed teams')).toBeNull();
  });

  it('returns null for ordinary content', () => {
    expect(detectHeading('Built a reporting dashboard in React')).toBeNull();
  });
});

describe('parseDateRange', () => {
  it.each([
    ['Jan 2023 - Present', '2023-01', '', true],
    ['March 2021 – June 2025', '2021-03', '2025-06', false],
    ['03/2021 - 06/2025', '2021-03', '2025-06', false],
    ['2021 to 2025', '2021-01', '2025-01', false],
    ['Sept 2020 until Dec 2022', '2020-09', '2022-12', false],
    ['Feb 2024 - Current', '2024-02', '', true],
  ])('parses %s', (input, startDate, endDate, isCurrent) => {
    const result = parseDateRange(input);

    expect(result).not.toBeNull();
    expect(result.startDate).toBe(startDate);
    expect(result.endDate).toBe(endDate);
    expect(result.isCurrent).toBe(isCurrent);
  });

  it('returns null when there is no date range', () => {
    expect(parseDateRange('Senior Software Developer')).toBeNull();
  });

  it('rejects an impossible month', () => {
    // 13/2021 is not a valid month, so it must not become 2021-13.
    const result = parseDateRange('13/2021 - 06/2025');
    expect(result?.startDate).not.toBe('2021-13');
  });
});

describe('parseContact', () => {
  const lines = normaliseLines(`
    Jane Doe
    jane.doe@example.com | +977 9801234567
    linkedin.com/in/janedoe
    github.com/janedoe
    https://janedoe.dev
  `);

  it('finds the email address', () => {
    expect(parseContact(lines).email).toBe('jane.doe@example.com');
  });

  it('finds the phone number', () => {
    expect(parseContact(lines).phone).toContain('9801234567');
  });

  it('finds LinkedIn and GitHub separately', () => {
    const contact = parseContact(lines);
    expect(contact.linkedin).toContain('linkedin.com/in/janedoe');
    expect(contact.github).toContain('github.com/janedoe');
  });

  // The personal site must not be confused with the LinkedIn or GitHub URLs.
  it('finds a personal website that is neither LinkedIn nor GitHub', () => {
    expect(parseContact(lines).website).toBe('https://janedoe.dev');
  });

  it('returns empty strings when nothing is present', () => {
    expect(parseContact(['Just some text'])).toEqual({
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      website: '',
    });
  });
});

describe('parseNameAndHeadline', () => {
  it('reads a title-case name and the headline below it', () => {
    const result = parseNameAndHeadline(['Jane Doe', 'Software Developer', 'jane@example.com']);

    expect(result.fullName).toBe('Jane Doe');
    expect(result.headline).toBe('Software Developer');
  });

  it('reads an upper-case name', () => {
    expect(parseNameAndHeadline(['JANE DOE', 'jane@example.com']).fullName).toBe('JANE DOE');
  });

  it('does not treat a contact line as the headline', () => {
    expect(parseNameAndHeadline(['Jane Doe', 'jane@example.com']).headline).toBe('');
  });

  it('returns empty strings when no name can be found', () => {
    expect(parseNameAndHeadline(['12345', 'a@b.com'])).toEqual({ fullName: '', headline: '' });
  });
});

describe('splitIntoSections', () => {
  const lines = normaliseLines(`
    Jane Doe
    jane@example.com
    PROFILE
    A developer.
    EXPERIENCE
    Developer, Acme
    EDUCATION
    BCA, Tribhuvan University
  `);

  it('keeps the pre-heading lines as the header', () => {
    expect(splitIntoSections(lines).header).toEqual(['Jane Doe', 'jane@example.com']);
  });

  it('groups lines under their heading', () => {
    const { sections } = splitIntoSections(lines);

    expect(sections.summary).toEqual(['A developer.']);
    expect(sections.experience).toEqual(['Developer, Acme']);
    expect(sections.education).toEqual(['BCA, Tribhuvan University']);
  });
});

describe('extractBullets', () => {
  it('separates bullets from prose and strips the markers', () => {
    const result = extractBullets(['Developer at Acme', '• Built a thing', '- Fixed another']);

    expect(result.prose).toEqual(['Developer at Acme']);
    expect(result.bullets).toEqual(['Built a thing', 'Fixed another']);
  });
});

describe('splitIntoEntries', () => {
  it('starts a new entry at each dated line', () => {
    const entries = splitIntoEntries([
      'Developer, Acme | Jan 2023 - Present',
      '• Built things',
      'Intern, Other Ltd | Jun 2022 - Dec 2022',
      '• Learned things',
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveLength(2);
  });

  // A bullet that happens to mention a date must not split the entry.
  it('does not split on a dated bullet', () => {
    const entries = splitIntoEntries([
      'Developer | Jan 2023 - Present',
      '• Led the 2024 migration from Jan 2024 - Mar 2024',
    ]);

    expect(entries).toHaveLength(1);
  });

  it('keeps an undated section as a single entry', () => {
    expect(splitIntoEntries(['Some line', 'Another line'])).toHaveLength(1);
  });
});

describe('parseExperienceEntry', () => {
  it('reads position, company, dates and achievements', () => {
    const entry = parseExperienceEntry([
      'Software Developer, Acme Ltd | Jan 2023 - Present',
      '• Reduced load time by 40%',
      '• Mentored two juniors',
    ]);

    expect(entry.position).toBe('Software Developer');
    expect(entry.company).toBe('Acme Ltd');
    expect(entry.startDate).toBe('2023-01');
    expect(entry.isCurrent).toBe(true);
    expect(entry.achievements).toEqual(['Reduced load time by 40%', 'Mentored two juniors']);
  });

  it('reads a company given on the following line', () => {
    const entry = parseExperienceEntry(['Software Developer  Jan 2023 - Dec 2024', 'Acme Ltd']);

    expect(entry.position).toBe('Software Developer');
    expect(entry.company).toBe('Acme Ltd');
    expect(entry.endDate).toBe('2024-12');
  });

  // The date text must not be left inside the job title.
  it('removes the date text from the position', () => {
    const entry = parseExperienceEntry(['Developer | Jan 2023 - Present']);
    expect(entry.position).not.toMatch(/2023/);
  });
});

describe('parseEducationEntry', () => {
  it('splits a qualification into degree and field', () => {
    const entry = parseEducationEntry(['BSc Computer Science, Tribhuvan University | 2021 - 2025']);

    expect(entry.degree).toBe('BSc');
    expect(entry.fieldOfStudy).toBe('Computer Science');
    expect(entry.institution).toBe('Tribhuvan University');
    expect(entry.startDate).toBe('2021-01');
  });

  it('reads a grade line', () => {
    const entry = parseEducationEntry(['BCA, Tribhuvan University | 2021 - 2025', 'GPA: 3.8']);
    expect(entry.grade).toBe('3.8');
  });
});

describe('parseSkills', () => {
  it('splits a comma-separated line', () => {
    const skills = parseSkills(['JavaScript, React, Node.js']);

    expect(skills.map((s) => s.name)).toEqual(['JavaScript', 'React', 'Node.js']);
    expect(skills[0].level).toBe('Intermediate');
  });

  it('drops a category label', () => {
    expect(parseSkills(['Languages: JavaScript, Python']).map((s) => s.name)).toEqual([
      'JavaScript',
      'Python',
    ]);
  });

  it('reads a level in brackets', () => {
    const skills = parseSkills(['JavaScript (Advanced), Python (Beginner)']);

    expect(skills[0]).toEqual({ name: 'JavaScript', level: 'Advanced' });
    expect(skills[1]).toEqual({ name: 'Python', level: 'Beginner' });
  });

  it('removes duplicates regardless of case', () => {
    expect(parseSkills(['React, react, REACT'])).toHaveLength(1);
  });

  it('handles bullets', () => {
    expect(parseSkills(['• JavaScript', '• Python']).map((s) => s.name)).toEqual([
      'JavaScript',
      'Python',
    ]);
  });
});

describe('parseLanguages', () => {
  it('reads a proficiency in brackets', () => {
    expect(parseLanguages(['English (Fluent)'])[0]).toEqual({
      language: 'English',
      proficiency: 'Fluent',
    });
  });

  it('reads a dash-separated proficiency', () => {
    expect(parseLanguages(['Nepali - Native'])[0]).toEqual({
      language: 'Nepali',
      proficiency: 'Native',
    });
  });
});

describe('parseCVText end to end', () => {
  const sample = `
    JANE DOE
    Software Developer
    jane.doe@example.com | +977 9801234567 | github.com/janedoe

    PROFILE
    Developer with three years of experience building web applications.

    WORK EXPERIENCE
    Software Developer, Acme Ltd | Jan 2023 - Present
    • Reduced page load time by 40%
    • Mentored two junior developers

    Junior Developer, Beta Systems | Jun 2021 - Dec 2022
    • Built an internal reporting tool

    EDUCATION
    BCA Computer Application, Tribhuvan University | 2018 - 2022
    GPA: 3.7

    TECHNICAL SKILLS
    JavaScript, React, Node.js, MongoDB

    LANGUAGES
    English (Fluent), Nepali (Native)
  `;

  const result = parseCVText(sample);

  it('reads the personal details', () => {
    expect(result.personal.fullName).toBe('JANE DOE');
    expect(result.personal.headline).toBe('Software Developer');
    expect(result.personal.email).toBe('jane.doe@example.com');
    expect(result.personal.github).toContain('github.com/janedoe');
  });

  it('reads the summary', () => {
    expect(result.summary).toContain('three years of experience');
  });

  it('reads both roles in order', () => {
    expect(result.experience).toHaveLength(2);
    expect(result.experience[0].company).toBe('Acme Ltd');
    expect(result.experience[0].isCurrent).toBe(true);
    expect(result.experience[1].company).toBe('Beta Systems');
    expect(result.experience[1].endDate).toBe('2022-12');
  });

  it('reads the education entry', () => {
    expect(result.education).toHaveLength(1);
    expect(result.education[0].institution).toBe('Tribhuvan University');
    expect(result.education[0].grade).toBe('3.7');
  });

  it('reads the skills and languages', () => {
    expect(result.skills.map((s) => s.name)).toContain('MongoDB');
    expect(result.languages).toHaveLength(2);
  });

  it('reports which sections it found', () => {
    expect(result.stats.sectionsFound).toEqual(
      expect.arrayContaining(['summary', 'experience', 'education', 'skills', 'languages']),
    );
  });

  it('does not throw on empty input', () => {
    const empty = parseCVText('');
    expect(empty.experience).toEqual([]);
    expect(empty.personal.fullName).toBe('');
  });

  it('does not throw on unstructured input', () => {
    const messy = parseCVText('just some words with no structure at all');
    expect(messy.stats.sectionsFound).toEqual([]);
  });
});
