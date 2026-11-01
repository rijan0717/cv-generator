/**
 * The public page behind every entry in the header menus.
 *
 * Each menu entry used to point straight at the tool, and most of the
 * tools are behind a login — so a visitor exploring the menu was thrown at
 * the login form before being told what they were signing up for. These
 * are the pages that answer that first.
 *
 * They are **data, not components**, for the same reason the menus are:
 * eight pages written as eight files drift apart by the third edit, and
 * the shape below is the thing that keeps them one family. Anything a page
 * genuinely cannot express in this shape belongs in its own component
 * rather than as a new optional field here.
 *
 * Every figure quoted is one that can be checked in the code: forty
 * templates in the registry, 700 positions in `builtInPositions.json`,
 * three export formats. Nothing here is an invented statistic.
 *
 * @typedef {object} Feature
 * @property {string} slug        - The URL, under /features/.
 * @property {string} menu        - The menu it belongs to, for the eyebrow.
 * @property {string} eyebrow     - The small line above the title.
 * @property {string} title       - The headline, in two parts.
 * @property {string} highlight   - The part of the headline that takes the gradient.
 * @property {string} intro       - One paragraph under the headline.
 * @property {{to: string, label: string}} primary   - The main call to action.
 * @property {{to: string, label: string}} secondary - The quieter one.
 * @property {Array<{value: number, suffix?: string, label: string}>} stats
 * @property {Array<{title: string, detail: string, icon: string}>} points
 * @property {Array<{title: string, detail: string}>} steps
 * @property {string} closing     - The line above the final call to action.
 */

