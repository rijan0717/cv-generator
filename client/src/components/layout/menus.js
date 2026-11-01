/**
 * The header's dropdown menus.
 *
 * Kept as data in one file because three places read them: the dropdowns on
 * a wide screen, the stacked list in the mobile drawer, and the footer,
 * which groups the same destinations into columns. Three hand-written
 * copies would drift the first time a page is renamed.
 *
 * Every entry carries a line explaining what it is for. The names of our
 * own tools — "Rewrite for a job", "Score my CV" — mean nothing to a
 * visitor who has not used the site, and the description is what turns the
 * menu into something that can be read rather than explored.
 *
 * Most entries point at a page under `/features/`, not at the tool itself.
 * The tools are behind a login, and sending somebody who is still deciding
 * whether to sign up to a login form answers a question they have not
 * asked yet. The two exceptions are the job board and the blog, which are
 * public in their own right and are their own best advertisement.
 */

/** For somebody looking for work. The larger audience, so it comes first. */
export const GET_HIRED_MENU = [
  {
    to: '/features/cv-builder',
    label: 'Build a CV',
    description: 'Fill in each section and watch an A4 preview update as you type.',
    icon: 'build',
  },
  {
    to: '/features/templates',
    label: 'CV templates',
    description: 'Forty designs, from strictly ATS-friendly to bold and creative.',
    icon: 'templates',
  },
  {
    to: '/features/rewrite',
    label: 'Rewrite for a job',
    description: 'Paste an advert and your CV is rewritten to speak its language.',
    icon: 'spark',
  },
  {
    to: '/jobs',
    label: 'Browse jobs',
    description: 'Every open post, with a match score against your own CV.',
    icon: 'jobs',
  },
];

/** For somebody doing the hiring. */
export const HIRE_TALENT_MENU = [
  {
    to: '/features/post-a-job',
    label: 'Post a job',
    description: 'List a role and collect applications in one place.',
    icon: 'company',
  },
  {
    to: '/features/find-candidates',
    label: 'Find candidates',
    description: 'Search job seekers by industry, availability and experience.',
    icon: 'talent',
  },
  {
    to: '/features/applicant-tracking',
    label: 'Track applicants',
    description: 'Move each application from submitted through to shortlisted.',
    icon: 'match',
  },
];

/** Everything that is neither of the two: reading and practice. */
export const EXPLORE_MENU = [
  {
    to: '/features/interview-prep',
    label: 'Interview prep',
    description: 'Practice questions and timed exams for 700 job titles.',
    icon: 'practice',
  },
  {
    to: '/features/cv-score',
    label: 'Score my CV',
    description: 'A mark out of 100, and a list of what to fix first.',
    icon: 'score',
  },
  {
    to: '/blog',
    label: 'Blog',
    description: 'Writing on CVs, applications and getting through screening.',
    icon: 'blog',
  },
];

/** The three menus, in the order they sit across the header. */
export const HEADER_MENUS = [
  { label: 'Get hired', items: GET_HIRED_MENU },
  { label: 'Hire talent', items: HIRE_TALENT_MENU },
  { label: 'Explore', items: EXPLORE_MENU },
];

/** Small inline icons, matching how the sidebar does them. */
export const MENU_ICONS = {
  build: 'M6 2h7l5 5v15H6z M13 2v5h5',
  templates: 'M4 4h7v16H4z M13 4h7v7h-7z M13 13h7v7h-7z',
  spark:
    'M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z',
  score:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  jobs: 'M3 7h18v13H3z M8 7V4h8v3',
  talent:
    'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 20a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M18 20a6 6 0 0 0-1-3',
  company: 'M3 21h18 M5 21V7l7-4 7 4v14 M10 12h4M10 16h4',
  practice:
    'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8',
  blog: 'M4 4h13v16H6a2 2 0 0 1-2-2z M17 8h3v10a2 2 0 0 1-2 2 M8 8h5 M8 12h5 M8 16h5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9a2.5 2.5 0 1 1 3 2.5V13 M12 16.5v.5',
  match: 'M4 12h6m4 0h6 M10 8l4 4-4 4',
};
