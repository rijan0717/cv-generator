/**
 * Demo data for the candidate directory.
 *
 * Creates everything needed to try the feature end to end without
 * clicking through registration eight times:
 *
 *   - Two employers. One company is **approved**, so that account can
 *     browse candidates. The other is left **pending**, so the approval
 *     notice can be seen as well — a feature that is only ever tried in
 *     its working state is half tested.
 *   - Eight job seekers across six industries, with photos left empty but
 *     every other profile field filled: position, industry, years of
 *     experience, location, the kinds of work they want, and whether they
 *     are open to work. Five are open, three are not, so the "open to
 *     work only" filter has something to remove.
 *   - One primary CV each, plus a second, non-primary CV for one of them,
 *     so it is visible that the directory shows the primary one and not
 *     simply the newest.
 *   - Four adverts under the approved company.
 *
 * Running it twice is safe: people are matched on email, companies on
 * their owner and jobs on their title, then updated rather than
 * duplicated.
 *
 * Usage: npm run seed:talent
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Job } from '../src/models/Job.js';
import { CV } from '../src/models/CV.js';

/**
 * The password every account here is created with. Meets the
 * registration rules: at least eight characters, a letter and a digit.
 * An account that already exists keeps the password it has.
 */
const DEMO_PASSWORD = 'demo12345';

// --- The two employers -----------------------------------------------------

const EMPLOYERS = [
  {
    name: 'Sunita Rana',
    email: 'employer.approved@demo.test',
    company: {
      name: 'Himalaya Tech',
      description: 'A software house used to demonstrate the approved-employer experience.',
      location: 'Kathmandu',
      industry: 'Software',
      registrationNumber: 'REG-100200',
      phone: '+977 1 4001001',
      email: 'hello@himalayatech.test',
      status: 'approved',
    },
  },
  {
    name: 'Bikash Thapa',
    email: 'employer.pending@demo.test',
    company: {
      name: 'Everest Staffing',
      description: 'Left waiting for approval, so the access notice can be seen.',
      location: 'Pokhara',
      industry: 'Recruitment',
      registrationNumber: 'REG-100300',
      phone: '+977 61 400200',
      email: 'hello@everest-staffing.test',
      status: 'pending',
    },
  },
];

// --- The candidates --------------------------------------------------------

/**
 * Eight people, spread across industries so the industry filter has
 * something to separate, and across availability so the open-to-work
 * filter does too.
 */
