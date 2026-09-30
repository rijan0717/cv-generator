/**
 * Puts ten sample jobs on the board, posted by the admin account.
 *
 * This exists so the CV–Job Match Analyser can be tried out — and
 * demonstrated in the viva — without anyone having to type adverts in by
 * hand. The ten cover different fields on purpose: a CV that matches the
 * backend advert strongly should match the nursing one poorly, and that
 * contrast is the clearest way to show the analyser works.
 *
 * Running it twice is safe. Jobs are matched on their title and updated
 * rather than duplicated.
 *
 * Usage: npm run seed:jobs
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Job } from '../src/models/Job.js';

/** The company the sample jobs are posted under. */
const COMPANY = {
  name: 'Demo Recruitment',
  description:
    'A sample employer used to demonstrate the job board and the CV–Job Match Analyser.',
  location: 'Kathmandu',
  industry: 'Recruitment',
};

/** Ten adverts, spread across fields so match scores differ clearly. */
const JOBS = [
  {
    title: 'Backend Developer',
    description:
      'We are looking for a backend developer to design and build REST APIs using Node.js and ' +
      'Express. You will model data in MongoDB, write unit tests with Jest, containerise ' +
      'services with Docker and help maintain our CI/CD pipeline on AWS. You will review ' +
      'colleagues code, work in two week sprints and take part in architecture discussions. ' +
      'Experience with Redis, Kubernetes or GraphQL is an advantage but not required.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 60,000 - 90,000 per month',
    skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'AWS', 'REST API'],
  },
  {
    title: 'Frontend Developer',
    description:
      'Frontend developer needed to build responsive, accessible user interfaces with React ' +
      'and TypeScript. You will turn Figma designs into reusable components, manage state, ' +
      'style with Tailwind CSS and make sure everything works across browsers and on mobile. ' +
      'You will write unit tests, measure and improve page performance, and work closely with ' +
      'designers and backend engineers. Familiarity with Next.js and Vite is welcome.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 55,000 - 80,000 per month',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'HTML', 'CSS', 'Git'],
  },
  {
    title: 'Full Stack Developer (MERN)',
    description:
      'Full stack developer to own features end to end across a MERN application. You will ' +
      'build React interfaces, write Express APIs, design MongoDB schemas and deploy to AWS. ' +
      'We expect confident use of Git, an eye for clean readable code, and the judgement to ' +
      'know when a feature is finished. You will work directly with the product owner, so ' +
      'clear written communication matters as much as the code.',
    location: 'Lalitpur',
    jobType: 'Full-time',
    workMode: 'Remote',
    salaryRange: 'NPR 70,000 - 110,000 per month',
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Git'],
  },
  {
    title: 'QA Engineer',
    description:
      'QA engineer to own the quality of our web platform. You will write and maintain test ' +
      'plans, carry out functional, regression and exploratory testing, and automate the ' +
      'repetitive cases with Selenium or Cypress. You will raise clear, reproducible defect ' +
      'reports, verify fixes and report on release readiness. Experience testing REST APIs ' +
      'with Postman and reading application logs to isolate a fault is expected.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 50,000 - 75,000 per month',
    skills: ['Selenium', 'Cypress', 'Postman', 'Test Automation', 'SQL'],
  },
  {
    title: 'Data Analyst',
    description:
      'Data analyst to turn raw operational data into decisions. You will write SQL against ' +
      'our data warehouse, clean and model data in Python with pandas, and build dashboards ' +
      'in Power BI that the leadership team actually uses. You will be expected to explain ' +
      'what a number means and how confident we should be in it, not simply produce a chart. ' +
      'Experience with statistics and A/B testing is an advantage.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 55,000 - 85,000 per month',
    skills: ['SQL', 'Python', 'Power BI', 'Excel', 'Data Analysis'],
  },
  {
    title: 'DevOps Engineer',
    description:
      'DevOps engineer to look after our build, release and monitoring. You will maintain ' +
      'CI/CD pipelines, manage infrastructure as code with Terraform, run containerised ' +
      'workloads on Kubernetes and keep our AWS estate secure and affordable. You will set up ' +
      'monitoring and alerting, take part in an on-call rota, and lead incident reviews. ' +
      'Strong Linux and shell scripting are essential.',
    location: 'Remote',
    jobType: 'Full-time',
    workMode: 'Remote',
    salaryRange: 'NPR 90,000 - 140,000 per month',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Terraform'],
  },
  {
    title: 'UI/UX Designer',
    description:
      'UI/UX designer to shape how our products look and feel. You will run user interviews ' +
      'and usability tests, map user journeys, and produce wireframes and high fidelity ' +
      'prototypes in Figma. You will maintain our design system and work alongside developers ' +
      'to see designs through to release. A portfolio showing your reasoning, not only the ' +
      'finished screens, is what we want to see.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryRange: 'NPR 50,000 - 80,000 per month',
    skills: ['Figma', 'Adobe XD', 'Wireframing', 'Prototyping', 'User Research'],
  },
  {
    title: 'Digital Marketing Executive',
    description:
      'Digital marketing executive to grow our audience and our pipeline. You will plan and ' +
      'run campaigns across social media and email, write content for the blog, improve our ' +
      'search engine rankings and report on what each channel actually returned. You will use ' +
      'Google Analytics to measure results and adjust spend accordingly. Confident written ' +
      'English and a habit of testing rather than guessing are essential.',
    location: 'Kathmandu',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 35,000 - 55,000 per month',
    skills: ['SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing'],
  },
  {
    title: 'Accounts Officer',
    description:
      'Accounts officer to maintain our books and support the month end close. You will post ' +
      'journals, reconcile bank and supplier accounts, prepare VAT returns and help produce ' +
      'management accounts. You will work in accounting software day to day and use ' +
      'spreadsheets heavily, so confident Excel including pivot tables and lookups is ' +
      'required. A background in bookkeeping or a related qualification is preferred.',
    location: 'Bhaktapur',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 35,000 - 50,000 per month',
    skills: ['Excel', 'Accounting', 'Bookkeeping', 'Taxation', 'Financial Reporting'],
  },
  {
    title: 'Staff Nurse',
    description:
      'Staff nurse required for a busy surgical ward. You will assess, plan and deliver care ' +
      'for post operative patients, administer medication safely, monitor vital signs and ' +
      'keep accurate clinical records. You will support and supervise junior colleagues and ' +
      'communicate clearly with patients and their families. Current nursing registration and ' +
      'recent ward experience are essential.',
    location: 'Pokhara',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: 'NPR 40,000 - 60,000 per month',
    skills: ['Patient Care', 'Communication', 'Teamwork'],
  },
];

