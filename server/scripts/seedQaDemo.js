/**
 * Demo data for the Job-Tailored CV Rewrite.
 *
 * Puts a spread of CVs on one account and a matching spread of adverts on
 * another, so the rewrite can be tried — and demonstrated in the viva —
 * against known, repeatable inputs.
 *
 * The spread covers QA, project management and software engineering. The
 * engineering CV is the long one: ten years across four companies, with
 * projects, certifications and languages, so it runs past a single page.
 * It is there because the short CVs only exercise half the rewrite — the
 * page-fill step has nothing to do on a CV that is already two pages, and
 * the summary and section ordering behave differently when there is real
 * material to order.
 *
 * The point of the spread is the contrast. One CV is squarely in the
 * advert's field and already scores well, so the rewrite has little to
 * do and assumes nothing. One is adjacent, so the honest steps move it
 * a long way. One is from another field entirely, so the target pass
 * has to act and every assumption it makes is visible. Demonstrating
 * only the first of those would show the feature at its most flattering
 * and prove the least.
 *
 * Two accounts, because a user cannot apply to their own posting and
 * the "Rewrite CV" button is hidden on one: the CVs go on the account
 * you sign in as, the adverts on a separate employer.
 *
 * Running it twice is safe. People are matched on email and CVs and
 * jobs on their title, then updated rather than duplicated.
 *
 * Usage: npm run seed:qa-demo
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Job } from '../src/models/Job.js';
import { CV } from '../src/models/CV.js';

/** The account the demo CVs belong to — the one you sign in as. */
const SEEKER = { name: 'Rijan User', email: 'rijan@admin.com' };

/** The account that posts the adverts. Kept separate from the seeker. */
const EMPLOYER = { name: 'Sabina Shrestha', email: 'employer@demo.test' };

/**
 * The password given to either account if this script has to create it.
 * Meets the registration rules: at least eight characters, a letter and
 * a digit. An account that already exists keeps its own password.
 */
const DEMO_PASSWORD = 'demo12345';

const EMPLOYER_COMPANY = {
  name: 'Annapurna Software',
  description:
    'A sample employer used to demonstrate the job board, the match analyser and the ' +
    'Job-Tailored CV Rewrite.',
  location: 'Lalitpur',
  industry: 'Software',
};

// --- The adverts -----------------------------------------------------------

/**
 * Six adverts: three QA, three project management, at a range of
 * seniorities so the same CV scores differently against each.
 */