const CANDIDATES = [
  {
    name: 'Anjali Shrestha',
    email: 'anjali.candidate@demo.test',
    profile: {
      position: 'React Developer',
      industry: 'technology',
      yearsExperience: 4,
      openToWork: true,
      employmentTypes: ['full-time', 'contract'],
      location: 'Kathmandu',
      about: 'Front-end developer working mostly in React and TypeScript for the last four years.',
    },
    cv: {
      title: 'React Developer CV',
      headline: 'React Developer',
      summary:
        'Front-end developer with four years building React applications for finance and ' +
        'retail clients. Led the rewrite of a booking flow that cut drop-off by 18 per cent.',
      skills: ['React', 'TypeScript', 'Redux', 'Tailwind CSS', 'Jest', 'REST APIs'],
      experience: {
        company: 'Himal Digital',
        position: 'Front-end Developer',
        description:
          'Built and maintained the customer portal in React. Introduced component tests with ' +
          'Jest, taking coverage from 20 to 75 per cent. Reduced bundle size by 40 per cent.',
      },
      education: { institution: 'Tribhuvan University', degree: 'BSc', field: 'Computer Science' },
    },
  },
  {
    name: 'Prakash Adhikari',
    email: 'prakash.candidate@demo.test',
    profile: {
      position: 'Junior Accountant',
      industry: 'accounting-finance',
      yearsExperience: 2,
      openToWork: true,
      employmentTypes: ['full-time'],
      location: 'Lalitpur',
      about: 'Part-qualified accountant handling bookkeeping, VAT returns and payroll.',
    },
    cv: {
      title: 'Accounting CV',
      headline: 'Junior Accountant',
      summary:
        'Part-qualified accountant with two years in practice, handling bookkeeping, VAT ' +
        'returns and payroll for a portfolio of 30 small businesses.',
      skills: ['Bookkeeping', 'VAT returns', 'Payroll', 'Excel', 'Xero', 'Reconciliation'],
      experience: {
        company: 'Sagarmatha Associates',
        position: 'Accounts Assistant',
        description:
          'Prepared monthly management accounts for 30 clients. Reconciled bank accounts and ' +
          'filed quarterly VAT returns, with no late submissions in two years.',
      },
      education: { institution: 'Tribhuvan University', degree: 'BBS', field: 'Accountancy' },
    },
  },
  {
    name: 'Sita Gurung',
    email: 'sita.candidate@demo.test',
    profile: {
      position: 'Registered Nurse',
      industry: 'healthcare',
      yearsExperience: 7,
      openToWork: true,
      employmentTypes: ['full-time', 'part-time'],
      location: 'Pokhara',
      about: 'Ward nurse with seven years on medical and surgical wards.',
    },
    cv: {
      title: 'Nursing CV',
      headline: 'Registered Nurse',
      summary:
        'Registered nurse with seven years across medical and surgical wards, including two ' +
        'years as a shift lead for a team of six.',
      skills: ['Patient care', 'Triage', 'Medication administration', 'Record keeping', 'Training'],
      experience: {
        company: 'Western Regional Hospital',
        position: 'Staff Nurse',
        description:
          'Led a team of six on night shifts. Cut medication recording errors to zero over ' +
          'twelve months by introducing a double-check at handover.',
      },
      education: { institution: 'Pokhara University', degree: 'BSc', field: 'Nursing' },
    },
  },
  {
    name: 'Rajesh Maharjan',
    email: 'rajesh.candidate@demo.test',
    profile: {
      position: 'Civil Engineer',
      industry: 'construction',
      yearsExperience: 9,
      openToWork: false,
      employmentTypes: ['full-time'],
      location: 'Bhaktapur',
      about: 'Site engineer on residential and commercial projects.',
    },
    cv: {
      title: 'Civil Engineering CV',
      headline: 'Site Engineer',
      summary:
        'Civil engineer with nine years on residential and commercial sites, responsible for ' +
        'setting out, quality checks and subcontractor coordination.',
      skills: ['AutoCAD', 'Site supervision', 'Quantity estimation', 'Quality control', 'Safety'],
      experience: {
        company: 'Kailash Builders',
        position: 'Site Engineer',
        description:
          'Supervised a 40-unit housing project delivered three weeks ahead of programme. ' +
          'Managed eight subcontractors and weekly progress reporting to the client.',
      },
      education: { institution: 'Pulchowk Campus', degree: 'BE', field: 'Civil Engineering' },
    },
  },
  {
    name: 'Manisha Karki',
    email: 'manisha.candidate@demo.test',
    profile: {
      position: 'Graphic Designer',
      industry: 'design-media',
      yearsExperience: 3,
      openToWork: true,
      employmentTypes: ['freelance', 'part-time', 'contract'],
      location: 'Kathmandu',
      about: 'Designer working on brand identity and social campaigns.',
    },
    cv: {
      title: 'Design Portfolio CV',
      headline: 'Graphic Designer',
      summary:
        'Graphic designer with three years on brand identity and social campaigns for ' +
        'hospitality and retail clients.',
      skills: ['Figma', 'Illustrator', 'Photoshop', 'Brand identity', 'Typography'],
      experience: {
        company: 'Studio Chautari',
        position: 'Designer',
        description:
          'Designed brand identities for 12 clients. Ran a social campaign that grew a ' +
          'restaurant client following from 2,000 to 11,000 in six months.',
      },
      education: { institution: 'Kathmandu University', degree: 'BFA', field: 'Graphic Design' },
    },
  },
  {
    name: 'Dipesh Lama',
    email: 'dipesh.candidate@demo.test',
    profile: {
      position: 'Secondary School Teacher',
      industry: 'education',
      yearsExperience: 11,
      openToWork: false,
      employmentTypes: ['full-time'],
      location: 'Chitwan',
      about: 'Mathematics teacher and head of department.',
    },
    cv: {
      title: 'Teaching CV',
      headline: 'Mathematics Teacher',
      summary:
        'Mathematics teacher with eleven years in secondary education, five of them as head ' +
        'of department for a team of four.',
      skills: ['Lesson planning', 'Curriculum design', 'Assessment', 'Mentoring', 'Reporting'],
      experience: {
        company: 'Narayani Secondary School',
        position: 'Head of Mathematics',
        description:
          'Raised the pass rate from 68 to 91 per cent over four years by rewriting the ' +
          'scheme of work and introducing weekly intervention sessions.',
      },
      education: { institution: 'Tribhuvan University', degree: 'MEd', field: 'Mathematics' },
    },
  },
  {
    name: 'Nisha Bhandari',
    email: 'nisha.candidate@demo.test',
    profile: {
      position: 'Digital Marketing Executive',
      industry: 'marketing-sales',
      yearsExperience: 1,
      openToWork: true,
      employmentTypes: ['full-time', 'internship'],
      location: 'Kathmandu',
      about: 'Recent graduate running paid social and email campaigns.',
    },
    cv: {
      title: 'Marketing CV',
      headline: 'Digital Marketing Executive',
      summary:
        'Marketing graduate with a year running paid social and email campaigns for an ' +
        'e-commerce brand.',
      skills: ['Google Ads', 'Meta Ads', 'Email marketing', 'Analytics', 'Copywriting', 'SEO'],
      experience: {
        company: 'Bazaar Online',
        position: 'Marketing Assistant',
        description:
          'Ran paid social with a monthly budget of Rs 200,000 and improved return on ad ' +
          'spend from 2.1 to 3.4 over two quarters.',
      },
      education: { institution: 'Kathmandu University', degree: 'BBA', field: 'Marketing' },
    },
  },
  {
    name: 'Suman Khadka',
    email: 'suman.candidate@demo.test',
    profile: {
      position: 'Logistics Coordinator',
      industry: 'logistics-transport',
      yearsExperience: 5,
      openToWork: false,
      employmentTypes: ['full-time', 'contract'],
      location: 'Birgunj',
      about: 'Coordinator handling customs documentation and fleet scheduling.',
    },
    cv: {
      title: 'Logistics CV',
      headline: 'Logistics Coordinator',
      summary:
        'Logistics coordinator with five years in cross-border freight, handling customs ' +
        'documentation and scheduling for a fleet of 20 vehicles.',
      skills: ['Customs documentation', 'Fleet scheduling', 'Inventory', 'ERP', 'Negotiation'],
      experience: {
        company: 'Terai Freight',
        position: 'Logistics Coordinator',
        description:
          'Cut average border clearance time from four days to two by rebuilding the ' +
          'documentation checklist and pre-filing with agents.',
      },
      education: { institution: 'Tribhuvan University', degree: 'BBS', field: 'Management' },
    },
  },
];

