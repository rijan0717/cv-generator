/**
 * The word lists the CV reader matches against.
 *
 * Kept together so the vocabulary can be extended in one place, without
 * reading the parsing code that uses it.
 */

/**
 * Words that identify each section. The parser matches a heading against
 * these, so "Work History", "Employment" and "Professional Experience" all
 * map to `experience`.
 */
export const SECTION_SYNONYMS = {
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
export const BULLET_MARKERS = /^[•●▪‣⁃·*\-–—>]\s+/;

/** Month names and their abbreviations, for date parsing. */
export const MONTHS = {
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
export const PRESENT_WORDS = ['present', 'current', 'now', 'ongoing', 'to date', 'till date'];

/** Skill levels the CV model accepts, lowercased for matching. */
export const LEVEL_WORDS = {
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
 * Words that appear in job titles but not in company names.
 *
 * Used only to tell which of two lines is the role, so it does not need to be
 * exhaustive: when nothing matches, the parser falls back to the usual order.
 */
export const ROLE_WORDS = [
  'engineer',
  'developer',
  'specialist',
  'manager',
  'analyst',
  'designer',
  'consultant',
  'intern',
  'trainee',
  'officer',
  'assistant',
  'associate',
  'administrator',
  'architect',
  'executive',
  'coordinator',
  'director',
  'supervisor',
  'technician',
  'lead',
  'head',
  'tester',
  'accountant',
  'teacher',
  'nurse',
  'scientist',
  'writer',
  'marketer',
  'programmer',
];
