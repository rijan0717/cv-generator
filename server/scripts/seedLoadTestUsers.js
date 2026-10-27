/**
 * Fills the database with realistic test accounts so the system can be
 * load and performance tested.
 *
 * The admin dashboard, the CV list and the reports all behave differently
 * with two hundred documents than they do with three, and a page that
 * feels instant while developing can be the slow one in the viva demo.
 * This script creates enough data to measure that honestly: users spread
 * over the past year, CVs of deliberately mixed quality so strength
 * scores form a distribution rather than a spike, activity so the charts
 * have something to draw, and job-match analyses run through the real
 * analyser rather than invented.
 *
 * Every account it creates uses the domain `@loadtest.local`. Nothing
 * else in the project uses that domain, which is what makes `--clear`
 * safe: it can only ever remove data this script put there.
 *
 * All accounts share one password (`--password`, default `LoadTest123`)
 * because a load-testing tool has to be able to log them in. The e-mail
 * addresses are random, as asked, so they are written to a CSV file that
 * k6, JMeter or Artillery can read as its user pool.
 *
 * Usage:
 *   npm run seed:loadtest                      # 100 users, default settings
 *   npm run seed:loadtest -- --users 500       # a bigger run
 *   npm run seed:loadtest -- --clear           # remove the previous run first
 *   npm run seed:loadtest -- --only-clear      # remove and stop
 *   npm run seed:loadtest -- --max-cvs 5 --matches 2
 *   npm run seed:loadtest -- --jobs 300 --reviews 40
 *   npm run seed:loadtest -- --jobs 0 --reviews 0   # users and CVs only
 *   npm run seed:loadtest -- --seed 7          # a different random draw
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { CV } from '../src/models/CV.js';
import { Company } from '../src/models/Company.js';
import { Job } from '../src/models/Job.js';
import { JobMatch } from '../src/models/JobMatch.js';
import { ActivityLog } from '../src/models/ActivityLog.js';
import { Review } from '../src/models/Review.js';
import { analyseMatch, scoreJobsAgainstCV } from '../src/algorithms/jobMatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The marker that identifies seeded accounts.
 *
 * `.local` is reserved for local networks, so no real person can ever
 * own one of these addresses, and the whole set can be found with a
 * single suffix query.
 */
const LOADTEST_DOMAIN = 'loadtest.local';

/** bcrypt cost factor. Must match the User model, or the hashes differ in strength. */
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

/**
 * Reads the `--flag value` and `--flag` arguments after the script name.
 *
 * Written by hand rather than with a parsing library: the project's rule
 * is to add dependencies only when they earn their place, and twenty
 * lines here are easier to explain than a package.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {Record<string, string|boolean>} The parsed options.
 */
function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];

    // A flag followed by another flag (or nothing) is a boolean switch.
    if (next === undefined || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return options;
}

/**
 * Reads a whole-number option, falling back when it is absent or invalid.
 * @param {Record<string, string|boolean>} options - Parsed arguments.
 * @param {string} key - Option name.
 * @param {number} fallback - Value to use when it is not given.
 * @returns {number} The parsed number.
 */