/** A second CV for the first candidate, left non-primary on purpose. */
const SECOND_CV = {
  ownerEmail: 'anjali.candidate@demo.test',
  title: 'Older React CV (not primary)',
  headline: 'Junior Front-end Developer',
  summary: 'An earlier version of the CV, kept to show that the directory uses the primary one.',
  skills: ['React', 'JavaScript', 'CSS'],
  experience: {
    company: 'Himal Digital',
    position: 'Junior Developer',
    description: 'Worked on the customer portal under supervision.',
  },
  education: { institution: 'Tribhuvan University', degree: 'BSc', field: 'Computer Science' },
};

// --- The adverts -----------------------------------------------------------

const JOBS = [
  {
    title: 'React Developer',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    location: 'Kathmandu',
    skills: ['React', 'TypeScript', 'REST APIs', 'Jest'],
    description:
      'We are looking for a React developer to join our product team. You will build and ' +
      'maintain features in React and TypeScript, write component and integration tests, and ' +
      'work with designers to turn Figma designs into accessible interfaces. Experience with ' +
      'REST APIs, state management and a testing framework such as Jest is expected.',
  },
  {
    title: 'Accounts Assistant',
    jobType: 'Full-time',
    workMode: 'On-site',
    location: 'Lalitpur',
    skills: ['Bookkeeping', 'VAT', 'Excel', 'Payroll'],
    description:
      'An accounts assistant is needed to support our finance team with bookkeeping, VAT ' +
      'returns, payroll and bank reconciliation. You will prepare monthly management accounts ' +
      'and assist with the year-end audit. Strong Excel skills and experience of accounting ' +
      'software such as Xero are expected.',
  },
  {
    title: 'Graphic Designer (Contract)',
    jobType: 'Contract',
    workMode: 'Remote',
    location: 'Remote',
    skills: ['Figma', 'Illustrator', 'Brand identity'],
    description:
      'A six-month contract for a graphic designer to deliver brand identity work and social ' +
      'campaign assets. You will work in Figma and Illustrator, present concepts to clients, ' +
      'and hand over production-ready files. A portfolio of brand work is expected.',
  },
  {
    title: 'Marketing Intern',
    jobType: 'Internship',
    workMode: 'On-site',
    location: 'Kathmandu',
    skills: ['Social media', 'Copywriting', 'Analytics'],
    description:
      'A six-month internship supporting our marketing team with social media, email ' +
      'campaigns and reporting. You will draft copy, schedule posts and prepare a monthly ' +
      'analytics summary. Suitable for a recent graduate in marketing or communications.',
  },
];