/** @type {Feature[]} */
export const FEATURES = [
  // --- Get hired ----------------------------------------------------------
  {
    slug: 'cv-builder',
    menu: 'Get hired',
    eyebrow: 'The builder',
    title: 'Write your CV once,',
    highlight: 'use it everywhere',
    intro:
      'A section-by-section form with an A4 preview beside it that updates as you type. No layout to fight, no page breaks to nudge — you write the content and the template does the rest.',
    primary: { to: '/register', label: 'Start my CV' },
    secondary: { to: '/features/templates', label: 'See the templates' },
    stats: [
      { value: 9, label: 'sections, each optional' },
      { value: 3, label: 'export formats' },
      { value: 0, suffix: '', label: 'cost, with no watermark' },
    ],
    points: [
      {
        icon: 'build',
        title: 'Every section a CV needs',
        detail:
          'Personal details, summary, education, experience, skills, projects, certifications, languages and references. Add, remove and reorder entries in any of them.',
      },
      {
        icon: 'spark',
        title: 'It saves while you think',
        detail:
          'Autosave runs about a second and a half after you stop typing, and the status line says "Saving…" then "Saved" so you never have to wonder.',
      },
      {
        icon: 'templates',
        title: 'A real A4 preview',
        detail:
          'Not an approximation: 210 × 297 mm, with the page breaks the PDF will actually have. What you see is what downloads.',
      },
      {
        icon: 'score',
        title: 'Caught before you send it',
        detail:
          'End dates before start dates, malformed emails, a summary that has run long — the builder points them out as you go.',
      },
    ],
    steps: [
      { title: 'Pick a template', detail: 'It opens pre-filled with sample content to type over.' },
      { title: 'Fill in your details', detail: 'Or import the CV you already have as a file.' },
      { title: 'Check the score', detail: 'A mark out of 100 and a list of what to improve.' },
      { title: 'Download it', detail: 'PDF, Word or Excel, named after you and the CV.' },
    ],
    closing: 'Your first CV takes about fifteen minutes.',
  },

  {
    slug: 'templates',
    menu: 'Get hired',
    eyebrow: 'The designs',
    title: 'Forty templates,',
    highlight: 'one set of content',
    intro:
      'Switch template whenever you like and your content comes with you. Every design reads the same CV and the same settings, so changing your mind costs a click rather than an evening.',
    primary: { to: '/register', label: 'Browse the templates' },
    secondary: { to: '/features/cv-builder', label: 'How the builder works' },
    stats: [
      { value: 40, label: 'templates' },
      { value: 5, label: 'categories' },
      { value: 12, label: 'fonts to choose from' },
    ],
    points: [
      {
        icon: 'templates',
        title: 'Five categories',
        detail:
          'Professional, Modern, Creative, Simple and strictly ATS-friendly. Filter by category, by whether it uses a photo, and by one or two columns.',
      },
      {
        icon: 'score',
        title: 'ATS-friendly, properly',
        detail:
          'The ATS designs are single column with no graphics, no tables and plain headings — the shape screening software reads without losing half of it.',
      },
      {
        icon: 'spark',
        title: 'Yours to adjust',
        detail:
          'Primary colour, background, text colour, body and heading fonts, size, spacing, which sections show and in what order. Saved per CV.',
      },
      {
        icon: 'build',
        title: 'Live thumbnails, not pictures',
        detail:
          'Every card in the gallery is the real template rendering a sample CV, so a thumbnail can never drift from what you actually get.',
      },
    ],
    steps: [
      { title: 'Open the gallery', detail: 'On its own page, or in the editor beside your CV.' },
      { title: 'Filter to what suits', detail: 'By category, photo or column count.' },
      { title: 'Preview it large', detail: 'With the sample CV, or with your own.' },
      { title: 'Use it', detail: 'Your content moves across; the palette comes with the design.' },
    ],
    closing: 'A designer, an accountant and a graduate need different CVs.',
  },

  {
    slug: 'rewrite',
    menu: 'Get hired',
    eyebrow: 'The rewrite',
    title: 'One CV, rewritten for',
    highlight: 'every job you want',
    intro:
      'Paste the advert and your CV comes back speaking its language. Every fact stays exactly as you wrote it — only the phrasing moves — and you approve each change before anything is kept.',
    primary: { to: '/register', label: 'Rewrite my CV' },
    secondary: { to: '/features/cv-score', label: 'Score it first' },
    stats: [
      { value: 100, suffix: '%', label: 'of changes shown before saving' },
      { value: 0, label: 'facts invented' },
      { value: 1, label: 'new CV, original untouched' },
    ],
    points: [
      {
        icon: 'spark',
        title: 'Your facts stay yours',
        detail:
          'Dates, employers, job titles and numbers are never changed. The rewrite works on how a bullet is said, not on what it claims.',
      },
      {
        icon: 'match',
        title: 'Line by line',
        detail:
          'The review screen puts each rewritten line beside the original with the words that changed marked. Keep it, edit it, or reject it.',
      },
      {
        icon: 'score',
        title: 'Before and after',
        detail:
          'The match score against that advert is recalculated on the draft, so you can see whether the rewrite actually helped.',
      },
      {
        icon: 'build',
        title: 'Saved as a new CV',
        detail:
          'One CV per role, all kept side by side in My CVs. The CV you started from is never modified.',
      },
    ],
    steps: [
      { title: 'Paste the advert', detail: 'The whole thing, requirements included.' },
      { title: 'Read the draft', detail: 'Each change beside the line it replaces.' },
      { title: 'Keep what you like', detail: 'Reject anything that does not sound like you.' },
      { title: 'Save and apply', detail: 'Download it, or apply with it here.' },
    ],
    closing: 'The same CV rarely fits two adverts equally well.',
  },

  // --- Hire talent --------------------------------------------------------
  {
    slug: 'post-a-job',
    menu: 'Hire talent',
    eyebrow: 'For employers',
    title: 'Post a role and see',
    highlight: 'who actually fits',
    intro:
      'List a job under your company and collect every application in one place, each one carrying the CV exactly as it was submitted.',
    primary: { to: '/register', label: 'Create an employer account' },
    secondary: { to: '/jobs', label: 'See the board' },
    stats: [
      { value: 1, label: 'place for every application' },
      { value: 5, label: 'application states' },
      { value: 2, label: 'download formats per CV' },
    ],
    points: [
      {
        icon: 'company',
        title: 'A verified company',
        detail:
          'Register your company with its registration number and document. An administrator approves it before your posts appear on the public board.',
      },
      {
        icon: 'jobs',
        title: 'The post itself',
        detail:
          'Title, description, location, job type, work mode, salary range, skills and a closing date. Edit or withdraw it whenever you like.',
      },
      {
        icon: 'match',
        title: 'Applications, tracked',
        detail:
          'Move each one from submitted through reviewed, shortlisted or rejected. The applicant sees where they stand.',
      },
      {
        icon: 'score',
        title: 'The CV as it was sent',
        detail:
          'Each application stores a frozen copy of the CV. If the candidate edits theirs afterwards, what you received does not change.',
      },
    ],
    steps: [
      { title: 'Register your company', detail: 'With its details and registration document.' },
      { title: 'Wait for approval', detail: 'An administrator checks it before you can post.' },
      { title: 'Write the post', detail: 'It goes on the public board immediately.' },
      { title: 'Work through applicants', detail: 'Read, shortlist, and download the CVs.' },
    ],
    closing: 'Posting is free while the board is finding its feet.',
  },

  {
    slug: 'find-candidates',
    menu: 'Hire talent',
    eyebrow: 'For employers',
    title: 'Search the people,',
    highlight: 'not just the applications',
    intro:
      'A directory of job seekers who have said they are open to work, each with the CV they have chosen to show. Approved employers can read it without waiting for anyone to apply.',
    primary: { to: '/register', label: 'Create an employer account' },
    secondary: { to: '/features/post-a-job', label: 'Post a job instead' },
    stats: [
      { value: 4, label: 'ways to narrow the list' },
      { value: 1, label: 'primary CV per person' },
      { value: 0, label: 'cold outreach required' },
    ],
    points: [
      {
        icon: 'talent',
        title: 'Filter to the shortlist',
        detail:
          'By industry, employment type, whether they are open to work, and free-text search across their position and summary.',
      },
      {
        icon: 'build',
        title: 'Their chosen CV',
        detail:
          'Each profile shows the CV that person has marked primary — the one they want employers to read, not a half-finished draft.',
      },
      {
        icon: 'company',
        title: 'Approved employers only',
        detail:
          'The directory is closed to anyone whose company has not been approved. Candidates are not a public list.',
      },
      {
        icon: 'match',
        title: 'Straight to a conversation',
        detail: 'Find someone who fits and invite them to the role rather than waiting for them.',
      },
    ],
    steps: [
      { title: 'Get your company approved', detail: 'The same check as posting a job.' },
      { title: 'Filter the directory', detail: 'Industry, availability, employment type.' },
      { title: 'Read their CV', detail: 'The one they have put forward.' },
      { title: 'Invite them to apply', detail: 'With a role you have already posted.' },
    ],
    closing: 'The best candidate may not have seen your advert.',
  },

  {
    slug: 'applicant-tracking',
    menu: 'Hire talent',
    eyebrow: 'For employers',
    title: 'Every application,',
    highlight: 'in one list',
    intro:
      'No inbox archaeology. Each post keeps its own applicants, each applicant keeps their status, and the CV you were sent stays exactly as it was sent.',
    primary: { to: '/register', label: 'Create an employer account' },
    secondary: { to: '/features/post-a-job', label: 'How posting works' },
    stats: [
      { value: 5, label: 'states, from submitted to rejected' },
      { value: 2, label: 'formats to download' },
      { value: 1, label: 'frozen snapshot per application' },
    ],
    points: [
      {
        icon: 'match',
        title: 'A clear status',
        detail:
          'Submitted, reviewed, shortlisted, rejected — or withdrawn, which only the applicant can do. Both sides see the same word.',
      },
      {
        icon: 'build',
        title: 'Open the CV in a tab',
        detail:
          'Read it without losing your place in the list, and download it as a PDF or a Word file when you want to share it.',
      },
      {
        icon: 'spark',
        title: 'A note to yourself',
        detail:
          'Each application carries an employer note, so why you shortlisted someone in March still makes sense in May.',
      },
      {
        icon: 'jobs',
        title: 'Per post, not per inbox',
        detail: 'Applicants hang off the advert they answered, so two open roles never get mixed.',
      },
    ],
    steps: [
      { title: 'Open a post', detail: 'Its applicants are a tab on the post itself.' },
      { title: 'Read the CV', detail: 'As submitted, in a new tab.' },
      { title: 'Move the status', detail: 'Reviewed, shortlisted or rejected.' },
      { title: 'Leave a note', detail: 'For whoever picks it up next, including you.' },
    ],
    closing: 'Hiring is a list, not a thread.',
  },

  // --- Explore ------------------------------------------------------------
  {
    slug: 'cv-score',
    menu: 'Explore',
    eyebrow: 'The score',
    title: 'Find out what is',
    highlight: 'wrong with your CV',
    intro:
      'A mark out of 100 from a rule-based model, with the reasoning shown: which checks you passed, which you failed, and what to do about each one.',
    primary: { to: '/register', label: 'Score my CV' },
    secondary: { to: '/features/rewrite', label: 'Then rewrite it' },
    stats: [
      { value: 100, label: 'points available' },
      { value: 40, label: 'for completeness' },
      { value: 60, label: 'for content quality' },
    ],
    points: [
      {
        icon: 'score',
        title: 'Completeness, 40 points',
        detail:
          'Contact details, a photo where the template uses one, a summary, at least one education entry, experience or projects, and at least five skills.',
      },
      {
        icon: 'spark',
        title: 'Content quality, 60 points',
        detail:
          'Summary length, action verbs in your descriptions, achievements with numbers in them, valid email and phone formats, and dates that agree with each other.',
      },
      {
        icon: 'match',
        title: 'Not a black box',
        detail:
          'Every weight and threshold lives in one configuration file. The breakdown shows each criterion, what it was worth and whether you passed it.',
      },
      {
        icon: 'build',
        title: 'Kept up to date',
        detail:
          'The score is recalculated on every save, so My CVs always shows where each one stands.',
      },
    ],
    steps: [
      { title: 'Write or import a CV', detail: 'A part-finished one still scores.' },
      { title: 'Read the breakdown', detail: 'Criterion by criterion, with the points.' },
      {
        title: 'Fix the cheap ones first',
        detail: 'The suggestions are ordered by what they are worth.',
      },
      { title: 'Watch it climb', detail: 'It recalculates every time you save.' },
    ],
    closing: 'Most CVs lose easy points before anyone reads a word.',
  },

  {
    slug: 'interview-prep',
    menu: 'Explore',
    eyebrow: 'Practice',
    title: 'Practise the interview',
    highlight: 'before you sit it',
    intro:
      'Study questions and timed mock exams for 700 job titles, across technology, finance, healthcare, trades, education and more. Every answer is explained, so you learn the reasoning rather than the answer.',
    primary: { to: '/register', label: 'Start practising' },
    secondary: { to: '/features/cv-score', label: 'Check my CV first' },
    stats: [
      { value: 700, label: 'job titles' },
      { value: 14, label: 'industry categories' },
      { value: 3, label: 'levels: junior, mid, senior' },
    ],
    points: [
      {
        icon: 'practice',
        title: 'Study mode',
        detail:
          'One question per card with the correct answer and the explanation visible. Read it through before you test yourself.',
      },
      {
        icon: 'score',
        title: 'Timed exams',
        detail:
          'A paper drawn from the pool, spread across topics so one subject cannot dominate, with a pass mark and an optional clock.',
      },
      {
        icon: 'match',
        title: 'Marked, with reasons',
        detail:
          'Afterwards you get the score, the breakdown by topic and the full review — including why the answer you chose was wrong.',
      },
      {
        icon: 'spark',
        title: 'Technique as well as fact',
        detail:
          'A shared bank of competency questions runs under every role: handling disagreement, admitting a mistake, the STAR method.',
      },
    ],
    steps: [
      { title: 'Search for your role', detail: 'Or something close to it — 700 to choose from.' },
      { title: 'Pick a level', detail: 'Junior, mid or senior.' },
      { title: 'Study, then sit it', detail: 'Read the explanations, then take the paper.' },
      { title: 'Review what you missed', detail: 'By topic, so you know what to go back to.' },
    ],
    closing: 'The questions are rarely a surprise. The answers often are.',
  },
];

/** Quick lookup by slug, for the route. */
const BY_SLUG = new Map(FEATURES.map((feature) => [feature.slug, feature]));

/**
 * Finds one feature page.
 * @param {string} slug - From the URL.
 * @returns {Feature|undefined} Undefined for an unknown slug, which the
 *   route turns into the not-found page rather than an empty layout.
 */
export function getFeature(slug) {
  return BY_SLUG.get(slug);
}