const JOBS = [
  {
    title: 'QA Automation Engineer',
    description:
      'We are hiring a QA automation engineer to own our regression suite. You will design and ' +
      'maintain automated tests with Selenium and Cypress, write API tests in Postman, and run ' +
      'the suite in our CI/CD pipeline on every merge. You will write clear bug reports, ' +
      'reproduce defects from production logs, and work with developers in two week sprints to ' +
      'agree acceptance criteria. Experience with test automation frameworks, SQL for data ' +
      'setup, and performance testing with JMeter is expected. You will report coverage and ' +
      'defect trends to the delivery manager each sprint.',
    location: 'Lalitpur',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 80,000 - 120,000 per month',
    skills: ['Selenium', 'Cypress', 'Postman', 'Test Automation', 'SQL', 'Jira'],
  },
  {
    title: 'Manual QA Tester',
    description:
      'We are looking for a manual QA tester to join our delivery team. You will write and ' +
      'execute test cases from user stories, carry out functional, regression and exploratory ' +
      'testing across web and mobile, and raise defects in Jira with clear reproduction steps. ' +
      'You will take part in sprint planning and review, verify fixes before release, and help ' +
      'maintain the regression pack. Some exposure to API testing with Postman and to SQL for ' +
      'checking data is useful. Attention to detail and clear written English matter more here ' +
      'than tooling.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 45,000 - 65,000 per month',
    skills: ['Manual Testing', 'Jira', 'Test Cases', 'Postman', 'SQL'],
  },
  {
    title: 'QA Lead',
    description:
      'We need a QA lead to own quality across three product teams. You will define the test ' +
      'strategy, decide what is automated and what stays manual, and mentor a team of four ' +
      'testers. You will be accountable for release readiness, report defect trends and test ' +
      'coverage to senior stakeholders, and improve our CI/CD quality gates. Hands-on ' +
      'experience with test automation, Selenium, API testing and performance testing is ' +
      'required, alongside a track record of leading testers and agreeing quality standards ' +
      'with product and engineering.',
    location: 'Lalitpur',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 150,000 - 200,000 per month',
    skills: ['Test Automation', 'Selenium', 'Agile', 'Jira', 'Leadership'],
  },
  {
    title: 'Project Coordinator',
    description:
      'We are hiring a project coordinator to support delivery across our software projects. ' +
      'You will maintain project plans and schedules, track deliverables and dependencies, ' +
      'take minutes and chase actions, and keep the risk and issue log current. You will ' +
      'prepare weekly status reports for stakeholders, coordinate sprint ceremonies, and keep ' +
      'Jira and Confluence up to date. Strong organisation, clear written communication and ' +
      'confidence with spreadsheets are essential. Exposure to Agile or Scrum is an advantage.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 50,000 - 70,000 per month',
    skills: ['Jira', 'Agile', 'Scrum', 'Excel', 'Confluence'],
  },
  {
    title: 'Project Manager',
    description:
      'We are looking for a project manager to own delivery of client software projects from ' +
      'kick-off to handover. You will manage scope, schedule, budget and risk, run sprint ' +
      'planning and retrospectives, and be the main point of contact for stakeholders. You ' +
      'will forecast resource needs, report progress and budget variance monthly, escalate ' +
      'risks early, and hold teams to agreed delivery dates. Experience managing Agile ' +
      'delivery with Scrum, stakeholder management, and a track record of shipping on time ' +
      'and on budget are required.',
    location: 'Lalitpur',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 130,000 - 180,000 per month',
    skills: ['Agile', 'Scrum', 'Stakeholder Management', 'Jira', 'Risk Management'],
  },
  {
    title: 'Scrum Master',
    description:
      'We need a Scrum master to serve two engineering teams. You will facilitate planning, ' +
      'stand-ups, review and retrospectives, remove impediments, and coach the team on Agile ' +
      'practice. You will track velocity and cycle time, keep the board honest in Jira, and ' +
      'work with the product owner on backlog refinement. You will protect the team from ' +
      'mid-sprint scope change and help the organisation understand what the team can ' +
      'realistically deliver. Certification is welcome but demonstrable practice matters more.',
    location: 'Remote',
    jobType: 'Full-time',
    workMode: 'Remote',
    salaryRange: 'NPR 110,000 - 150,000 per month',
    skills: ['Scrum', 'Agile', 'Jira', 'Coaching', 'Stakeholder Management'],
  },
  {
    title: 'Senior Backend Engineer',
    description:
      'We are hiring a senior backend engineer to own services at the centre of our platform. ' +
      'You will design and build REST APIs in Node.js and Express against MongoDB and ' +
      'PostgreSQL, take features from design through code review to production, and keep the ' +
      'services fast under load. You will write unit and integration tests, run services in ' +
      'Docker on AWS, and share an on-call rotation. You will review other engineers pull ' +
      'requests, mentor two mid-level developers, and work with product in two week sprints. ' +
      'Experience of profiling and optimising slow queries, of designing for scale, and of ' +
      'CI/CD pipelines is expected.',
    location: 'Lalitpur',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 200,000 - 280,000 per month',
    skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'REST API'],
  },
  {
    title: 'Lead Full-Stack Engineer',
    description:
      'We are looking for a lead full-stack engineer to take technical ownership of a product ' +
      'team of six. You will set the technical direction, make the architecture decisions and ' +
      'be accountable for what ships. Day to day you will write React and TypeScript on the ' +
      'front end and Node.js on the back, design APIs, and review every significant pull ' +
      'request. You will mentor engineers, run technical interviews, and work with the product ' +
      'manager to break a roadmap into deliverable increments. We expect a track record of ' +
      'leading a team, of migrating legacy code without stopping delivery, and of raising ' +
      'quality through testing and CI/CD.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 250,000 - 340,000 per month',
    skills: ['React', 'TypeScript', 'Node.js', 'Leadership', 'Mentoring', 'System Design'],
  },
  {
    title: 'Engineering Manager',
    description:
      'We need an engineering manager to lead two delivery teams. This is a people and ' +
      'delivery role rather than a hands-on one: you will line manage eight engineers, run ' +
      'one to ones and growth plans, own hiring for both teams, and be accountable for ' +
      'predictable delivery against a quarterly roadmap. You will work with product and design ' +
      'on scope, report delivery and quality metrics to the leadership team, and keep the ' +
      'technical strategy coherent across the two teams. A background as a senior or lead ' +
      'engineer is essential, as is experience of mentoring, of agile delivery and of ' +
      'architecture decisions, but you should expect to write very little code.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 300,000 - 400,000 per month',
    skills: ['Leadership', 'Mentoring', 'Agile', 'Hiring', 'Delivery Management'],
  },
  {
    title: 'Platform Engineer',
    description:
      'We are hiring a platform engineer to own the infrastructure our product teams build on. ' +
      'You will run our Kubernetes clusters on AWS, write infrastructure as code in Terraform, ' +
      'and maintain the CI/CD pipelines every team deploys through. You will own observability ' +
      'with Prometheus and Grafana, cut build and deploy times, harden the platform, and be ' +
      'the escalation point for production incidents. Strong Linux, Docker and scripting are ' +
      'required. Experience of having been a backend engineer before moving to platform work ' +
      'is welcome, as is an understanding of what application teams need from a platform.',
    location: 'Remote',
    jobType: 'Full-time',
    workMode: 'Remote',
    salaryRange: 'NPR 220,000 - 300,000 per month',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'CI/CD', 'Linux'],
  },
  {
    title: 'Senior Frontend Engineer',
    description:
      'We are looking for a senior frontend engineer to lead the front end of our customer ' +
      'facing application. You will build in React and TypeScript, own the component library, ' +
      'and hold the line on accessibility and performance. You will write component and end to ' +
      'end tests, profile and fix rendering bottlenecks, and work closely with design on a ' +
      'shared system. You will review front-end pull requests and mentor two developers. ' +
      'Experience consuming REST APIs, of state management at scale, and of taking Core Web ' +
      'Vitals seriously is expected.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 180,000 - 240,000 per month',
    skills: ['React', 'TypeScript', 'Accessibility', 'Testing', 'REST API'],
  },
];