// --- Builders --------------------------------------------------------------

/**
 * Finds a user by email, or creates one with the demo password.
 * @param {{name: string, email: string}} person - Who to find or create.
 * @returns {Promise<object>} The user document.
 */
async function findOrCreateUser(person) {
  const existing = await User.findOne({ email: person.email });
  if (existing) return existing;

  // `create` rather than `insertMany`, so the password is hashed and the
  // role is kept in step with the account type by the model's hooks.
  return User.create({
    name: person.name,
    email: person.email,
    passwordHash: DEMO_PASSWORD,
    status: 'active',
  });
}

/**
 * Turns the compact CV description above into a full CV document.
 *
 * Every CV gets education, experience, skills and contact details,
 * because a CV missing those scores badly and the directory would show a
 * thin, unrepresentative preview.
 *
 * @param {object} user - The owner.
 * @param {object} shape - One of the `cv` blocks above.
 * @param {boolean} isPrimary - Whether this is the CV employers see.
 * @returns {Promise<object>} The saved CV.
 */
async function upsertCV(user, shape, isPrimary) {
  const fields = {
    user: user._id,
    title: shape.title,
    templateKey: 'modern',
    isPrimary,
    personal: {
      fullName: user.name,
      headline: shape.headline,
      email: user.email,
      phone: '+977 9800000000',
      address: 'Kathmandu, Nepal',
    },
    summary: shape.summary,
    education: [
      {
        institution: shape.education.institution,
        degree: shape.education.degree,
        fieldOfStudy: shape.education.field,
        startDate: new Date('2015-07-01'),
        endDate: new Date('2019-06-30'),
        grade: 'First division',
        description: '',
      },
    ],
    experience: [
      {
        company: shape.experience.company,
        position: shape.experience.position,
        location: 'Nepal',
        startDate: new Date('2021-01-01'),
        endDate: null,
        isCurrent: true,
        description: shape.experience.description,
        achievements: [],
      },
    ],
    skills: shape.skills.map((name) => ({ name, level: 'Advanced' })),
    languages: [
      { language: 'Nepali', proficiency: 'Native' },
      { language: 'English', proficiency: 'Professional' },
    ],
  };

  const existing = await CV.findOne({ user: user._id, title: shape.title });
  const cv = existing ?? new CV(fields);

  if (existing) Object.assign(cv, fields);

  // Saved rather than updated in place, so the strength score hook runs
  // and the dashboard shows a real score for each of these CVs.
  await cv.save();
  return cv;
}