/**
 * Creates the sample company and its jobs under the admin account.
 * @returns {Promise<void>}
 */
async function seedJobs() {
  if (!env.admin.email) {
    console.error('[seed:jobs] ADMIN_EMAIL must be set in server/.env');
    process.exitCode = 1;
    return;
  }

  await connectDB(env.mongoUri);

  const admin = await User.findOne({ email: env.admin.email.toLowerCase(), role: 'admin' });

  if (!admin) {
    console.error('[seed:jobs] No admin account found. Run `npm run seed:admin` first.');
    await disconnectDB();
    process.exitCode = 1;
    return;
  }

  // One company per user, so this is an upsert rather than a create.
  const company = await Company.findOneAndUpdate(
    { owner: admin._id },
    { $set: { ...COMPANY, owner: admin._id, isDeleted: false } },
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
      await Job.create({ ...job, company: company._id, postedBy: admin._id });
      created += 1;
    }
  }

  console.log(`[seed:jobs] Company: ${company.name} (owner ${admin.email})`);
  console.log(`[seed:jobs] ${created} job(s) created, ${updated} updated, ${JOBS.length} total`);

  await disconnectDB();
}

seedJobs().catch(async (error) => {
  console.error('[seed:jobs] failed:', error.message);
  if (mongoose.connection.readyState === 1) await disconnectDB();
  process.exit(1);
});