// --- The CVs ---------------------------------------------------------------

/** Shared contact block, so the CVs differ only in what is being tested. */
const PERSONAL = {
  fullName: 'Rijan User',
  email: 'rijan@admin.com',
  phone: '+977 9801234567',
  address: 'Kathmandu, Nepal',
  linkedin: 'linkedin.com/in/rijan-demo',
};

/**
 * Four CVs, written to land at deliberately different match scores
 * against the adverts above.
 *
 * `expect` is not stored — it is printed at the end so you can see at a
 * glance whether the analyser is behaving, and notice if a change to
 * the weights has moved everything.
 */
const CVS = [
  {
    title: 'QA Automation Engineer CV',
    expect: 'High against QA Automation Engineer and QA Lead',
    templateKey: 'ats',
    isPrimary: false,
    personal: { ...PERSONAL, headline: 'QA Automation Engineer' },
    summary:
      'QA automation engineer with five years testing web and mobile products. I own regression ' +
      'suites end to end, from framework design to reporting coverage to the delivery manager.',
    experience: [
      {
        company: 'Himalaya Softworks',
        position: 'QA Automation Engineer',
        location: 'Lalitpur',
        startDate: '2021-04',
        endDate: '',
        isCurrent: true,
        description:
          'Responsible for building and maintaining the automated regression suite in Selenium ' +
          'and Cypress, and for running it in the CI/CD pipeline on every merge.',
        achievements: [
          'Cut the regression cycle from 3 days to 4 hours by automating 240 test cases',
          'Reduced defects reaching production by 62% in the first year',
          'Wrote API tests in Postman covering 95% of public endpoints',
        ],
      },
      {
        company: 'Everest Digital',
        position: 'QA Engineer',
        location: 'Kathmandu',
        startDate: '2019-06',
        endDate: '2021-03',
        description:
          'Tested two client web applications, wrote test cases from user stories and raised ' +
          'defects in Jira with reproduction steps.',
        achievements: ['Logged and verified over 800 defects across 14 releases'],
      },
    ],
    education: [
      {
        institution: 'Tribhuvan University',
        degree: 'BCA',
        fieldOfStudy: 'Computer Applications',
        startDate: '2015-07',
        endDate: '2019-05',
        grade: '3.6 GPA',
      },
    ],
    skills: [
      { name: 'Selenium', level: 'Expert' },
      { name: 'Cypress', level: 'Advanced' },
      { name: 'Postman', level: 'Advanced' },
      { name: 'Test Automation', level: 'Expert' },
      { name: 'SQL', level: 'Intermediate' },
      { name: 'Jira', level: 'Advanced' },
      { name: 'JavaScript', level: 'Intermediate' },
    ],
    projects: [
      {
        name: 'Regression framework',
        role: 'Author',
        description:
          'A Cypress framework with parallel execution and a HTML coverage report published ' +
          'to the pipeline.',
        technologies: ['Cypress', 'JavaScript', 'CI/CD'],
      },
    ],
    certifications: [{ name: 'ISTQB Foundation Level', issuer: 'ISTQB', date: '2020-08' }],
    languages: [
      { language: 'Nepali', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
    ],
  },

  {
    title: 'Manual QA Tester CV',
    expect: 'Moderate — strong on manual QA, thin on automation',
    templateKey: 'classic',
    // The primary CV, so the "Rewrite CV" button on a job page has
    // something mid-range to work with. A CV that already scores 90 is
    // a poor demonstration: there is nothing for the rewrite to do.
    isPrimary: false,
    personal: { ...PERSONAL, headline: 'QA Tester' },
    summary: 'A tester.',
    experience: [
      {
        company: 'Everest Digital',
        position: 'QA Tester',
        location: 'Kathmandu',
        startDate: '2021-01',
        endDate: '',
        isCurrent: true,
        description:
          'Responsible for writing test cases from user stories and for executing functional ' +
          'and regression testing across web and mobile.',
        achievements: [
          'Raised 450 defects in Jira with clear reproduction steps',
          'Verified fixes before each of 22 releases',
        ],
      },
      {
        company: 'Patan Retail',
        position: 'Support Assistant',
        location: 'Lalitpur',
        startDate: '2019-02',
        endDate: '2020-12',
        description: 'Worked on handling customer queries and escalating faults to the IT team.',
        achievements: [],
      },
    ],
    education: [
      {
        institution: 'Tribhuvan University',
        degree: 'BCA',
        fieldOfStudy: 'Computer Applications',
        startDate: '2015-07',
        endDate: '2019-01',
      },
    ],
    skills: [
      { name: 'Manual Testing', level: 'Advanced' },
      { name: 'Jira', level: 'Advanced' },
      { name: 'Test Cases', level: 'Advanced' },
    ],
    projects: [],
    certifications: [],
    languages: [{ language: 'Nepali', proficiency: 'Native' }],
  },

  {
    title: 'Project Coordinator CV',
    expect: 'Moderate against the PM adverts, low against QA',
    templateKey: 'modern',
    isPrimary: false,
    personal: { ...PERSONAL, headline: 'Project Coordinator' },
    summary: 'Project coordinator supporting delivery across a small software team.',
    experience: [
      {
        company: 'Annapurna Consulting',
        position: 'Project Coordinator',
        location: 'Kathmandu',
        startDate: '2022-02',
        endDate: '',
        isCurrent: true,
        description:
          'Responsible for maintaining project schedules, tracking deliverables and preparing ' +
          'weekly status reports for stakeholders.',
        achievements: [
          'Kept 12 concurrent projects on schedule across two years',
          'Cut weekly reporting time by 20% by standardising the template',
        ],
      },
    ],
    education: [
      {
        institution: 'Tribhuvan University',
        degree: 'BBA',
        fieldOfStudy: 'Management',
        startDate: '2018-07',
        endDate: '2022-01',
      },
    ],
    skills: [
      { name: 'Excel', level: 'Advanced' },
      { name: 'Jira', level: 'Intermediate' },
      { name: 'Communication', level: 'Advanced' },
    ],
    projects: [],
    certifications: [],
    languages: [{ language: 'Nepali', proficiency: 'Native' }],
  },

  {
    title: 'Retail Assistant CV',
    expect: 'Low against everything — the target pass has to work hardest here',
    templateKey: 'minimal',
    isPrimary: false,
    personal: { ...PERSONAL, headline: 'Sales Assistant' },
    summary: 'Sales assistant with four years in a busy shop.',
    experience: [
      {
        company: 'Thamel Corner Store',
        position: 'Sales Assistant',
        location: 'Kathmandu',
        startDate: '2020-05',
        endDate: '2024-04',
        description: 'Responsible for the till, restocking shelves and serving customers.',
        achievements: [],
      },
    ],
    education: [
      {
        institution: 'Kathmandu Model College',
        degree: '+2',
        fieldOfStudy: 'Management',
        startDate: '2018-06',
        endDate: '2020-04',
      },
    ],
    skills: [{ name: 'Customer Service', level: 'Advanced' }],
    projects: [],
    certifications: [],
    languages: [{ language: 'Nepali', proficiency: 'Native' }],
  },
  {
    title: 'Senior Software Engineer CV',
    expect: 'High against Senior Backend Engineer and Lead Full-Stack Engineer',
    templateKey: 'classic',
    isPrimary: true,
    personal: {
      ...PERSONAL,
      headline: 'Senior Software Engineer',
      website: 'rijan.dev',
      github: 'github.com/rijan-demo',
    },
    summary:
      'Senior software engineer with ten years building and running web products, the last ' +
      'four of them leading a team. I work across the stack, with Node.js and PostgreSQL on ' +
      'the server and React and TypeScript in the browser, and I am happiest on the problems ' +
      'between the two: API design, data modelling and the performance work nobody has got ' +
      'round to. I have taken three products from first commit to production and kept them ' +
      'running afterwards.',
    experience: [
      {
        company: 'Deerwalk Technologies',
        position: 'Lead Software Engineer',
        location: 'Kathmandu',
        startDate: '2022-03',
        endDate: '',
        isCurrent: true,
        description:
          'Responsible for the technical direction of a six person product team, owning the ' +
          'architecture of a healthcare analytics platform and reviewing every significant ' +
          'pull request that reaches it.',
        achievements: [
          'Cut the median API response time from 820ms to 140ms by rewriting the reporting queries and adding a materialised view',
          'Migrated 40 services from EC2 to Kubernetes with no customer-facing downtime',
          'Grew the team from 2 to 6 engineers, running the interviews and the first six months of mentoring for each',
          'Took the deployment pipeline from a weekly release to 15 deploys a day',
        ],
      },
      {
        company: 'Leapfrog Technology',
        position: 'Senior Software Engineer',
        location: 'Lalitpur',
        startDate: '2019-08',
        endDate: '2022-02',
        description:
          'Worked on a logistics platform used by three enterprise clients, building REST ' +
          'APIs in Node.js and Express and the React front end that consumed them.',
        achievements: [
          'Designed the event pipeline that now processes 2.4 million shipment updates a day',
          'Reduced the front-end bundle by 61%, taking first contentful paint under 1.2 seconds',
          'Introduced integration testing to a codebase with none, reaching 78% coverage in two quarters',
          'Mentored four junior engineers, two of whom were promoted within the year',
        ],
      },
      {
        company: 'Verisk Nepal',
        position: 'Software Engineer',
        location: 'Kathmandu',
        startDate: '2017-06',
        endDate: '2019-07',
        description:
          'Built and maintained internal tools for an insurance analytics group, working in ' +
          'Python and PostgreSQL against a data warehouse of about 900 million rows.',
        achievements: [
          'Automated a monthly reconciliation that had taken two analysts three days each',
          'Rewrote the nightly ETL to run in 40 minutes rather than 6 hours',
          'Added role-based access to a tool used by 220 staff across three offices',
        ],
      },
      {
        company: 'Yomari Incorporated',
        position: 'Junior Software Engineer',
        location: 'Lalitpur',
        startDate: '2016-01',
        endDate: '2017-05',
        description:
          'First engineering role, working on a retail point-of-sale product in Java and ' +
          'JavaScript, fixing defects and shipping small features alongside a senior engineer.',
        achievements: [
          'Closed 180 defects in 16 months, the highest count on the team',
          'Built the receipt printing module still in use across 60 stores',
        ],
      },
    ],
    education: [
      {
        institution: 'Pulchowk Campus, Institute of Engineering',
        degree: 'BE',
        fieldOfStudy: 'Computer Engineering',
        startDate: '2011-08',
        endDate: '2015-11',
        grade: '3.71 GPA',
        description:
          'Final year project: a distributed file store with erasure coding, written in Go ' +
          'and presented at the departmental showcase.',
      },
    ],
    skills: [
      { name: 'Node.js', level: 'Expert' },
      { name: 'TypeScript', level: 'Expert' },
      { name: 'React', level: 'Advanced' },
      { name: 'PostgreSQL', level: 'Advanced' },
      { name: 'MongoDB', level: 'Advanced' },
      { name: 'Express', level: 'Expert' },
      { name: 'REST API', level: 'Expert' },
      { name: 'Docker', level: 'Advanced' },
      { name: 'Kubernetes', level: 'Intermediate' },
      { name: 'AWS', level: 'Advanced' },
      { name: 'CI/CD', level: 'Advanced' },
      { name: 'Python', level: 'Intermediate' },
      { name: 'System Design', level: 'Advanced' },
      { name: 'Mentoring', level: 'Advanced' },
      { name: 'Agile', level: 'Advanced' },
      { name: 'Git', level: 'Expert' },
    ],
    projects: [
      {
        name: 'Sanjaal',
        role: 'Author and maintainer',
        description:
          'An open-source scheduling library for Node.js that survives process restarts by ' +
          'keeping its queue in PostgreSQL. Around 900 stars and used by a handful of ' +
          'companies in production.',
        technologies: 'Node.js, TypeScript, PostgreSQL',
        link: 'github.com/rijan-demo/sanjaal',
      },
      {
        name: 'Himal Observability Stack',
        role: 'Technical lead',
        description:
          'A shared Prometheus, Grafana and Loki deployment for four product teams, with ' +
          'dashboards and alerting defined as code so a new service is onboarded by one ' +
          'pull request.',
        technologies: 'Terraform, Kubernetes, Prometheus, Grafana',
      },
      {
        name: 'Nepali Date Picker',
        role: 'Author',
        description:
          'A React component for the Bikram Sambat calendar, written because every existing ' +
          'one failed accessibility testing. Keyboard navigable and screen-reader tested.',
        technologies: 'React, TypeScript',
        link: 'github.com/rijan-demo/bs-datepicker',
      },
    ],
    certifications: [
      {
        name: 'AWS Certified Solutions Architect, Associate',
        issuer: 'Amazon Web Services',
        date: '2023-05',
        link: 'credly.com/rijan-demo/aws-saa',
      },
      {
        name: 'Certified Kubernetes Administrator',
        issuer: 'Cloud Native Computing Foundation',
        date: '2022-09',
      },
      {
        name: 'Professional Scrum Master I',
        issuer: 'Scrum.org',
        date: '2021-02',
      },
    ],
    languages: [
      { language: 'Nepali', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
      { language: 'Hindi', proficiency: 'Conversational' },
    ],
    references: [],
    referencesOnRequest: true,
  },
];

// --- Seeding ---------------------------------------------------------------

/**
 * Finds a user by email, creating them if they are not there yet.
 *
 * An existing account is left exactly as it is — in particular its
 * password, because this is very likely an account you already sign in
 * with and silently resetting it would be unhelpful.
 *
 * @param {{name: string, email: string}} person - Who to find or create.
 * @returns {Promise<{user: object, created: boolean}>}
 */
async function findOrCreateUser(person) {
  const email = person.email.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    // A soft-deleted or blocked account would make the demo fail in a
    // confusing way, so it is reinstated.
    if (existing.isDeleted || existing.status !== 'active') {
      existing.isDeleted = false;
      existing.status = 'active';
      await existing.save();
    }
    return { user: existing, created: false };
  }

  const user = await User.create({
    name: person.name,
    email,
    passwordHash: DEMO_PASSWORD, // hashed by the model's pre-save hook
    role: 'user',
    status: 'active',
  });

  return { user, created: true };
}

/**
 * Posts the adverts under the employer's company.
 * @param {object} employer - The employer user document.
 * @returns {Promise<{created: number, updated: number}>}
 */
async function seedJobs(employer) {
  const company = await Company.findOneAndUpdate(
    { owner: employer._id },
    { $set: { ...EMPLOYER_COMPANY, owner: employer._id, isDeleted: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let created = 0;
  let updated = 0;

  for (const job of JOBS) {
    const existing = await Job.findOne({ title: job.title, company: company._id });

    if (existing) {
      Object.assign(existing, job, { isDeleted: false, status: 'open' });
      await existing.save();
      updated += 1;
    } else {
      await Job.create({ ...job, company: company._id, postedBy: employer._id });
      created += 1;
    }
  }

  return { created, updated, company };
}

/**
 * Puts the demo CVs on the seeker's account.
 *
 * Each is saved with `save()` rather than `insertMany`, because the
 * strength score is calculated by the model's pre-save hook and
 * bypassing it would leave every CV showing zero.
 *
 * @param {object} seeker - The user the CVs belong to.
 * @returns {Promise<Array<object>>} The saved CVs.
 */
async function seedCVs(seeker) {
  const saved = [];

  // Only one CV may be primary, and these are about to set one. Clearing
  // first means re-running the script cannot leave two.
  await CV.updateMany({ user: seeker._id }, { $set: { isPrimary: false } });

  for (const { expect: _expectation, ...content } of CVS) {
    const existing = await CV.findOne({ user: seeker._id, title: content.title });
    const cv = existing ?? new CV({ user: seeker._id, title: content.title });

    Object.assign(cv, content, { user: seeker._id, isDeleted: false });
    await cv.save();

    saved.push(cv);
  }

  return saved;
}

/** Seeds both accounts and prints what to do with them. */
async function seedQaDemo() {
  await connectDB(env.mongoUri);

  const { user: seeker, created: seekerCreated } = await findOrCreateUser(SEEKER);
  const { user: employer, created: employerCreated } = await findOrCreateUser(EMPLOYER);

  const jobs = await seedJobs(employer);
  const cvs = await seedCVs(seeker);

  const primary = cvs.find((cv) => cv.isPrimary);

  console.log('');
  console.log('[seed:qa-demo] Seeker account');
  console.log(
    `  ${seeker.email}${seekerCreated ? `  (created, password ${DEMO_PASSWORD})` : '  (already existed, password unchanged)'}`,
  );
  console.log('');
  console.log('[seed:qa-demo] CVs');
  for (const cv of cvs) {
    const expectation = CVS.find((entry) => entry.title === cv.title)?.expect ?? '';
    const star = cv.isPrimary ? '*' : ' ';
    console.log(
      `  ${star} ${cv.title.padEnd(28)} strength ${String(cv.strengthScore).padStart(3)}  — ${expectation}`,
    );
  }
  console.log('  (* = primary, the CV the Rewrite button starts from)');
  console.log('');
  console.log('[seed:qa-demo] Employer account');
  console.log(
    `  ${employer.email}${employerCreated ? `  (created, password ${DEMO_PASSWORD})` : '  (already existed, password unchanged)'}`,
  );
  console.log(`  Company: ${jobs.company.name}`);
  console.log(`  ${jobs.created} job(s) created, ${jobs.updated} updated, ${JOBS.length} total`);
  for (const job of JOBS) console.log(`    - ${job.title}`);
  console.log('');
  console.log('[seed:qa-demo] To try the rewrite:');
  console.log(`  1. Sign in as ${seeker.email}`);
  console.log(`  2. Browse jobs, open "Senior Backend Engineer"`);
  console.log(`  3. Press "Rewrite CV" — it starts from "${primary?.title}"`);
  console.log('     That CV already runs past one page, so expect the page-fill step');
  console.log('     to do nothing and almost nothing to be assumed.');
  console.log('  4. Then open "Engineering Manager" or "Platform Engineer" for the');
  console.log('     adjacent case, where the rewrite has to work harder.');
  console.log('  5. Star a short CV in My CVs — the Retail Assistant one — to see the');
  console.log('     opposite end: the most assumptions, and a page the rewrite cannot fill.');
  console.log('');

  await disconnectDB();
}

seedQaDemo().catch(async (error) => {
  console.error('[seed:qa-demo] failed:', error.message);
  if (mongoose.connection.readyState === 1) await disconnectDB();
  process.exit(1);
});