function intOption(options, key, fallback) {
  const value = Number(options[key]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/**
 * A small seeded pseudo-random generator (mulberry32).
 *
 * `Math.random()` would do, but then two runs of the script produce two
 * different databases and a performance comparison between them means
 * nothing. With a seed, the same `--seed` always builds the same data,
 * so a before-and-after measurement is comparing like with like.
 *
 * @param {number} seed - Any integer.
 * @returns {() => number} A function returning a float in [0, 1).
 */
function createRandom(seed) {
  let state = seed >>> 0;

  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks one element of an array.
 * @param {() => number} rng - The generator from `createRandom`.
 * @param {Array<*>} items - The array to choose from.
 * @returns {*} One element.
 */
function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Picks `count` different elements of an array (or all of them if the
 * array is shorter).
 * @param {() => number} rng - The generator.
 * @param {Array<*>} items - The array to choose from.
 * @param {number} count - How many are wanted.
 * @returns {Array<*>} The chosen elements, in their original order.
 */
function pickMany(rng, items, count) {
  const copy = [...items];
  const chosen = [];

  while (chosen.length < Math.min(count, items.length)) {
    chosen.push(...copy.splice(Math.floor(rng() * copy.length), 1));
  }

  return chosen;
}

/**
 * Returns a whole number between `min` and `max`, both included.
 * @param {() => number} rng - The generator.
 * @param {number} min - Lowest value.
 * @param {number} max - Highest value.
 * @returns {number} The value.
 */
function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Returns a random date between two dates.
 * @param {() => number} rng - The generator.
 * @param {Date} from - Earliest date.
 * @param {Date} to - Latest date.
 * @returns {Date} The date.
 */
function dateBetween(rng, from, to) {
  return new Date(from.getTime() + rng() * (to.getTime() - from.getTime()));
}

/**
 * Six random hex characters, used to keep generated e-mails unique.
 * @param {() => number} rng - The generator.
 * @returns {string} The token.
 */
function token(rng) {
  return Math.floor(rng() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Source material
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Aarav', 'Anisha', 'Bibek', 'Binita', 'Chirag', 'Deepa', 'Dipesh', 'Elina',
  'Gaurav', 'Ishwor', 'Kritika', 'Manish', 'Nabin', 'Nisha', 'Prabin', 'Pooja',
  'Rajesh', 'Rashmi', 'Sabin', 'Samikshya', 'Sujan', 'Sunita', 'Tenzing',
  'Ujjwal', 'Yamuna', 'Daniel', 'Emily', 'Hannah', 'Jacob', 'Laura', 'Marcus',
  'Olivia', 'Priya', 'Rachel', 'Thomas',
];

const LAST_NAMES = [
  'Acharya', 'Adhikari', 'Basnet', 'Bhattarai', 'Chaudhary', 'Dahal', 'Dangol',
  'Ghimire', 'Gurung', 'Joshi', 'Karki', 'Khadka', 'Lama', 'Maharjan', 'Nepal',
  'Oli', 'Pandey', 'Pariyar', 'Poudel', 'Rai', 'Regmi', 'Sharma', 'Shrestha',
  'Tamang', 'Thapa', 'Bennett', 'Clarke', 'Foster', 'Hughes', 'Patel',
];

const CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Biratnagar', 'Butwal',
  'Chitwan', 'Dharan', 'Nepalgunj', 'Hetauda',
];

const INSTITUTIONS = [
  'Tribhuvan University', 'Kathmandu University', 'Pokhara University',
  'Purbanchal University', 'Islington College', 'Herald College Kathmandu',
  'St. Xavier’s College', 'Nepal College of Information Technology',
];

const TEMPLATE_KEYS = [
  'classic', 'modern', 'minimal', 'creative', 'ats',
  'executive', 'banner', 'monogram', 'formal', 'editorial', 'compact',
];

const FONT_FAMILIES = ['Inter', 'Roboto', 'Lato', 'Merriweather', 'Source Sans 3', 'Poppins'];
const THEME_PRESETS = ['slate', 'ocean', 'forest', 'plum', 'ember'];
const PRIMARY_COLOURS = ['#0f172a', '#1d4ed8', '#047857', '#b45309', '#7c3aed', '#be123c'];

/**
 * Career archetypes.
 *
 * Nine fields rather than nine variations on "developer", because the
 * point of the data is variety: the strength scorer and the match
 * analyser should produce a spread of results, and they only do that if
 * the CVs genuinely differ. These line up with the adverts in
 * `seedJobs.js`, so seeded job matches come out sensibly rather than all
 * scoring the same.
 */
const PROFILES = [
  {
    field: 'Backend Development',
    headlines: ['Backend Developer', 'Node.js Developer', 'API Engineer'],
    degrees: ['BSc Computer Science', 'BE Computer Engineering', 'BCA'],
    fieldsOfStudy: ['Computer Science', 'Software Engineering', 'Information Technology'],
    companies: ['Leapfrog Technology', 'Cotiviti Nepal', 'Fusemachines', 'Verisk Nepal'],
    positions: ['Backend Developer', 'Junior Backend Engineer', 'Software Engineer'],
    skills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'Docker', 'Git', 'PostgreSQL', 'AWS'],
    summary:
      'Backend developer with experience designing and building REST APIs in Node.js and ' +
      'Express. Comfortable modelling data in MongoDB, writing unit tests and deploying ' +
      'containerised services. Reduced average API response time by 40% on the main product.',
    duties: [
      'Developed and maintained REST APIs in Node.js and Express serving over 20,000 requests per day.',
      'Designed MongoDB schemas and indexes, cutting the slowest report query from 4s to 300ms.',
      'Containerised three services with Docker and automated deployment through the CI pipeline.',
      'Wrote unit and integration tests, raising coverage of the payments module from 35% to 85%.',
    ],
    projects: [
      { name: 'Inventory API', technologies: ['Node.js', 'Express', 'MongoDB'] },
      { name: 'Notification Service', technologies: ['Node.js', 'Redis', 'Docker'] },
    ],
    certifications: ['AWS Certified Cloud Practitioner', 'MongoDB Associate Developer'],
  },
  {
    field: 'Frontend Development',
    headlines: ['Frontend Developer', 'React Developer', 'UI Engineer'],
    degrees: ['BSc Computer Science', 'BIT', 'BCA'],
    fieldsOfStudy: ['Computer Science', 'Information Technology'],
    companies: ['Yarsa Labs', 'Deerwalk', 'Browser Nepal', 'Treeleaf Technologies'],
    positions: ['Frontend Developer', 'React Developer', 'UI Developer'],
    skills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS', 'Git', 'Figma'],
    summary:
      'Frontend developer building responsive, accessible interfaces with React and Tailwind ' +
      'CSS. Turned a 6-second first paint into 1.8 seconds by code splitting and image ' +
      'optimisation. Works closely with designers and writes component tests.',
    duties: [
      'Built 30+ reusable React components used across three internal products.',
      'Improved Lighthouse performance score from 58 to 94 through code splitting and lazy loading.',
      'Implemented keyboard navigation and ARIA labels, bringing the dashboard to WCAG AA.',
      'Converted Figma designs into pixel-accurate responsive layouts for mobile and desktop.',
    ],
    projects: [
      { name: 'Analytics Dashboard', technologies: ['React', 'Recharts', 'Tailwind CSS'] },
      { name: 'Portfolio Builder', technologies: ['React', 'Vite', 'TypeScript'] },
    ],
    certifications: ['Meta Front-End Developer', 'freeCodeCamp Responsive Web Design'],
  },
  {
    field: 'Full Stack Development',
    headlines: ['Full Stack Developer', 'MERN Developer', 'Software Engineer'],
    degrees: ['BSc CSIT', 'BE Software Engineering', 'BCA'],
    fieldsOfStudy: ['Computer Science', 'Software Engineering'],
    companies: ['Logpoint Nepal', 'Javra Software', 'Vairav Technology', 'eSewa'],
    positions: ['Full Stack Developer', 'Software Engineer', 'Associate Engineer'],
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Git', 'Docker', 'REST API'],
    summary:
      'Full stack developer who owns features from database to interface across MERN ' +
      'applications. Delivered 12 features end to end last year and mentored two interns. ' +
      'Values readable code and clear written handovers.',
    duties: [
      'Delivered end-to-end features across React, Express and MongoDB for a product with 5,000 users.',
      'Replaced a legacy jQuery module with React, reducing reported interface bugs by 60%.',
      'Introduced ESLint and Prettier to the team, eliminating style debate in code review.',
      'Mentored two interns through their first production releases.',
    ],
    projects: [
      { name: 'Smart CV Generator', technologies: ['React', 'Node.js', 'MongoDB'] },
      { name: 'Expense Tracker', technologies: ['React', 'Express', 'Chart.js'] },
    ],
    certifications: ['Meta Full-Stack Engineer', 'Scrum Fundamentals Certified'],
  },
  {
    field: 'Quality Assurance',
    headlines: ['QA Engineer', 'Software Tester', 'Test Automation Engineer'],
    degrees: ['BSc Computer Science', 'BCA', 'BIT'],
    fieldsOfStudy: ['Computer Science', 'Information Technology'],
    companies: ['Cotiviti Nepal', 'CloudFactory', 'Deerwalk', 'Verisk Nepal'],
    positions: ['QA Engineer', 'Junior QA Analyst', 'Test Engineer'],
    skills: ['Selenium', 'Cypress', 'Postman', 'Test Automation', 'SQL', 'Jira', 'Git'],
    summary:
      'QA engineer responsible for functional, regression and API testing of a web platform. ' +
      'Automated 180 regression cases in Cypress, cutting the release test cycle from 3 days ' +
      'to 4 hours. Writes defect reports developers can reproduce first time.',
    duties: [
      'Automated 180 regression test cases in Cypress, reducing the release cycle from 3 days to 4 hours.',
      'Tested REST APIs with Postman collections run automatically on every build.',
      'Raised and tracked 400+ defects in Jira, with reproduction steps and severity triage.',
      'Wrote the test plan and sign-off report for four major releases.',
    ],
    projects: [
      { name: 'Regression Suite', technologies: ['Cypress', 'JavaScript'] },
      { name: 'API Test Harness', technologies: ['Postman', 'Newman'] },
    ],
    certifications: ['ISTQB Foundation Level', 'Certified Selenium Tester'],
  },
  {
    field: 'Data Analysis',
    headlines: ['Data Analyst', 'Business Intelligence Analyst', 'Reporting Analyst'],
    degrees: ['BSc Statistics', 'BBA', 'BSc Computer Science'],
    fieldsOfStudy: ['Statistics', 'Data Science', 'Business Administration'],
    companies: ['CloudFactory', 'Fusemachines', 'Nepal Investment Bank', 'Daraz Nepal'],
    positions: ['Data Analyst', 'Junior Analyst', 'MIS Officer'],
    skills: ['SQL', 'Python', 'Excel', 'Power BI', 'Data Analysis', 'Tableau', 'Statistics'],
    summary:
      'Data analyst turning operational data into decisions. Builds SQL models and Power BI ' +
      'dashboards used weekly by the leadership team, and explains what a number means rather ' +
      'than only producing a chart. Identified NPR 2.4m of recoverable revenue leakage.',
    duties: [
      'Wrote SQL models over a 40m row warehouse, powering the weekly leadership dashboard.',
      'Built 9 Power BI dashboards replacing manual spreadsheets, saving roughly 12 hours a week.',
      'Cleaned and analysed campaign data in Python with pandas, identifying NPR 2.4m of leakage.',
      'Ran A/B tests on the checkout flow and reported the result with confidence intervals.',
    ],
    projects: [
      { name: 'Sales Forecast Model', technologies: ['Python', 'pandas', 'scikit-learn'] },
      { name: 'Churn Dashboard', technologies: ['Power BI', 'SQL'] },
    ],
    certifications: ['Google Data Analytics Certificate', 'Microsoft PL-300 Power BI'],
  },
  {
    field: 'DevOps',
    headlines: ['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer'],
    degrees: ['BE Computer Engineering', 'BSc CSIT'],
    fieldsOfStudy: ['Computer Engineering', 'Information Technology'],
    companies: ['Logpoint Nepal', 'Vairav Technology', 'F1Soft International', 'Khalti'],
    positions: ['DevOps Engineer', 'Infrastructure Engineer', 'Systems Engineer'],
    skills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Terraform', 'Git', 'Bash'],
    summary:
      'DevOps engineer looking after build, release and monitoring for a platform of 14 ' +
      'services. Cut deployment time from 45 minutes to 6 and kept uptime above 99.9% across ' +
      'the last four quarters.',
    duties: [
      'Maintained CI/CD pipelines for 14 services, cutting deployment time from 45 minutes to 6.',
      'Managed AWS infrastructure as code with Terraform, reducing monthly spend by 28%.',
      'Ran containerised workloads on Kubernetes with autoscaling and health checks.',
      'Set up monitoring and alerting, and led incident reviews after each outage.',
    ],
    projects: [
      { name: 'Pipeline Rebuild', technologies: ['GitHub Actions', 'Docker', 'AWS'] },
      { name: 'Monitoring Stack', technologies: ['Prometheus', 'Grafana', 'Kubernetes'] },
    ],
    certifications: ['AWS Solutions Architect Associate', 'Certified Kubernetes Administrator'],
  },
  {
    field: 'Design',
    headlines: ['UI/UX Designer', 'Product Designer', 'Visual Designer'],
    degrees: ['Bachelor of Fine Arts', 'BSc Multimedia', 'BBA'],
    fieldsOfStudy: ['Graphic Design', 'Multimedia', 'Human Computer Interaction'],
    companies: ['Yarsa Labs', 'Braindigit', 'Curves n’ Colors', 'Sastodeal'],
    positions: ['UI/UX Designer', 'Junior Designer', 'Product Designer'],
    skills: ['Figma', 'Adobe XD', 'Wireframing', 'Prototyping', 'User Research', 'HTML', 'CSS'],
    summary:
      'Product designer who researches before drawing. Ran 24 usability sessions last year and ' +
      'redesigned an onboarding flow that lifted completion from 46% to 71%. Maintains the ' +
      'team design system in Figma.',
    duties: [
      'Redesigned the onboarding flow after 24 usability sessions, lifting completion from 46% to 71%.',
      'Built and maintained a Figma design system of 120 components used by three squads.',
      'Produced wireframes and high fidelity prototypes for 15 features.',
      'Worked alongside developers through build to keep the released screens faithful to the design.',
    ],
    projects: [
      { name: 'Design System', technologies: ['Figma', 'Storybook'] },
      { name: 'Mobile Banking Concept', technologies: ['Figma', 'Adobe XD'] },
    ],
    certifications: ['Google UX Design Certificate', 'Nielsen Norman UX Foundations'],
  },
  {
    field: 'Marketing',
    headlines: ['Digital Marketing Executive', 'SEO Specialist', 'Content Marketer'],
    degrees: ['BBA', 'BBS', 'Bachelor of Mass Communication'],
    fieldsOfStudy: ['Marketing', 'Business Administration', 'Mass Communication'],
    companies: ['Daraz Nepal', 'Sastodeal', 'Thulo.com', 'Clock b Business Technology'],
    positions: ['Digital Marketing Executive', 'Marketing Associate', 'SEO Executive'],
    skills: [
      'SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing', 'Excel',
    ],
    summary:
      'Digital marketing executive who tests rather than guesses. Grew organic traffic 180% in ' +
      'twelve months and brought cost per acquisition down from NPR 640 to NPR 310 across paid ' +
      'social.',
    duties: [
      'Grew organic search traffic by 180% in twelve months through technical SEO and content.',
      'Reduced cost per acquisition from NPR 640 to NPR 310 by reallocating spend on test results.',
      'Planned and ran email campaigns to a 45,000 subscriber list, averaging a 31% open rate.',
      'Reported channel performance monthly in Google Analytics with recommendations.',
    ],
    projects: [
      { name: 'Content Hub Launch', technologies: ['WordPress', 'Google Analytics'] },
      { name: 'Festival Campaign', technologies: ['Meta Ads', 'Google Ads'] },
    ],
    certifications: ['Google Analytics Certification', 'HubSpot Content Marketing'],
  },
  {
    field: 'Accounting',
    headlines: ['Accounts Officer', 'Assistant Accountant', 'Finance Associate'],
    degrees: ['BBS', 'BBA Finance', 'Bachelor of Commerce'],
    fieldsOfStudy: ['Accounting', 'Finance', 'Commerce'],
    companies: ['Nepal Investment Bank', 'Chaudhary Group', 'Himalayan Bank', 'NIC Asia Bank'],
    positions: ['Accounts Officer', 'Junior Accountant', 'Finance Assistant'],
    skills: ['Excel', 'Accounting', 'Bookkeeping', 'Taxation', 'Financial Reporting', 'Tally'],
    summary:
      'Accounts officer responsible for the books of a 60-staff business. Closes the month in ' +
      'four working days, reconciles 11 bank and supplier accounts and prepares VAT returns ' +
      'without adjustment from the auditor for three years running.',
    duties: [
      'Closed the month end in four working days, down from nine, by rebuilding the reconciliation pack.',
      'Reconciled 11 bank and supplier accounts monthly with zero unexplained differences.',
      'Prepared and filed quarterly VAT returns and supported the annual statutory audit.',
      'Built Excel models with pivot tables and lookups used for monthly management accounts.',
    ],
    projects: [
      { name: 'Month End Automation', technologies: ['Excel', 'Power Query'] },
      { name: 'Fixed Asset Register', technologies: ['Excel', 'Tally'] },
    ],
    certifications: ['ACCA Applied Knowledge', 'Advanced Excel for Finance'],
  },
];

// ---------------------------------------------------------------------------
// Job board source material
// ---------------------------------------------------------------------------

/**
 * Employers the generated adverts are posted under.
 *
 * Several companies rather than one, because the board groups and filters
 * by employer and a hundred and fifty adverts from a single company would
 * not exercise that at all.
 */
const EMPLOYERS = [
  { name: 'Himalaya Digital', industry: 'Software', location: 'Kathmandu' },
  { name: 'Annapurna Systems', industry: 'Information Technology', location: 'Pokhara' },
  { name: 'Everest Analytics', industry: 'Data & Analytics', location: 'Lalitpur' },
  { name: 'Bagmati Solutions', industry: 'Consulting', location: 'Kathmandu' },
  { name: 'Lumbini Finance', industry: 'Financial Services', location: 'Butwal' },
  { name: 'Terai Health Group', industry: 'Healthcare', location: 'Biratnagar' },
  { name: 'Kathmandu Creative', industry: 'Design & Media', location: 'Kathmandu' },
  { name: 'Sagarmatha Retail', industry: 'Retail & E-commerce', location: 'Bhaktapur' },
];

/** Seniority prefixes, which also shape the wording of the advert. */
const SENIORITIES = [
  { label: 'Intern', years: 'no prior experience required', salary: [15000, 25000] },
  { label: 'Junior', years: 'at least one year of experience', salary: [35000, 55000] },
  { label: '', years: 'two to four years of experience', salary: [55000, 85000] },
  { label: 'Senior', years: 'five or more years of experience', salary: [90000, 150000] },
  { label: 'Lead', years: 'significant experience leading a team', salary: [120000, 190000] },
];

const JOB_TYPES = ['Full-time', 'Full-time', 'Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

/**
 * Builds the text of one generated advert.
 *
 * The wording is assembled from the career profile rather than repeated,
 * because the match analyser reads this text: a hundred and fifty copies
 * of the same paragraph would make every match score identical and tell
 * nobody anything. Each advert names its own skills and duties, so the
 * scores across the board genuinely differ.
 *
 * @param {object} profile - One entry from `PROFILES`.
 * @param {object} seniority - One entry from `SENIORITIES`.
 * @param {string[]} skills - The skills this advert asks for.
 * @param {string} companyName - Who is hiring.
 * @returns {string} The advert body.
 */
function buildJobDescription(profile, seniority, skills, companyName) {
  const role = seniority.label ? `${seniority.label.toLowerCase()} role` : 'role';

  return [
    `${companyName} is hiring for a ${role} in ${profile.field.toLowerCase()}.`,
    `We are looking for someone with ${seniority.years}.`,
    'In this position you will:',
    profile.duties.map((duty) => `- ${duty}`).join(' '),
    `The tools and technologies we use day to day include ${skills.join(', ')}.`,
    'You will work in a small team, take part in planning and review, and be expected to',
    'explain your decisions clearly to colleagues who are not specialists.',
    'We offer structured training, a flexible working pattern and a yearly development budget.',
  ].join(' ');
}

/** Short comments used for the seeded testimonials. */
const REVIEW_COMMENTS = [
  'The strength score told me exactly what my CV was missing. Two changes and it jumped 20 points.',
  'Matching my CV against a job advert before applying has saved me a lot of wasted effort.',
  'The templates look professional and the PDF comes out exactly like the preview.',
  'I had no idea my CV was missing so many of the keywords the adverts actually use.',
  'Being able to keep a separate CV for each kind of role is the feature I use most.',
  'Simple to use and the suggestions are specific rather than generic advice.',
  'The ATS-friendly template got me through a screening I had failed twice before.',
  'Good to see which skills I am missing for the roles I want, not just a score.',
  'Autosave means I never lose work. Small thing, but it matters.',
  'The match percentage helped me decide which jobs were worth applying for.',
  'Clear, quick and free. I have recommended it to everyone on my course.',
  'The Excel export made it easy to keep track of what I had sent where.',
  'I like that it explains why the score is what it is instead of just giving a number.',
  'Importing my old Word CV saved me an hour of retyping.',
  'The job board and the matching together are genuinely useful, not a gimmick.',
  'Changed the colours and font to suit the industry I was applying to. Took a minute.',
  'Would like more templates, but the ones here are well designed.',
  'The missing keyword list is the most useful part for me.',
  'Straightforward and does what it says. No complaints.',
  'Helpful for a first CV. The prompts told me what sections I had forgotten.',
  'Used it to tailor my CV for three different roles in an evening.',
  'The preview being an accurate A4 page matters more than I expected.',
  'Scoring is strict but fair, which is the point.',
  'Easy to use on a phone, which I was not expecting.',
];

/** The context line stored with a review, shown under the testimonial. */
const REVIEW_CONTEXTS = [
  'after downloading a PDF',
  'after running a job match',
  'after importing a CV',
  'after building a CV',
];

/** Proficiency pairs used for the languages section. */
const LANGUAGES = [
  { language: 'Nepali', proficiency: 'Native' },
  { language: 'English', proficiency: 'Fluent' },
  { language: 'Hindi', proficiency: 'Conversational' },
  { language: 'Newari', proficiency: 'Conversational' },
];

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

/**
 * How complete a generated CV is.
 *
 * Mixed on purpose. If every seeded CV were complete, the strength score
 * distribution chart on the admin dashboard would be a single bar and a
 * performance test would never exercise the "incomplete CV" paths.
 */
const QUALITY_TIERS = [
  { name: 'full', weight: 50 },
  { name: 'partial', weight: 32 },
  { name: 'sparse', weight: 18 },
];

/**
 * Chooses a quality tier using the weights above.
 * @param {() => number} rng - The generator.
 * @returns {string} The tier name.
 */
function pickQuality(rng) {
  const total = QUALITY_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = rng() * total;

  for (const tier of QUALITY_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier.name;
  }

  return 'full';
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Formats a date as the `YYYY-MM` string the CV sections store.
 * @param {number} year - Four digit year.
 * @param {number} month - 1 to 12.
 * @returns {string} e.g. "2023-07".
 */
function yearMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Builds one user document, ready for `insertMany`.
 *
 * @param {() => number} rng - The generator.
 * @param {string} passwordHash - The shared hash, computed once by the caller.
 * @param {Set<string>} usedEmails - E-mails already issued in this run.
 * @param {{from: Date, to: Date}} registrationWindow - When the account was created.
 * @returns {object} A plain object matching the User schema.
 */
function buildUser(rng, passwordHash, usedEmails, registrationWindow) {
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);

  // The random token is what makes the address unique; the loop is a
  // belt-and-braces guard in case the same token comes up twice.
  let email;
  do {
    email = `${first}.${last}.${token(rng)}@${LOADTEST_DOMAIN}`.toLowerCase();
  } while (usedEmails.has(email));
  usedEmails.add(email);

  const createdAt = dateBetween(rng, registrationWindow.from, registrationWindow.to);

  // About one account in twenty-five is blocked, so the admin user list
  // and the "blocked user cannot log in" path both have real data.
  const status = rng() < 0.04 ? 'blocked' : 'active';

  return {
    name: `${first} ${last}`,
    email,
    passwordHash,
    // The role follows the account type. Written out in full because
    // these documents are inserted in bulk, which skips the model hooks.
    role: 'jobseeker',
    // Job seekers by default; the few who own a company become employers.
    accountType: 'jobseeker',
    avatarUrl: '',
    status,
    lastLoginAt: dateBetween(rng, createdAt, registrationWindow.to),
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * Builds the content of one CV for a given user and career profile.
 *
 * @param {() => number} rng - The generator.
 * @param {object} user - The saved user document.
 * @param {object} profile - One entry from `PROFILES`.
 * @param {string} quality - 'full', 'partial' or 'sparse'.
 * @param {number} index - Which CV this is for the user, from 0.
 * @returns {object} Fields for `new CV(...)`.
 */
function buildCV(rng, user, profile, quality, index) {
  const headline = pick(rng, profile.headlines);
  const city = pick(rng, CITIES);
  const handle = user.name.toLowerCase().replace(/[^a-z]+/g, '');

  // A sparse CV is missing contact details and most sections, which is
  // exactly what the strength scorer should penalise.
  const personal = {
    fullName: user.name,
    headline,
    email: user.email,
    phone: quality === 'sparse' ? '' : `+977 98${intBetween(rng, 10000000, 99999999)}`,
    address: quality === 'sparse' ? '' : `${city}, Nepal`,
    website: quality === 'full' ? `https://${handle}.com.np` : '',
    linkedin: quality === 'sparse' ? '' : `https://linkedin.com/in/${handle}`,
    github: quality === 'full' && rng() < 0.7 ? `https://github.com/${handle}` : '',
    photoUrl: '',
  };

  const graduationYear = intBetween(rng, 2016, 2023);
  const education = [
    {
      institution: pick(rng, INSTITUTIONS),
      degree: pick(rng, profile.degrees),
      fieldOfStudy: pick(rng, profile.fieldsOfStudy),
      startDate: yearMonth(graduationYear - 4, intBetween(rng, 1, 9)),
      endDate: yearMonth(graduationYear, intBetween(rng, 1, 12)),
      grade: `${(2.8 + rng() * 1.1).toFixed(2)} CGPA`,
      description:
        quality === 'full'
          ? `Final year project in ${pick(rng, profile.fieldsOfStudy)}, graded distinction.`
          : '',
    },
  ];

  // The number of roles rises with quality, so experience length is one
  // of the things that separates a strong CV from a weak one.
  const roleCount = quality === 'full' ? intBetween(rng, 2, 3) : quality === 'partial' ? 1 : 0;
  const experience = [];
  let roleEndYear = graduationYear + intBetween(rng, 1, 4);

  for (let i = 0; i < roleCount; i += 1) {
    const years = intBetween(rng, 1, 3);
    const startYear = roleEndYear - years;
    const isCurrent = i === 0;

    experience.push({
      company: pick(rng, profile.companies),
      position: pick(rng, profile.positions),
      location: `${pick(rng, CITIES)}, Nepal`,
      startDate: yearMonth(startYear, intBetween(rng, 1, 12)),
      endDate: isCurrent ? '' : yearMonth(roleEndYear, intBetween(rng, 1, 12)),
      isCurrent,
      description: pickMany(rng, profile.duties, quality === 'full' ? 3 : 1).join(' '),
      achievements: quality === 'full' ? pickMany(rng, profile.duties, 2) : [],
    });

    roleEndYear = startYear;
  }

  const skillCount = quality === 'full' ? intBetween(rng, 6, 8) : quality === 'partial' ? 5 : 3;
  const skills = pickMany(rng, profile.skills, skillCount).map((name) => ({
    name,
    level: pick(rng, SKILL_LEVELS),
  }));

  const projects =
    quality === 'sparse'
      ? []
      : pickMany(rng, profile.projects, quality === 'full' ? 2 : 1).map((project) => ({
          name: project.name,
          role: headline,
          description:
            `Built ${project.name.toLowerCase()} using ${project.technologies.join(', ')}. ` +
            'Designed the data model, implemented the core features and documented the setup.',
          technologies: project.technologies,
          link: rng() < 0.5 ? `https://github.com/${handle}/${project.name.toLowerCase().replace(/\s+/g, '-')}` : '',
        }));

  const certifications =
    quality === 'full'
      ? pickMany(rng, profile.certifications, 1).map((name) => ({
          name,
          issuer: name.split(' ')[0],
          date: yearMonth(intBetween(rng, 2021, 2025), intBetween(rng, 1, 12)),
          credentialLink: '',
        }))
      : [];

  const languages = quality === 'sparse' ? [] : pickMany(rng, LANGUAGES, intBetween(rng, 2, 3));

  // A short summary is penalised by the scorer; an empty one more so.
  const summary =
    quality === 'full'
      ? profile.summary
      : quality === 'partial'
        ? profile.summary.split('. ').slice(0, 1).join('. ') + '.'
        : '';

  const title = index === 0 ? `${headline} CV` : `${headline} CV (${pick(rng, profile.companies)})`;

  return {
    user: user._id,
    title,
    templateKey: pick(rng, TEMPLATE_KEYS),
    settings: {
      primaryColor: pick(rng, PRIMARY_COLOURS),
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: pick(rng, FONT_FAMILIES),
      fontSize: pick(rng, ['small', 'medium', 'large']),
      themePreset: pick(rng, THEME_PRESETS),
      spacing: pick(rng, ['compact', 'normal']),
    },
    personal,
    summary,
    education,
    experience,
    skills,
    projects,
    certifications,
    languages,
    references: [],
    referencesOnRequest: true,
    isPrimary: index === 0,
    isDeleted: false,
  };
}

// ---------------------------------------------------------------------------
// Database work
// ---------------------------------------------------------------------------

/**
 * Removes everything a previous run of this script created.
 *
 * Safe by construction: it finds the accounts by the `@loadtest.local`
 * suffix and deletes only documents belonging to them, so real accounts
 * and their data cannot be caught by it.
 *
 * @returns {Promise<void>}
 */
async function clearPreviousRun() {
  const suffix = new RegExp(`@${LOADTEST_DOMAIN.replace('.', '\\.')}$`, 'i');
  const users = await User.find({ email: suffix }).select('_id').lean();
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    console.log('[seed:loadtest] nothing to clear');
    return;
  }

  // The companies owned by seeded users, so their jobs can go too. Found
  // before the companies are deleted, or the jobs would be orphaned.
  const companies = await Company.find({ owner: { $in: userIds } })
    .select('_id')
    .lean();
  const companyIds = companies.map((company) => company._id);

  const [cvs, matches, logs, reviews, jobs] = await Promise.all([
    CV.deleteMany({ user: { $in: userIds } }),
    JobMatch.deleteMany({ user: { $in: userIds } }),
    ActivityLog.deleteMany({ user: { $in: userIds } }),
    Review.deleteMany({ user: { $in: userIds } }),
    Job.deleteMany({ company: { $in: companyIds } }),
  ]);

  const removedCompanies = await Company.deleteMany({ _id: { $in: companyIds } });
  const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

  console.log(
    `[seed:loadtest] cleared ${removedUsers.deletedCount} user(s), ${cvs.deletedCount} CV(s), ` +
      `${matches.deletedCount} job match(es), ${logs.deletedCount} activity log(s), ` +
      `${reviews.deletedCount} review(s), ${removedCompanies.deletedCount} company(ies), ` +
      `${jobs.deletedCount} job(s)`,
  );
}

/**
 * Writes the generated credentials to a CSV file.
 *
 * The e-mails are random, so without this file there would be no way to
 * log the accounts in. The column order (`email,password`) is the shape
 * k6, JMeter and Artillery all expect for a CSV user pool.
 *
 * @param {string} filePath - Where to write.
 * @param {Array<{email: string, name: string, status: string}>} users - The accounts.
 * @param {string} password - The shared password.
 * @returns {Promise<void>}
 */
async function writeCredentialsFile(filePath, users, password) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const rows = users
    .filter((user) => user.status === 'active')
    .map((user) => `${user.email},${password},"${user.name}"`);

  fs.writeFileSync(filePath, `email,password,name\n${rows.join('\n')}\n`, 'utf8');
}

/**
 * Creates the activity entries for one user.
 *
 * The admin dashboard draws registrations, downloads and job matches from
 * this collection, so without it the charts stay empty however many users
 * exist. Each entry is dated between the account's creation and today, so
 * the monthly charts have a believable shape.
 *
 * @param {() => number} rng - The generator.
 * @param {object} user - The saved user document.
 * @param {Array<object>} cvs - That user's saved CVs.
 * @param {Date} now - The upper bound for every date.
 * @returns {Array<object>} Documents for `insertMany`.
 */
function buildActivity(rng, user, cvs, now) {
  const entries = [];

  /**
   * Adds one entry.
   * @param {string} action - One of ACTIVITY_ACTIONS.
   * @param {Date} when - Timestamp.
   * @param {object} [extra] - Any further fields.
   */
  const add = (action, when, extra = {}) => {
    entries.push({
      user: user._id,
      action,
      cv: null,
      meta: {},
      ip: `10.0.${intBetween(rng, 0, 255)}.${intBetween(rng, 1, 254)}`,
      createdAt: when,
      updatedAt: when,
      ...extra,
    });
  };

  add('REGISTER', user.createdAt);

  for (let i = 0; i < intBetween(rng, 1, 6); i += 1) {
    add('LOGIN', dateBetween(rng, user.createdAt, now));
  }

  for (const cv of cvs) {
    add('CV_CREATE', cv.createdAt, { cv: cv._id, meta: { template: cv.templateKey } });

    // Not every CV is downloaded, and some are downloaded several times.
    for (let i = 0; i < intBetween(rng, 0, 3); i += 1) {
      add(pick(rng, ['DOWNLOAD_PDF', 'DOWNLOAD_PDF', 'DOWNLOAD_DOCX', 'DOWNLOAD_EXCEL']),
        dateBetween(rng, cv.createdAt, now),
        { cv: cv._id, meta: { template: cv.templateKey } });
    }
  }

  return entries;
}

/**
 * Chooses which advert a CV is analysed against.
 *
 * Picking at random would be wrong. There are nine career fields and ten
 * adverts, so nine analyses in ten would pair a nurse's CV with a DevOps
 * job and score near zero — and the admin's "most frequently missing
 * keywords" report would then be a list of words no candidate was ever
 * going to have. Real users analyse jobs they could plausibly do.
 *
 * So two thirds of the time the best-matching advert is chosen, using
 * `scoreJobsAgainstCV` — the same function that puts match badges on the
 * job board. The remaining third stays random, because people do apply
 * outside their field and the data should include those cases too.
 *
 * @param {() => number} rng - The generator.
 * @param {object} cv - The CV being analysed.
 * @param {Array<{_id: object|null, title: string, description: string}>} adverts - Source adverts.
 * @returns {{_id: object|null, title: string, description: string}} The chosen advert.
 */
function chooseAdvert(rng, cv, adverts) {
  if (rng() < 0.34) return pick(rng, adverts);

  // The matcher returns the scores in the order the adverts were given,
  // so they are sorted here. The best two are kept rather than only the
  // best, so that two similar CVs do not always land on the same advert.
  const scored = scoreJobsAgainstCV(
    cv,
    adverts.map((advert, index) => ({ id: String(index), text: advert.description })),
  ).sort((a, b) => b.matchScore - a.matchScore);

  if (scored.length === 0) return pick(rng, adverts);

  return adverts[Number(pick(rng, scored.slice(0, 2)).id)];
}

/**
 * Runs the real match analyser for a user and stores the result.
 *
 * The analyses are produced by `analyseMatch`, the same function the API
 * calls, rather than by inventing scores. That matters twice over: the
 * numbers in the admin skill-gap report are then genuine, and running the
 * analyser a few hundred times is itself a useful measurement of how long
 * the algorithm takes.
 *
 * @param {() => number} rng - The generator.
 * @param {object} user - The saved user.
 * @param {object} cv - One of the user's CVs.
 * @param {Array<{_id: object, title: string, description: string}>} adverts - Source adverts.
 * @param {Date} now - Upper bound for the timestamp.
 * @returns {object} A document for `insertMany`.
 */
function buildJobMatch(rng, user, cv, adverts, now) {
  const advert = chooseAdvert(rng, cv, adverts);
  const result = analyseMatch(cv, advert.description);
  const when = dateBetween(rng, cv.createdAt, now);

  return {
    user: user._id,
    cv: cv._id,
    job: advert._id ?? null,
    jobTitle: advert.title,
    jobDescription: advert.description,
    matchScore: result.matchScore,
    cosineSimilarity: result.cosineSimilarity,
    skillCoverage: result.skillCoverage,
    matchedKeywords: result.matchedKeywords,
    missingKeywords: result.missingKeywords,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    suggestions: result.suggestions,
    createdAt: when,
    updatedAt: when,
  };
}

/**
 * Creates the employers and their adverts.
 *
 * The companies are owned by seeded users rather than by the admin, so the
 * employer side of the application has real accounts behind it: an admin
 * owning a hundred and fifty adverts is not a situation the permission
 * checks would ever meet in use.
 *
 * Each company is upserted on its owner, matching the one-company-per-user
 * rule the model enforces, so re-running the script does not fail on the
 * unique index.
 *
 * @param {() => number} rng - The generator.
 * @param {Array<object>} users - Seeded users, some of which become employers.
 * @param {number} jobCount - How many adverts to create.
 * @param {Date} now - Upper bound for the posting dates.
 * @returns {Promise<{companies: number, jobs: number}>} What was created.
 */
async function seedJobBoard(rng, users, jobCount, now) {
  // One owner per employer, taken from the accounts just created.
  const owners = pickMany(rng, users, Math.min(EMPLOYERS.length, users.length));

  const companies = [];

  for (let i = 0; i < owners.length; i += 1) {
    const employer = EMPLOYERS[i];
    const owner = owners[i];

    const company = await Company.findOneAndUpdate(
      { owner: owner._id },
      {
        $set: {
          ...employer,
          owner: owner._id,
          description:
            `${employer.name} is a ${employer.industry.toLowerCase()} business based in ` +
            `${employer.location}. This employer exists to give the job board realistic volume.`,
          isDeleted: false,
          // Seeded companies are approved, so their jobs are on the board.
          status: 'approved',
          reviewedAt: new Date(),
          registrationNumber: `LT-${String(i + 1).padStart(5, '0')}`,
          phone: '+977 1 4000000',
          email: `hr${i + 1}@loadtest.example`,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    // A company owner is an employer account. The role is written here as
    // well, because `updateOne` does not run the model's `syncRole` hook.
    await User.updateOne(
      { _id: owner._id },
      { $set: { accountType: 'employer', role: 'employer' } },
    );

    companies.push({ company, owner });
  }

  const jobDocs = [];

  for (let i = 0; i < jobCount; i += 1) {
    const { company, owner } = pick(rng, companies);
    const profile = pick(rng, PROFILES);
    const seniority = pick(rng, SENIORITIES);
    const headline = pick(rng, profile.headlines);
    const skills = pickMany(rng, profile.skills, intBetween(rng, 4, 6));

    const title = seniority.label ? `${seniority.label} ${headline}` : headline;
    const postedAt = dateBetween(rng, new Date(now.getFullYear() - 1, now.getMonth(), 1), now);

    jobDocs.push({
      company: company._id,
      postedBy: owner._id,
      title,
      description: buildJobDescription(profile, seniority, skills, company.name),
      location: pick(rng, CITIES),
      jobType: pick(rng, JOB_TYPES),
      workMode: pick(rng, WORK_MODES),
      salaryRange: `NPR ${seniority.salary[0].toLocaleString('en-GB')} - ${seniority.salary[1].toLocaleString('en-GB')} per month`,
      skills,
      // Roughly one advert in eight is closed, so the board's open filter
      // has something to filter out.
      status: rng() < 0.12 ? 'closed' : 'open',
      closingDate: rng() < 0.6 ? dateBetween(rng, now, new Date(now.getFullYear() + 1, 0, 1)) : null,
      applicationCount: 0,
      isDeleted: false,
      createdAt: postedAt,
      updatedAt: postedAt,
    });
  }

  await Job.insertMany(jobDocs, { timestamps: false });

  return { companies: companies.length, jobs: jobDocs.length };
}

/**
 * Creates the testimonials shown on the home page.
 *
 * The model allows one review per user, so each is given a different
 * author. Most are four or five stars because only those appear publicly
 * and the home page is the reason for seeding them, but a few lower ones
 * are included deliberately: the average shown on the page is taken across
 * every visible review, and an average of exactly 5.0 would be a less
 * honest demonstration than a real one.
 *
 * @param {() => number} rng - The generator.
 * @param {Array<object>} users - Accounts to attribute reviews to.
 * @param {number} count - How many to create.
 * @param {Date} now - Upper bound for the dates.
 * @returns {Promise<number>} How many were created.
 */
async function seedReviews(rng, users, count, now) {
  const authors = pickMany(rng, users, Math.min(count, users.length, REVIEW_COMMENTS.length));

  const docs = authors.map((user, index) => {
    // Four and five stars dominate; one in six is a three or below, which
    // counts towards the average but stays off the home page.
    const rating = rng() < 0.17 ? intBetween(rng, 2, 3) : intBetween(rng, 4, 5);
    const when = dateBetween(rng, user.createdAt, now);

    return {
      user: user._id,
      rating,
      comment: REVIEW_COMMENTS[index % REVIEW_COMMENTS.length],
      context: pick(rng, REVIEW_CONTEXTS),
      isHidden: false,
      createdAt: when,
      updatedAt: when,
    };
  });

  await Review.insertMany(docs, { timestamps: false });

  return docs.length;
}

/**
 * Loads the adverts that seeded job matches are run against.
 *
 * Prefers the adverts on the job board, so the match history points at
 * real jobs a demo can click through to. Falls back to the sample
 * descriptions the analyser already ships with when the board is empty.
 *
 * @returns {Promise<Array<{_id: object|null, title: string, description: string}>>}
 */
async function loadAdverts() {
  const jobs = await Job.find({ isDeleted: false }).select('_id title description').lean();

  if (jobs.length > 0) {
    return jobs.map((job) => ({ _id: job._id, title: job.title, description: job.description }));
  }

  const seeds = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../src/data/seedJobDescriptions.json'), 'utf8'),
  );

  return seeds.map((seed) => ({ _id: null, title: seed.title, description: seed.text }));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Generates the whole data set and reports what it created.
 * @returns {Promise<void>}
 */
async function seedLoadTestData() {
  const options = parseArgs(process.argv.slice(2));

  const userCount = intOption(options, 'users', 100);
  const maxCvs = Math.max(1, intOption(options, 'max-cvs', 3));
  const matchesPerUser = intOption(options, 'matches', 1);
  const jobCount = intOption(options, 'jobs', 150);
  const reviewCount = intOption(options, 'reviews', 24);
  const password = typeof options.password === 'string' ? options.password : 'LoadTest123';
  const randomSeed = intOption(options, 'seed', 42);
  const outPath = path.resolve(
    __dirname,
    typeof options.out === 'string' ? options.out : 'output/loadtest-users.csv',
  );

  if (env.nodeEnv === 'production' && !options.force) {
    console.error('[seed:loadtest] refusing to run with NODE_ENV=production. Use --force if you mean it.');
    process.exitCode = 1;
    return;
  }

  await connectDB(env.mongoUri);

  if (options.clear || options['only-clear']) {
    await clearPreviousRun();
    if (options['only-clear']) {
      await disconnectDB();
      return;
    }
  }

  const startedAt = Date.now();
  const rng = createRandom(randomSeed);
  const now = new Date();
  const registrationWindow = {
    from: new Date(now.getFullYear() - 1, now.getMonth(), 1),
    to: now,
  };

  // --- Users ---------------------------------------------------------------
  // bcrypt at cost 12 takes roughly a quarter of a second, so hashing the
  // same password once per account would waste most of the run. These are
  // disposable test accounts with a published password, so one shared hash
  // is fine. It would not be acceptable for real users: a shared hash means
  // a shared salt, and one cracked password would reveal them all.
  console.log(`[seed:loadtest] hashing the shared password once (bcrypt cost ${BCRYPT_ROUNDS})...`);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const usedEmails = new Set();
  const userDocs = Array.from({ length: userCount }, () =>
    buildUser(rng, passwordHash, usedEmails, registrationWindow),
  );

  // `insertMany` skips the model's pre-save hook, which is why the hash is
  // computed above: if the hook ran it would hash the hash. `timestamps:
  // false` keeps the createdAt dates generated above, so the registrations
  // chart has twelve months of history instead of one spike today.
  const users = await User.insertMany(userDocs, { timestamps: false });
  console.log(`[seed:loadtest] ${users.length} users created`);

  // --- Job board -----------------------------------------------------------
  // Before the CVs and the matches, because the match analyses below pick
  // the advert they run against from whatever is on the board.
  let boardTotals = { companies: 0, jobs: 0 };

  if (jobCount > 0) {
    boardTotals = await seedJobBoard(rng, users, jobCount, now);
    console.log(
      `[seed:loadtest] ${boardTotals.jobs} jobs created across ${boardTotals.companies} companies`,
    );
  }

  // --- Reviews -------------------------------------------------------------
  let reviewsCreated = 0;

  if (reviewCount > 0) {
    reviewsCreated = await seedReviews(rng, users, reviewCount, now);
    console.log(`[seed:loadtest] ${reviewsCreated} reviews created`);
  }

  // --- CVs -----------------------------------------------------------------
  // Saved one at a time rather than with insertMany, because the CV model
  // calculates the strength score in a pre-save hook. insertMany would skip
  // it and leave every CV scoring zero.
  const allCvs = [];
  let cvCount = 0;

  for (const user of users) {
    const profile = pick(rng, PROFILES);
    const howMany = intBetween(rng, 1, maxCvs);
    const userCvs = [];

    for (let i = 0; i < howMany; i += 1) {
      const quality = pickQuality(rng);
      const cv = new CV(buildCV(rng, user, profile, quality, i));

      const createdAt = dateBetween(rng, user.createdAt, now);
      cv.createdAt = createdAt;
      cv.updatedAt = dateBetween(rng, createdAt, now);
      // Tells Mongoose to leave the two dates above alone instead of
      // overwriting them with the current time.
      cv.$timestamps(false);

      await cv.save();
      userCvs.push(cv);
      cvCount += 1;
    }

    allCvs.push({ user, cvs: userCvs });

    if (cvCount % 100 === 0) console.log(`[seed:loadtest]   ${cvCount} CVs...`);
  }

  console.log(`[seed:loadtest] ${cvCount} CVs created`);

  // --- Job matches ---------------------------------------------------------
  let matchCount = 0;

  if (matchesPerUser > 0) {
    const adverts = await loadAdverts();
    const matchDocs = [];

    for (const { user, cvs } of allCvs) {
      for (let i = 0; i < matchesPerUser; i += 1) {
        matchDocs.push(buildJobMatch(rng, user, pick(rng, cvs), adverts, now));
      }
    }

    await JobMatch.insertMany(matchDocs, { timestamps: false });
    matchCount = matchDocs.length;
    console.log(`[seed:loadtest] ${matchCount} job match analyses stored`);
  }

  // --- Activity ------------------------------------------------------------
  const activityDocs = allCvs.flatMap(({ user, cvs }) => buildActivity(rng, user, cvs, now));

  for (const { user, cvs } of allCvs) {
    for (let i = 0; i < matchesPerUser; i += 1) {
      const cv = pick(rng, cvs);
      activityDocs.push({
        user: user._id,
        action: 'JOB_MATCH',
        cv: cv._id,
        meta: {},
        ip: `10.0.${intBetween(rng, 0, 255)}.${intBetween(rng, 1, 254)}`,
        createdAt: dateBetween(rng, cv.createdAt, now),
        updatedAt: now,
      });
    }
  }

  await ActivityLog.insertMany(activityDocs, { timestamps: false });
  console.log(`[seed:loadtest] ${activityDocs.length} activity log entries created`);

  // --- Credentials ---------------------------------------------------------
  await writeCredentialsFile(outPath, users, password);

  const scores = await CV.find({ user: { $in: users.map((user) => user._id) } })
    .select('strengthScore')
    .lean();
  const averageScore =
    scores.reduce((sum, cv) => sum + (cv.strengthScore ?? 0), 0) / (scores.length || 1);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('');
  console.log('[seed:loadtest] done in ' + seconds + 's');
  console.log(`[seed:loadtest]   users              : ${users.length}`);
  console.log(`[seed:loadtest]   CVs                : ${cvCount}`);
  console.log(`[seed:loadtest]   companies          : ${boardTotals.companies}`);
  console.log(`[seed:loadtest]   jobs               : ${boardTotals.jobs}`);
  console.log(`[seed:loadtest]   reviews            : ${reviewsCreated}`);
  console.log(`[seed:loadtest]   job matches        : ${matchCount}`);
  console.log(`[seed:loadtest]   activity entries   : ${activityDocs.length}`);
  console.log(`[seed:loadtest]   average CV strength: ${averageScore.toFixed(1)} / 100`);
  console.log(`[seed:loadtest]   password (all)     : ${password}`);
  console.log(`[seed:loadtest]   credentials CSV    : ${outPath}`);
  console.log(`[seed:loadtest]   random seed        : ${randomSeed} (same seed, same data)`);
  console.log('');
  console.log('[seed:loadtest] remove it all again with: npm run seed:loadtest -- --only-clear');

  await disconnectDB();
}

seedLoadTestData().catch(async (error) => {
  console.error('[seed:loadtest] failed:', error.message);
  if (mongoose.connection.readyState === 1) await disconnectDB();
  process.exit(1);
});