/**
 * Creates or updates one employer, their company and its approval state.
 * @param {object} entry - One of EMPLOYERS.
 * @param {object} admin - The admin recorded as the reviewer.
 * @returns {Promise<{user: object, company: object}>}
 */
async function upsertEmployer(entry, admin) {
  const user = await findOrCreateUser(entry);

  user.accountType = 'employer';
  await user.save(); // the syncRole hook writes role: 'employer'

  const isApproved = entry.company.status === 'approved';

  const company = await Company.findOneAndUpdate(
    { owner: user._id },
    {
      $set: {
        ...entry.company,
        owner: user._id,
        // An approved company carries who approved it and when, exactly as
        // the admin screen would have written them.
        reviewedAt: isApproved ? new Date() : null,
        reviewedBy: isApproved ? admin?._id ?? null : null,
        rejectionReason: '',
        submittedAt: new Date(),
        isDeleted: false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return { user, company };
}

// --- The script ------------------------------------------------------------

async function seed() {
  await connectDB(env.mongoUri);

  // Used only to fill in "reviewed by" on the approved company. The script
  // does not create an admin: `npm run seed:admin` does that.
  const admin = await User.findOne({ role: 'admin' });

  const employers = [];
  for (const entry of EMPLOYERS) {
    employers.push(await upsertEmployer(entry, admin));
  }

  const approved = employers.find((entry) => entry.company.status === 'approved');

  // The adverts, under the approved company.
  let jobCount = 0;
  for (const job of JOBS) {
    await Job.findOneAndUpdate(
      { company: approved.company._id, title: job.title },
      {
        $set: {
          ...job,
          company: approved.company._id,
          postedBy: approved.user._id,
          status: 'open',
          isDeleted: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    jobCount += 1;
  }

  // The candidates, each with a primary CV.
  for (const entry of CANDIDATES) {
    const user = await findOrCreateUser(entry);

    user.accountType = 'jobseeker';
    user.jobSeekerProfile = entry.profile;
    await user.save(); // syncRole writes role: 'jobseeker'

    await upsertCV(user, entry.cv, true);
  }

  // The extra, non-primary CV.
  const secondOwner = await User.findOne({ email: SECOND_CV.ownerEmail });
  if (secondOwner) await upsertCV(secondOwner, SECOND_CV, false);

  const openCount = CANDIDATES.filter((entry) => entry.profile.openToWork).length;

  console.log('[seed:talent] Done.');
  console.log(`  Employers: ${employers.length} (1 approved, 1 pending)`);
  console.log(`  Candidates: ${CANDIDATES.length} (${openCount} open to work)`);
  console.log(`  CVs: ${CANDIDATES.length + 1} (one extra, not primary)`);
  console.log(`  Jobs: ${jobCount}`);
  console.log('');
  console.log(`  Password for every account created here: ${DEMO_PASSWORD}`);
  console.log('  Approved employer: employer.approved@demo.test  (can browse candidates)');
  console.log('  Pending employer:  employer.pending@demo.test   (sees the approval notice)');
  console.log('  A candidate:       anjali.candidate@demo.test   (has two CVs, one primary)');

  if (!admin) {
    console.log('');
    console.log('  Note: no admin account found. Run `npm run seed:admin` to create one.');
  }

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:talent] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
