/**
 * The invented people the template gallery fills its thumbnails with.
 *
 * One person per template, each in a different profession, so the gallery
 * reads as forty real-looking CVs rather than one CV forty times — and so a
 * user browsing for "something for an accountant" sees an accountant's CV.
 *
 * Every person and company here is made up. The photos are drawn avatars
 * built as inline SVG by `avatarUrl()` below, so there is nothing to
 * license and nothing to download before the gallery can render.
 *
 * Each person is written compactly as a row of plain values and expanded by
 * `toCV()`, which is what keeps forty full CVs readable in one file.
 */

/** Skin tones for the drawn avatars, light to dark. */
const SKIN = ['#f3cfb0', '#e3b08c', '#c98d68', '#a26a4b', '#784a32'];

/**
 * Draws a simple head-and-shoulders avatar.
 *
 * @param {{skin: number, hair: string, hairColor: string, shirt: string, bg: string}} look
 *   `hair` is one of short, long, bun, curly, wavy, bald, beard.
 * @returns {string} A data URL the templates can use as a photo.
 */
export function avatarUrl({ skin, hair, hairColor, shirt, bg }) {
  const face = SKIN[skin] ?? SKIN[1];
  const longBack =
    hair === 'long' || hair === 'wavy'
      ? `<path d="M36 52c0-23 11-33 24-33s24 10 24 33v34c-5 4-11 4-15 0H51c-4 4-10 4-15 0z" fill="${hairColor}"/>`
      : '';
  const fringe = `<path d="M39 50c0-19 10-28 21-28s21 9 21 28c-4-9-12-13-21-13s-17 4-21 13z" fill="${hairColor}"/>`;
  const top = {
    short: fringe,
    long: fringe,
    wavy: `${fringe}<path d="M38 46c4-6 10-9 16-8" stroke="${hairColor}" stroke-width="6" fill="none"/>`,
    bun: `<circle cx="60" cy="20" r="9" fill="${hairColor}"/>${fringe}`,
    curly: [40, 48, 56, 64, 72, 80]
      .map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 30 : 34}" r="8" fill="${hairColor}"/>`)
      .join(''),
    bald: '',
    beard: `${fringe}<path d="M41 56c2 16 10 22 19 22s17-6 19-22c-4 6-11 8-19 8s-15-2-19-8z" fill="${hairColor}"/>`,
  }[hair];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<rect width="120" height="120" fill="${bg}"/>
${longBack}
<path d="M14 120c2-24 20-36 46-36s44 12 46 36z" fill="${shirt}"/>
<path d="M50 86l10 11 10-11" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="3"/>
<rect x="51" y="66" width="18" height="20" rx="7" fill="${face}"/>
<ellipse cx="60" cy="52" rx="20" ry="23" fill="${face}"/>
${top}
<circle cx="52" cy="53" r="2.2" fill="#2b2420"/>
<circle cx="68" cy="53" r="2.2" fill="#2b2420"/>
<path d="M53 63q7 5 14 0" stroke="#8a4b3c" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\n/g, ''))}`;
}

/** Skill levels by their first letter, to keep the rows below short. */
const LEVEL = { B: 'Beginner', I: 'Intermediate', A: 'Advanced', E: 'Expert' };

/** "Ram Shrestha" → "ram.shrestha" (for the invented email and links). */
function handle(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/\s+/g, '.');
}

/**
 * Expands one compact person into a full CV object.
 * @param {object} person - One entry of PEOPLE.
 * @param {number} index - Its position, used to keep entry ids unique.
 * @returns {object} The CV fields (no settings).
 */
function toCV(person, index) {
  const id = handle(person.name);
  const slug = id.replace(/\./g, '-');
  const entryId = (prefix, i) => `${prefix}${index}-${i}`;

  return {
    personal: {
      fullName: person.name,
      headline: person.headline,
      email: `${id}@example.com`,
      phone: person.phone,
      address: person.city,
      website: person.website ?? '',
      linkedin: `linkedin.com/in/${slug}`,
      github: person.github ? `github.com/${slug}` : '',
      photoUrl: avatarUrl(person.look),
    },
    summary: person.summary,
    experience: person.jobs.map(
      ([company, position, location, start, end, description, achievements], i) => ({
        _id: entryId('x', i),
        company,
        position,
        location,
        startDate: start,
        endDate: end,
        isCurrent: end === '',
        description,
        achievements,
      }),
    ),
    education: person.education.map(
      ([institution, degree, fieldOfStudy, start, end, grade], i) => ({
        _id: entryId('e', i),
        institution,
        degree,
        fieldOfStudy,
        startDate: start,
        endDate: end,
        grade,
        description: '',
      }),
    ),
    skills: person.skills.split(',').map((entry, i) => {
      const [name, level] = entry.split(':');
      return { _id: entryId('s', i), name: name.trim(), level: LEVEL[level] };
    }),
    projects: person.projects.map(([name, role, description, technologies, link], i) => ({
      _id: entryId('p', i),
      name,
      role,
      description,
      technologies,
      link,
    })),
    certifications: person.certifications.map(([name, issuer, date], i) => ({
      _id: entryId('c', i),
      name,
      issuer,
      date,
      credentialLink: '',
    })),
    languages: person.languages.split(',').map((entry, i) => {
      const [language, proficiency] = entry.split(':');
      return { _id: entryId('l', i), language, proficiency };
    }),
    references: [],
    referencesOnRequest: true,
  };
}

/**
 * The people, one per template. Rows:
 *   jobs: [company, position, location, start, end ('' = current), description, [achievements]]
 *   education: [institution, degree, field, start, end, grade]
 *   skills: 'Name:Level, …' with levels B / I / A / E
 *   projects: [name, role, description, [technologies], link]
 *   certifications: [name, issuer, year]
 *   languages: 'Language:Proficiency, …'
 */
const PEOPLE = [
  {
    name: 'Anisha Thapa',
    headline: 'Full-Stack Developer',
    city: 'Lalitpur, Nepal',
    phone: '+977 980 111 2034',
    website: 'anishathapa.dev',
    github: true,
    look: { skin: 1, hair: 'long', hairColor: '#2b1d16', shirt: '#334155', bg: '#dbe4ee' },
    summary:
      'Full-stack developer with four years of experience building and running web applications in React and Node.js. Comfortable across the whole stack, from database schema design through to deployment and on-call, and most interested in making complicated workflows feel simple for the people who have to use them every day. Has led two product teams through a release cycle.',
    jobs: [
      [
        'Himal Digital',
        'Senior Software Engineer',
        'Kathmandu',
        '2023-04',
        '',
        'Lead developer on a booking platform used by 40 partner hotels across the Kathmandu valley.',
        [
          'Cut median page load from 4.1s to 2.2s by moving image processing to a background queue',
          'Designed the REST API and MongoDB schema behind the reservations and payments modules',
          'Introduced end-to-end tests in Playwright, taking release regressions from weekly to rare',
          'Mentored two junior developers through their first production releases',
        ],
      ],
      [
        'Everest Softworks',
        'Software Engineer',
        'Lalitpur',
        '2021-08',
        '2023-03',
        'Built and maintained client websites, internal dashboards and a shared component library.',
        [
          'Delivered 12 client projects on schedule across retail, education and logistics',
          'Introduced automated tests and CI, reducing reported defects by around 30%',
          'Rebuilt the company component library, cutting new-project setup from days to hours',
          'Ran the weekly code review session for a team of six',
        ],
      ],
      [
        'Namaste Labs',
        'Junior Web Developer',
        'Lalitpur',
        '2020-06',
        '2021-07',
        'First development role, working on WordPress and small React front ends.',
        [
          'Converted eight static designs into responsive, accessible pages',
          'Maintained a plugin used across fourteen client sites',
          'Wrote the handover documentation still used for new starters',
        ],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Bachelor of Computer Application',
        'Computer Application',
        '2017-09',
        '2021-06',
        '3.7 CGPA',
      ],
      [
        'St. Xavier’s College',
        'Higher Secondary, Science',
        'Physics and Mathematics',
        '2015-07',
        '2017-06',
        '82%',
      ],
    ],
    skills:
      'JavaScript:E, TypeScript:A, React:E, Node.js:A, Express:A, MongoDB:A, PostgreSQL:I, REST APIs:A, Git:A, Docker:I, Tailwind CSS:A, Playwright:I',
    projects: [
      [
        'Smart CV Generator',
        'Lead Developer',
        'A CV builder with live templates, PDF export and keyword matching against job adverts. Built the template engine and the export pipeline.',
        ['React', 'Express', 'MongoDB', 'Puppeteer'],
        'github.com/anisha-thapa/cv-generator',
      ],
      [
        'Patan Transit Map',
        'Developer',
        'An open-source route map for Lalitpur’s microbus network, assembled from crowd-sourced GPS traces and used by about 3,000 people a month.',
        ['React', 'Leaflet', 'Node.js'],
        'github.com/anisha-thapa/patan-transit',
      ],
    ],
    certifications: [
      ['AWS Certified Cloud Practitioner', 'Amazon Web Services', '2024'],
      ['MongoDB Associate Developer', 'MongoDB University', '2023'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },

  {
    name: 'Rohan Karki',
    headline: 'Marketing Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 981 220 4417',
    website: 'rohankarki.com.np',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#1f1a17', shirt: '#1e293b', bg: '#efe0d5' },
    summary:
      'Marketing manager with seven years of experience across consumer brands and B2B services, running campaigns end to end from positioning through to the spend report. Builds small teams that can plan, produce and measure their own work, and prefers a tested message over a clever one. Comfortable owning a budget and defending it.',
    jobs: [
      [
        'Gorkha Beverages',
        'Marketing Manager',
        'Kathmandu',
        '2022-02',
        '',
        'Lead a team of five covering brand, digital and trade marketing for a portfolio of four drinks brands.',
        [
          'Grew assisted brand awareness from 34% to 51% over two annual tracking waves',
          'Rebuilt the media plan around regional radio and short video, cutting cost per reach by 28%',
          'Launched two products nationally, both hitting first-year volume targets',
          'Set up the first shared reporting dashboard across sales and marketing',
        ],
      ],
      [
        'Sagarmatha Media',
        'Senior Marketing Executive',
        'Kathmandu',
        '2019-06',
        '2022-01',
        'Planned and ran campaigns for eight retained clients in retail, education and hospitality.',
        [
          'Took one education client from 400 to 2,100 qualified enquiries a year',
          'Introduced post-campaign reviews, which became the agency standard',
          'Managed an annual media budget of around NPR 40 million',
          'Trained four executives on campaign measurement and attribution',
        ],
      ],
      [
        'Himalaya Retail Group',
        'Marketing Executive',
        'Pokhara',
        '2017-08',
        '2019-05',
        'Supported store openings and seasonal promotions for a chain of eleven outlets.',
        [
          'Ran launch campaigns for five new stores, each beating opening-week footfall targets',
          'Produced print, radio and in-store material on a fixed quarterly budget',
          'Started the customer mailing list that now reaches 60,000 subscribers',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University School of Management',
        'Master of Business Administration',
        'Marketing',
        '2017-08',
        '2019-07',
        'Distinction',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Business Studies',
        '2013-07',
        '2017-05',
        'First Division',
      ],
    ],
    skills:
      'Campaign Strategy:E, Brand Positioning:A, Digital Advertising:A, Market Research:A, Media Planning:A, Copywriting:I, Google Analytics:A, Meta Ads Manager:A, Budget Management:A, Team Leadership:A, CRM:I, Reporting:A',
    projects: [
      [
        'Everest Fresh Launch',
        'Campaign Lead',
        'National launch of a bottled iced tea, from naming and pack design through to a four-month media plan. Reached 61% of the target audience in the first eight weeks.',
        ['Brand Strategy', 'Media Planning', 'Market Research'],
        '',
      ],
      [
        'Dashain Retail Programme',
        'Campaign Manager',
        'A festival trade campaign across eleven outlets combining in-store activation, regional radio and a referral offer. Delivered the chain’s highest-grossing fortnight to date.',
        ['Trade Marketing', 'Promotions', 'Analytics'],
        '',
      ],
    ],
    certifications: [
      ['Google Analytics 4 Certification', 'Google', '2024'],
      ['Meta Certified Media Buying Professional', 'Meta', '2023'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Fluent',
  },

  {
    name: 'Sofia Marquez',
    headline: 'Graphic Designer',
    city: 'Barcelona, Spain',
    phone: '+34 611 204 889',
    website: 'sofiamarquez.studio',
    github: false,
    look: { skin: 1, hair: 'wavy', hairColor: '#3b2318', shirt: '#be123c', bg: '#fde8ef' },
    summary:
      'Graphic designer with six years of experience in brand identity and packaging, working with food, drink and hospitality clients from first sketch through to print specification. Happiest with a tight brief and a real constraint, and known for artwork that reaches the printer without a single correction. Runs projects solo or alongside a copywriter.',
    jobs: [
      [
        'Estudio Verde',
        'Senior Graphic Designer',
        'Barcelona',
        '2022-03',
        '',
        'Lead designer on brand identity and packaging projects for food and drink clients across Spain and Portugal.',
        [
          'Delivered 23 complete identity systems, each with a written guideline document',
          'Redesigned a regional olive oil range that grew shelf sales 19% in its first year',
          'Built the studio’s artwork checking process, cutting print corrections to near zero',
          'Art-directed photography for six of the studio’s largest accounts',
        ],
      ],
      [
        'Marca Collective',
        'Graphic Designer',
        'Valencia',
        '2019-09',
        '2022-02',
        'Designed brand, print and digital material for small businesses and cultural organisations.',
        [
          'Produced identity and signage for a museum refurbishment seen by 200,000 visitors a year',
          'Set up a shared asset library that halved time spent looking for working files',
          'Handled the full print production chain for 40+ jobs a year',
          'Ran the studio’s intern programme for two cohorts',
        ],
      ],
      [
        'Freelance',
        'Designer',
        'Valencia',
        '2018-06',
        '2019-08',
        'Independent work for restaurants, small retailers and two music festivals.',
        [
          'Built a client base of fourteen regular accounts by word of mouth',
          'Designed festival programmes and signage under one-week turnarounds',
          'Learned print estimating and quoting, which still informs how I scope work',
        ],
      ],
    ],
    education: [
      [
        'Escola Massana, Barcelona',
        'Bachelor of Fine Arts',
        'Graphic Design',
        '2014-09',
        '2018-06',
        'Honours',
      ],
      [
        'Istituto Europeo di Design',
        'Summer Programme',
        'Packaging Design',
        '2017-07',
        '2017-08',
        'Completed',
      ],
    ],
    skills:
      'Brand Identity:E, Packaging Design:E, Typography:E, Adobe Illustrator:E, Adobe InDesign:A, Adobe Photoshop:A, Figma:A, Print Production:A, Art Direction:A, Layout:E, Colour Theory:A, Prepress:I',
    projects: [
      [
        'Olivar del Sur',
        'Lead Designer',
        'Full identity and packaging for a cooperative olive oil brand across nine products, including label artwork, carton design and a retailer guideline document.',
        ['Illustrator', 'InDesign', 'Print Production'],
        'sofiamarquez.studio/olivar',
      ],
      [
        'Festival Llum',
        'Designer',
        'Identity, programme and wayfinding for a three-day light festival, produced in both Catalan and Spanish across print and large-format signage.',
        ['Illustrator', 'Signage', 'Bilingual Layout'],
        'sofiamarquez.studio/llum',
      ],
    ],
    certifications: [
      ['Adobe Certified Professional, Illustrator', 'Adobe', '2023'],
      ['Sustainable Packaging Design', 'Pentawards Academy', '2022'],
    ],
    languages: 'Spanish:Native, Catalan:Native, English:Fluent',
  },

  {
    name: 'Bikash Adhikari',
    headline: 'Chartered Accountant',
    city: 'Biratnagar, Nepal',
    phone: '+977 985 440 7712',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#17120f', shirt: '#0f172a', bg: '#e2e8f0' },
    summary:
      'Chartered accountant with eight years in audit and financial reporting across manufacturing, trading and non-governmental organisations. Careful, deadline-driven and comfortable explaining numbers to people who do not work with them, which is usually the part that decides whether a report is acted on. Has led audit teams of up to five.',
    jobs: [
      [
        'North Associates',
        'Finance Manager',
        'Biratnagar',
        '2021-01',
        '',
        'Lead a team of four covering reporting, tax and payroll for a 600-person manufacturer.',
        [
          'Closed eight consecutive monthly reporting cycles within three working days',
          'Saved NPR 4.2 million a year by renegotiating supplier payment terms',
          'Led the migration to a new ERP with no loss of historical records',
          'Built the management pack the board now uses for quarterly review',
        ],
      ],
      [
        'Shah & Associates',
        'Audit Senior',
        'Kathmandu',
        '2018-03',
        '2020-12',
        'Led statutory audits for clients in manufacturing, trading and the non-profit sector.',
        [
          'Managed audits for 25 clients a year with teams of up to five',
          'Identified a revenue recognition error worth NPR 11 million at a trading client',
          'Trained six articled students through their first full audit cycle',
          'Standardised the firm’s working paper templates across three offices',
        ],
      ],
      [
        'Shah & Associates',
        'Articled Assistant',
        'Kathmandu',
        '2015-08',
        '2018-02',
        'Completed the articleship period across audit, taxation and accounts preparation.',
        [
          'Prepared statutory accounts for 40+ small and medium entities',
          'Supported VAT and income tax filings through three assessment years',
          'Drafted audit findings memoranda for partner review',
        ],
      ],
    ],
    education: [
      [
        'Institute of Chartered Accountants of Nepal',
        'Chartered Accountancy',
        'Audit and Assurance',
        '2015-08',
        '2019-11',
        'Qualified',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Accounting and Finance',
        '2011-07',
        '2015-06',
        'First Division',
      ],
    ],
    skills:
      'Financial Reporting:E, Statutory Audit:E, Taxation:A, IFRS:A, Internal Controls:A, Budgeting:A, Cash Flow Forecasting:A, ERP Systems:A, Excel:E, Payroll:I, Team Leadership:A, Tally:A',
    projects: [
      [
        'ERP Migration',
        'Project Lead',
        'Moved a 600-person manufacturer from spreadsheets and Tally to a single ERP across finance, stores and payroll, with full historical data carried over and no reporting gap.',
        ['ERP', 'Data Migration', 'Process Design'],
        '',
      ],
      [
        'NGO Grant Audit Framework',
        'Lead Auditor',
        'Designed a repeatable audit programme for donor-funded grants covering eligibility testing, procurement review and a standard findings format now used across four partner organisations.',
        ['Audit', 'Compliance', 'Reporting'],
        '',
      ],
    ],
    certifications: [
      ['Chartered Accountant (CA)', 'ICAN', '2019'],
      ['Certified Information Systems Auditor', 'ISACA', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Maithili:Conversational',
  },

  {
    name: 'Priya Sharma',
    headline: 'Registered Nurse',
    city: 'Chitwan, Nepal',
    phone: '+977 982 550 9066',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#241812', shirt: '#0d9488', bg: '#d7f0ec' },
    summary:
      'Registered nurse with six years in intensive and emergency care, confident with ventilated and post-operative patients and used to being the calm voice in a difficult room. Known for thorough handovers and for catching the small changes that matter early. Has precepted eleven new graduates onto the unit.',
    jobs: [
      [
        'Chitwan Medical College Hospital',
        'Senior Staff Nurse, ICU',
        'Bharatpur',
        '2021-05',
        '',
        'Care for critically ill patients in a 20-bed intensive care unit, including the daily shift coordinator role.',
        [
          'Cut medication errors on the unit by 40% with a double-check protocol now used hospital-wide',
          'Precepted eleven new graduate nurses through their first ICU rotation',
          'Led the unit’s ventilator-associated pneumonia prevention bundle',
          'Coordinate shift staffing and bed allocation for up to 20 patients',
        ],
      ],
      [
        'Bharatpur Hospital',
        'Staff Nurse, Emergency',
        'Bharatpur',
        '2019-02',
        '2021-04',
        'Triage and treatment in a busy public emergency department seeing around 180 patients a day.',
        [
          'Handled triage for an average of 60 patients per shift',
          'Helped set up the hospital’s first triage colour-coding system',
          'Supported the department through two mass-casualty road incidents',
          'Trained support staff in basic life support',
        ],
      ],
      [
        'Shree Birendra Hospital',
        'Staff Nurse, General Ward',
        'Kathmandu',
        '2018-01',
        '2019-01',
        'General medical and surgical ward nursing across a 40-bed unit.',
        [
          'Managed post-operative care and wound management for surgical admissions',
          'Introduced a structured bedside handover sheet still in use',
          'Completed the hospital’s infection control training programme',
        ],
      ],
    ],
    education: [
      [
        'B.P. Koirala Institute of Health Sciences',
        'Bachelor of Nursing Science',
        'Nursing',
        '2014-09',
        '2018-08',
        '78%',
      ],
      [
        'Nepal Nursing Council',
        'Proficiency Certificate Level in Nursing',
        'Nursing',
        '2011-07',
        '2014-06',
        '76%',
      ],
    ],
    skills:
      'Critical Care:E, Patient Assessment:E, IV Therapy:A, Ventilator Management:A, Triage:A, Wound Care:A, Medication Administration:E, Electronic Records:I, Infection Control:A, Preceptorship:A, Emergency Response:A, Family Communication:A',
    projects: [
      [
        'Medication Safety Protocol',
        'Clinical Lead',
        'Designed and rolled out a two-nurse verification step for high-risk drugs, with an audit cycle that reduced recorded administration errors on the unit by 40% in six months.',
        ['Clinical Audit', 'Protocol Design', 'Training'],
        '',
      ],
      [
        'Graduate Preceptorship Programme',
        'Preceptor',
        'Built a twelve-week structured orientation for new graduate ICU nurses covering competencies, supervised practice and a sign-off checklist. Eleven nurses completed it.',
        ['Mentoring', 'Competency Assessment'],
        '',
      ],
    ],
    certifications: [
      ['Advanced Cardiac Life Support (ACLS)', 'American Heart Association', '2024'],
      ['Basic Life Support Instructor', 'Nepal Red Cross Society', '2023'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Fluent',
  },

  {
    name: 'Suman Gurung',
    headline: 'Civil Engineer',
    city: 'Dharan, Nepal',
    phone: '+977 980 330 5521',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#1b1410', shirt: '#b45309', bg: '#fdf0dc' },
    summary:
      'Civil engineer with six years on road, bridge and water supply projects, splitting time between design office and site. Comfortable taking a scheme from survey through detailed design to supervision, and used to the version of a project where the ground does not match the drawing. Has supervised contracts up to NPR 180 million.',
    jobs: [
      [
        'Sagarmatha Engineering Consult',
        'Senior Civil Engineer',
        'Dharan',
        '2022-06',
        '',
        'Design and supervision of rural road and bridge schemes for three district municipalities.',
        [
          'Supervised construction of a 42m span truss bridge delivered on time and under budget',
          'Produced detailed designs and bills of quantity for 31 km of rural road',
          'Cut concrete waste by 15% through revised pour scheduling and batch checks',
          'Run the monthly site progress and valuation meetings with contractors',
        ],
      ],
      [
        'Nepal Infrastructure Partners',
        'Civil Engineer',
        'Biratnagar',
        '2020-01',
        '2022-05',
        'Site engineering on a municipal water supply scheme serving 24,000 households.',
        [
          'Oversaw laying of 38 km of distribution main across difficult terrain',
          'Resolved a reservoir foundation problem that had held up work for six weeks',
          'Maintained site quality records and witnessed all pressure testing',
          'Coordinated three subcontractors and a site team of 40',
        ],
      ],
      [
        'District Technical Office',
        'Assistant Engineer',
        'Sunsari',
        '2018-08',
        '2019-12',
        'Survey, estimation and supervision of small municipal works.',
        [
          'Prepared estimates and tender documents for 20+ small works contracts',
          'Carried out topographic survey and setting out for drainage schemes',
          'Checked contractor measurements for monthly payment certificates',
        ],
      ],
    ],
    education: [
      [
        'Institute of Engineering, Pulchowk Campus',
        'Bachelor of Engineering',
        'Civil Engineering',
        '2014-09',
        '2018-07',
        '3.4 CGPA',
      ],
      [
        'Nepal Engineering Council',
        'Registered Engineer',
        'Civil Engineering',
        '2018-09',
        '2018-11',
        'Registered',
      ],
    ],
    skills:
      'AutoCAD:E, Structural Analysis:A, SAP2000:A, Civil 3D:I, Quantity Surveying:A, Site Supervision:E, Cost Estimation:A, Contract Administration:A, Surveying:A, Concrete Technology:A, MS Project:I, Quality Control:A',
    projects: [
      [
        'Koshi Truss Bridge',
        'Supervising Engineer',
        'A 42-metre steel truss bridge replacing a seasonal crossing used by four village wards, delivered two weeks early and 6% under the contract sum.',
        ['Structural Design', 'Site Supervision', 'SAP2000'],
        '',
      ],
      [
        'Dharan Water Supply Extension',
        'Site Engineer',
        'Extension of the municipal distribution network to 24,000 households, including a 900m³ reservoir and 38 km of main, completed across two monsoon seasons.',
        ['Water Supply', 'Contract Administration'],
        '',
      ],
    ],
    certifications: [
      ['Registered Engineer, NEC', 'Nepal Engineering Council', '2018'],
      ['Construction Site Safety', 'Nepal Construction Industry Council', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Gurung:Conversational',
  },

  {
    name: 'Grace Lama',
    headline: 'Human Resources Executive',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 660 1198',
    website: '',
    github: false,
    look: { skin: 1, hair: 'long', hairColor: '#2a1c15', shirt: '#7c3aed', bg: '#ede9fe' },
    summary:
      'HR executive with six years across recruitment, employee relations and policy, working mostly in fast-growing companies where the handbook has to be written before it can be followed. Believes most retention problems are management problems, and has the exit interview data to argue it. Comfortable in difficult conversations.',
    jobs: [
      [
        'Everest Staffing Group',
        'HR Manager',
        'Kathmandu',
        '2022-04',
        '',
        'Lead HR for a 240-person services company across recruitment, relations and policy.',
        [
          'Reduced voluntary turnover from 31% to 18% over two years',
          'Rewrote the employee handbook and rolled it out through twelve briefing sessions',
          'Cut average time-to-hire from 46 days to 29 across all roles',
          'Introduced structured exit interviews and quarterly reporting to the board',
        ],
      ],
      [
        'Annapurna Tech',
        'Senior HR Officer',
        'Kathmandu',
        '2020-01',
        '2022-03',
        'Recruitment and employee relations for a software company growing from 60 to 140 staff.',
        [
          'Hired 80 people across engineering, sales and support in two years',
          'Set up the structured interview framework and trained 14 hiring managers',
          'Handled 20+ grievance and disciplinary cases to conclusion',
          'Ran the first employee engagement survey and the actions that followed',
        ],
      ],
      [
        'Himalaya Hospitality',
        'HR Officer',
        'Pokhara',
        '2018-06',
        '2019-12',
        'Generalist HR support across two hotel properties with 180 combined staff.',
        [
          'Managed seasonal recruitment of up to 50 temporary staff per peak',
          'Maintained records and payroll inputs for both properties',
          'Coordinated the annual appraisal cycle for all departments',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Master of Business Administration',
        'Human Resource Management',
        '2018-08',
        '2020-07',
        'Distinction',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Administration',
        'Management',
        '2014-07',
        '2018-05',
        'First Division',
      ],
    ],
    skills:
      'Recruitment:E, Employee Relations:E, HR Policy:A, Performance Management:A, Onboarding:A, Payroll Administration:I, Labour Law:A, HRIS:A, Training & Development:A, Conflict Resolution:A, Workforce Planning:I, Reporting:A',
    projects: [
      [
        'Retention Programme',
        'Programme Lead',
        'A two-year programme combining exit interview analysis, manager training and a revised progression framework, which took voluntary turnover from 31% to 18%.',
        ['Analysis', 'Manager Training', 'Policy'],
        '',
      ],
      [
        'Structured Hiring Framework',
        'Designer',
        'Replaced unstructured interviews with scorecards and a defined panel process across all departments, cutting time-to-hire by 37% and improving first-year retention.',
        ['Recruitment', 'Assessment Design'],
        '',
      ],
    ],
    certifications: [
      ['SHRM Certified Professional (SHRM-CP)', 'SHRM', '2023'],
      ['Nepal Labour Act in Practice', 'Management Association of Nepal', '2021'],
    ],
    languages: 'Nepali:Native, English:Fluent, Tamang:Conversational',
  },

  {
    name: 'Arjun Bhattarai',
    headline: 'Data Analyst',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 110 3365',
    website: 'arjunb.analytics',
    github: true,
    look: { skin: 2, hair: 'curly', hairColor: '#191310', shirt: '#0369a1', bg: '#dff1fb' },
    summary:
      'Data analyst with five years turning messy operational data into decisions people actually make, mostly in telecoms and retail. Strong in SQL and Python, and more interested in whether a number changes behaviour than in whether the chart is clever. Has built reporting that replaced a weekly meeting.',
    jobs: [
      [
        'Nepal Telecom Services',
        'Senior Data Analyst',
        'Kathmandu',
        '2022-07',
        '',
        'Analysis and reporting for the consumer division, covering churn, pricing and network quality.',
        [
          'Built a churn model that identified 71% of leavers a month ahead of cancellation',
          'Replaced a weekly status meeting with an automated dashboard used by 40 managers',
          'Found a billing inconsistency worth NPR 18 million a year in recovered revenue',
          'Set the division’s definitions for active user and revenue per user',
        ],
      ],
      [
        'Daraz Nepal',
        'Data Analyst',
        'Kathmandu',
        '2020-03',
        '2022-06',
        'Commercial analysis for category teams across pricing, promotion and inventory.',
        [
          'Built the promotion performance model used to plan four annual sale events',
          'Cut category reporting time from two days to twenty minutes with scheduled queries',
          'Analysed 1.2 million orders to rebalance the warehouse stocking policy',
          'Trained six category managers to self-serve their own reports',
        ],
      ],
      [
        'Shrestha Retail',
        'Business Analyst',
        'Lalitpur',
        '2019-01',
        '2020-02',
        'First analytics role, building the company’s first reporting from point-of-sale exports.',
        [
          'Created the first store-level weekly sales report, replacing manual tallies',
          'Cleaned and consolidated three years of inconsistent product data',
          'Introduced basic forecasting for seasonal stock ordering',
        ],
      ],
    ],
    education: [
      ['Tribhuvan University', 'Master of Science', 'Statistics', '2017-09', '2019-08', '3.6 CGPA'],
      [
        'Tribhuvan University',
        'Bachelor of Science',
        'Mathematics and Statistics',
        '2013-07',
        '2017-06',
        'First Division',
      ],
    ],
    skills:
      'SQL:E, Python:A, pandas:A, Power BI:E, Tableau:A, Excel:E, Statistics:A, A/B Testing:A, Data Modelling:A, ETL:I, Git:I, Stakeholder Reporting:A',
    projects: [
      [
        'Churn Early Warning',
        'Lead Analyst',
        'A logistic regression model scoring 2.4 million subscribers monthly, surfacing 71% of eventual leavers a month ahead and feeding a retention offer pipeline.',
        ['Python', 'SQL', 'Power BI'],
        'github.com/arjun-bhattarai/churn-model',
      ],
      [
        'Promotion Performance Model',
        'Analyst',
        'A framework separating genuine promotional uplift from seasonal demand across 40 categories, now used to plan the four largest sale events of the year.',
        ['SQL', 'Statistics', 'Tableau'],
        '',
      ],
    ],
    certifications: [
      ['Microsoft Certified: Power BI Data Analyst', 'Microsoft', '2024'],
      ['Google Data Analytics Professional Certificate', 'Google', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },

  {
    name: 'Hannah Whitfield',
    headline: 'Secondary School Teacher',
    city: 'Manchester, United Kingdom',
    phone: '+44 7700 118 442',
    website: '',
    github: false,
    look: { skin: 0, hair: 'wavy', hairColor: '#6b4423', shirt: '#15803d', bg: '#dcfce7' },
    summary:
      'Secondary English teacher with seven years in mixed-ability state comprehensives, now leading key stage three across a department of nine. Interested in the unglamorous part of teaching — sequencing, retrieval, marking that students actually read — and in getting reluctant readers to finish a book. Mentors trainees each year.',
    jobs: [
      [
        'Brookfield High School',
        'Head of Key Stage 3, English',
        'Manchester',
        '2022-09',
        '',
        'Lead the key stage three English curriculum for 420 students across a department of nine teachers.',
        [
          'Redesigned the year 7–9 curriculum, raising end-of-key-stage attainment by 11 percentage points',
          'Introduced a departmental retrieval practice routine now used across the faculty',
          'Reduced marking workload by moving to whole-class feedback without loss of progress',
          'Mentor two trainee teachers each year through their placement',
        ],
      ],
      [
        'Ashgrove Academy',
        'English Teacher',
        'Leeds',
        '2019-09',
        '2022-07',
        'Taught English across key stages three and four, including GCSE literature and language.',
        [
          'GCSE grade 4+ pass rate rose from 62% to 78% across three cohorts',
          'Ran the reading intervention group for 30 students a year',
          'Led the school’s World Book Day programme for three years',
          'Took on form tutor responsibility for a year 10 group of 29',
        ],
      ],
      [
        'St Mary’s Comprehensive',
        'Newly Qualified Teacher',
        'Leeds',
        '2018-09',
        '2019-07',
        'Induction year teaching English across key stage three.',
        [
          'Completed induction with all standards judged good or better',
          'Set up and ran a lunchtime creative writing club',
          'Supported the year 9 options evening and transition programme',
        ],
      ],
    ],
    education: [
      [
        'University of Manchester',
        'Postgraduate Certificate in Education',
        'Secondary English',
        '2017-09',
        '2018-07',
        'Merit',
      ],
      [
        'University of Leeds',
        'Bachelor of Arts',
        'English Literature',
        '2014-09',
        '2017-06',
        'First Class Honours',
      ],
    ],
    skills:
      'Curriculum Design:E, Lesson Planning:E, Assessment:A, Differentiation:A, Behaviour Management:A, GCSE English:E, Literacy Intervention:A, Mentoring:A, Data Tracking:I, Parental Engagement:A, Safeguarding:A, Google Classroom:A',
    projects: [
      [
        'Key Stage 3 Curriculum Rebuild',
        'Lead',
        'A three-year sequenced curriculum built around six core texts with shared assessment points, which lifted end-of-key-stage attainment by 11 percentage points in two years.',
        ['Curriculum Design', 'Assessment'],
        '',
      ],
      [
        'Reading Recovery Group',
        'Teacher',
        'A targeted intervention for 30 students a year reading below chronological age, combining paired reading, phonics review and fortnightly progress checks.',
        ['Literacy', 'Intervention'],
        '',
      ],
    ],
    certifications: [
      ['Qualified Teacher Status (QTS)', 'Department for Education', '2018'],
      ['Designated Safeguarding Lead', 'NSPCC Learning', '2023'],
    ],
    languages: 'English:Native, French:Conversational, Spanish:Basic',
  },

  {
    name: 'David Chen',
    headline: 'Sales Representative',
    city: 'Singapore',
    phone: '+65 8123 7740',
    website: '',
    github: false,
    look: { skin: 0, hair: 'short', hairColor: '#120f0d', shirt: '#1d4ed8', bg: '#dbeafe' },
    summary:
      'B2B sales representative with five years selling software and equipment into mid-market manufacturers across South-East Asia. Consistent rather than spiky: five years of quota attainment, built on qualifying hard early and walking away from deals that will not close. Comfortable with a twelve-month cycle and a buying committee.',
    jobs: [
      [
        'Meridian Industrial Software',
        'Senior Account Executive',
        'Singapore',
        '2022-01',
        '',
        'New business and expansion across manufacturing accounts in Singapore, Malaysia and Vietnam.',
        [
          'Closed SGD 3.4 million in new annual recurring revenue over three years',
          'Achieved 118% of quota in 2024 and 109% in 2023',
          'Opened the Vietnam territory from zero to eleven accounts',
          'Built the discovery question set now used by the whole team',
        ],
      ],
      [
        'Pacific Equipment Supply',
        'Account Executive',
        'Singapore',
        '2020-02',
        '2021-12',
        'Sold industrial handling equipment into logistics and warehousing customers.',
        [
          'Grew territory revenue 42% across two years',
          'Won the company’s largest single order to that point, worth SGD 480,000',
          'Reduced average sales cycle from 160 to 118 days through earlier technical qualification',
          'Managed a pipeline of 60+ live opportunities in Salesforce',
        ],
      ],
      [
        'Pacific Equipment Supply',
        'Sales Development Representative',
        'Singapore',
        '2019-01',
        '2020-01',
        'Outbound prospecting and qualification for a team of four account executives.',
        [
          'Booked 340 qualified meetings in twelve months against a target of 240',
          'Built the outbound sequence library still used by the SDR team',
          'Maintained CRM data quality across 4,000 accounts',
        ],
      ],
    ],
    education: [
      [
        'Nanyang Technological University',
        'Bachelor of Business',
        'Marketing',
        '2014-08',
        '2018-05',
        'Second Class Upper',
      ],
      [
        'Singapore Institute of Management',
        'Professional Certificate',
        'Business Negotiation',
        '2021-03',
        '2021-06',
        'Completed',
      ],
    ],
    skills:
      'B2B Sales:E, Account Management:E, Negotiation:A, Pipeline Management:A, Salesforce:A, Solution Selling:A, Forecasting:A, Territory Planning:A, Contract Review:I, Presentations:A, Cold Outreach:A, MEDDIC:A',
    projects: [
      [
        'Vietnam Territory Launch',
        'Lead',
        'Opened a new market from no presence to eleven signed accounts in eighteen months, including partner selection, local pricing and a translated collateral set.',
        ['Territory Planning', 'Partner Management'],
        '',
      ],
      [
        'Discovery Framework',
        'Author',
        'A qualification question set and scoring sheet adopted team-wide, which cut time spent on deals that never closed by roughly a third.',
        ['Sales Process', 'Enablement'],
        '',
      ],
    ],
    certifications: [
      ['Salesforce Certified Administrator', 'Salesforce', '2023'],
      ['MEDDIC Sales Methodology', 'MEDDIC Academy', '2022'],
    ],
    languages: 'English:Native, Mandarin:Fluent, Malay:Conversational',
  },
  {
    name: 'Aisha Rahman',
    headline: 'UX Designer',
    city: 'London, United Kingdom',
    phone: '+44 7700 553 019',
    website: 'aisharahman.design',
    github: false,
    look: { skin: 2, hair: 'bun', hairColor: '#1a1310', shirt: '#9333ea', bg: '#f3e8ff' },
    summary:
      'UX designer with six years in financial services and health, working on the kind of interface people use because they have to rather than because they want to. Research-led, comfortable running sessions with people who find the product difficult, and happiest when a redesign removes a step rather than adding a screen.',
    jobs: [
      [
        'Northgate Bank',
        'Senior UX Designer',
        'London',
        '2022-05',
        '',
        'Design lead on the mobile banking app, covering payments, onboarding and accessibility.',
        [
          'Redesigned the payment flow, cutting failed transfers by 34% in the first quarter',
          'Took the app from partial to full WCAG 2.1 AA compliance across 40 screens',
          'Ran 60+ moderated usability sessions, including with screen reader users',
          'Built the design system now used by three product teams',
        ],
      ],
      [
        'Wellspring Health',
        'UX Designer',
        'Manchester',
        '2020-02',
        '2022-04',
        'Designed patient-facing booking and triage tools for NHS trusts.',
        [
          'Designed a triage questionnaire completed by 180,000 patients a year',
          'Raised booking completion from 58% to 81% through two rounds of testing',
          'Introduced the team’s first accessibility review step before handover',
          'Worked directly with clinicians to keep clinical safety requirements intact',
        ],
      ],
      [
        'Loop Digital',
        'Junior UX Designer',
        'Manchester',
        '2018-09',
        '2020-01',
        'Agency work across e-commerce and charity sector clients.',
        [
          'Delivered wireframes and prototypes for fourteen client projects',
          'Ran the studio’s first card-sorting and tree-testing sessions',
          'Built and maintained the agency’s shared Figma component library',
        ],
      ],
    ],
    education: [
      [
        'University College London',
        'Master of Science',
        'Human-Computer Interaction',
        '2017-09',
        '2018-09',
        'Distinction',
      ],
      [
        'University of Nottingham',
        'Bachelor of Science',
        'Psychology',
        '2014-09',
        '2017-06',
        'First Class Honours',
      ],
    ],
    skills:
      'User Research:E, Interaction Design:E, Figma:E, Prototyping:A, Usability Testing:E, Accessibility:A, Design Systems:A, Wireframing:E, Information Architecture:A, Service Design:I, Workshop Facilitation:A, HTML/CSS:I',
    projects: [
      [
        'Payments Redesign',
        'Design Lead',
        'A rebuild of the transfer journey around a single confirmation step and clearer error recovery, tested with 24 participants and cutting failed transfers by a third.',
        ['Figma', 'Usability Testing', 'Prototyping'],
        'aisharahman.design/payments',
      ],
      [
        'Accessible Triage Form',
        'Designer',
        'A patient triage questionnaire rebuilt for screen readers and low-literacy users, taking completion from 58% to 81% while keeping clinical safety sign-off.',
        ['Accessibility', 'Research', 'Service Design'],
        '',
      ],
    ],
    certifications: [
      ['Certified Professional in Accessibility Core Competencies', 'IAAP', '2023'],
      ['NN/g UX Certification', 'Nielsen Norman Group', '2021'],
    ],
    languages: 'English:Native, Bengali:Fluent, Arabic:Basic',
  },

  {
    name: 'Nabin Shrestha',
    headline: 'Mechanical Engineer',
    city: 'Birgunj, Nepal',
    phone: '+977 981 770 2234',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#191411', shirt: '#475569', bg: '#e8edf3' },
    summary:
      'Mechanical engineer with seven years in manufacturing maintenance and plant engineering, mostly in cement and food processing. Spends the time on root cause rather than on the quick restart, which is why the same breakdown rarely happens twice. Has run shutdown planning for a plant of 400 and led a team of fourteen technicians.',
    jobs: [
      [
        'Narayani Cement',
        'Plant Maintenance Engineer',
        'Birgunj',
        '2021-03',
        '',
        'Lead maintenance for a cement plant producing 1,200 tonnes a day, with a team of fourteen.',
        [
          'Raised equipment availability from 88% to 96% over two years',
          'Introduced condition-based monitoring on 40 critical drives, pre-empting nine failures',
          'Planned and ran two annual shutdowns, both completed inside the window',
          'Cut spare parts holding by NPR 9 million without a stock-out',
        ],
      ],
      [
        'Himalayan Food Industries',
        'Maintenance Engineer',
        'Hetauda',
        '2018-08',
        '2021-02',
        'Maintenance and reliability across four processing and packaging lines.',
        [
          'Reduced unplanned line stoppages by 45% through a planned maintenance schedule',
          'Led the installation and commissioning of a new filling line',
          'Trained twelve technicians on the new CMMS system',
          'Maintained compliance with food-grade lubrication and hygiene standards',
        ],
      ],
      [
        'Sunrise Engineering Works',
        'Graduate Engineer',
        'Birgunj',
        '2017-07',
        '2018-07',
        'Workshop and site work on fabrication and mechanical installation contracts.',
        [
          'Supervised fabrication of structural steel for three industrial buildings',
          'Prepared shop drawings and cutting lists from design drawings',
          'Carried out site measurement and installation supervision',
        ],
      ],
    ],
    education: [
      [
        'Institute of Engineering, Thapathali Campus',
        'Bachelor of Engineering',
        'Mechanical Engineering',
        '2013-09',
        '2017-06',
        '3.3 CGPA',
      ],
      [
        'Nepal Engineering Council',
        'Registered Engineer',
        'Mechanical Engineering',
        '2017-08',
        '2017-10',
        'Registered',
      ],
    ],
    skills:
      'Preventive Maintenance:E, Root Cause Analysis:E, SolidWorks:A, AutoCAD:A, Condition Monitoring:A, CMMS:A, Hydraulics:A, Pneumatics:A, Shutdown Planning:A, Welding Inspection:I, Lean Manufacturing:I, Team Leadership:A',
    projects: [
      [
        'Condition Monitoring Rollout',
        'Project Lead',
        'Vibration and thermal monitoring fitted to 40 critical drives with a weekly review routine, which caught nine developing failures before they stopped the line.',
        ['Condition Monitoring', 'Reliability'],
        '',
      ],
      [
        'Filling Line Commissioning',
        'Lead Engineer',
        'Installation and commissioning of a 12,000 bottles-per-hour filling line, from foundation and alignment through to handover and operator training.',
        ['Commissioning', 'Mechanical Installation'],
        '',
      ],
    ],
    certifications: [
      ['Certified Maintenance & Reliability Technician', 'SMRP', '2023'],
      ['Registered Engineer, NEC', 'Nepal Engineering Council', '2017'],
    ],
    languages: 'Nepali:Native, English:Fluent, Bhojpuri:Fluent',
  },

  {
    name: 'Elena Novak',
    headline: 'Project Manager',
    city: 'Prague, Czech Republic',
    phone: '+420 606 441 209',
    website: '',
    github: false,
    look: { skin: 0, hair: 'long', hairColor: '#4a3524', shirt: '#0f766e', bg: '#d6f2ee' },
    summary:
      'Project manager with eight years delivering software and infrastructure programmes across Central Europe, usually the ones with three vendors and a fixed regulatory deadline. Keeps a plan that people recognise as the truth, and raises problems while they are still cheap. Has managed budgets to EUR 4 million.',
    jobs: [
      [
        'Vltava Systems',
        'Senior Project Manager',
        'Prague',
        '2021-09',
        '',
        'Deliver software programmes for banking and insurance clients, running two to three in parallel.',
        [
          'Delivered a EUR 4.1 million core system migration on time and 4% under budget',
          'Brought a programme nine weeks late back to its committed go-live date',
          'Manage three vendor relationships and the contracts that sit under them',
          'Introduced a one-page status format now used across the delivery function',
        ],
      ],
      [
        'Dataform s.r.o.',
        'Project Manager',
        'Brno',
        '2018-04',
        '2021-08',
        'Ran implementation projects for ERP and reporting tools across manufacturing clients.',
        [
          'Delivered eleven implementations, nine inside the original schedule',
          'Set up the project assurance review that became company policy',
          'Managed project teams of up to 18 across three countries',
          'Reduced average implementation time from 7 months to 5',
        ],
      ],
      [
        'Dataform s.r.o.',
        'Business Analyst',
        'Brno',
        '2016-06',
        '2018-03',
        'Requirements and process analysis on ERP implementation projects.',
        [
          'Documented end-to-end processes for six manufacturing clients',
          'Ran workshops to agree requirements between finance and operations',
          'Produced the test scripts used for client acceptance',
        ],
      ],
    ],
    education: [
      [
        'Charles University, Prague',
        'Master of Science',
        'Information Management',
        '2014-09',
        '2016-06',
        'Grade A',
      ],
      [
        'Masaryk University',
        'Bachelor of Science',
        'Applied Informatics',
        '2011-09',
        '2014-06',
        'Grade B+',
      ],
    ],
    skills:
      'Project Planning:E, Stakeholder Management:E, Risk Management:A, Budget Control:A, Agile Delivery:A, Waterfall Delivery:A, Vendor Management:A, Jira:A, MS Project:A, Requirements Analysis:A, Reporting:E, Contract Negotiation:I',
    projects: [
      [
        'Core Banking Migration',
        'Programme Manager',
        'An eighteen-month migration of a retail bank onto a new core platform across three vendors, delivered on the committed date and 4% under a EUR 4.1 million budget.',
        ['Programme Management', 'Vendor Management'],
        '',
      ],
      [
        'Delivery Assurance Review',
        'Designer',
        'A lightweight checkpoint run at three fixed points in every project, which cut the number of programmes declaring late surprises in the final month by roughly half.',
        ['Governance', 'Process Design'],
        '',
      ],
    ],
    certifications: [
      ['Project Management Professional (PMP)', 'PMI', '2021'],
      ['PRINCE2 Practitioner', 'AXELOS', '2019'],
    ],
    languages: 'Czech:Native, English:Fluent, German:Conversational',
  },

  {
    name: 'Kiran Magar',
    headline: 'Head Chef',
    city: 'Pokhara, Nepal',
    phone: '+977 984 220 7781',
    website: '',
    github: false,
    look: { skin: 2, hair: 'beard', hairColor: '#171210', shirt: '#dc2626', bg: '#fee2e2' },
    summary:
      'Head chef with nine years in hotel and restaurant kitchens, running a brigade of sixteen across a 120-cover service. Builds menus around what the valley actually grows and keeps food cost where it was promised. Trained eight commis chefs who have gone on to run their own sections.',
    jobs: [
      [
        'Lakeside Grand Hotel',
        'Head Chef',
        'Pokhara',
        '2021-06',
        '',
        'Run the main kitchen and banquet operation for a 94-room hotel, with a brigade of sixteen.',
        [
          'Held food cost at 28% through two years of supplier price rises',
          'Rebuilt the à la carte menu around local produce, lifting covers 22%',
          'Passed three consecutive hygiene audits with no major findings',
          'Trained eight commis chefs up to chef de partie',
        ],
      ],
      [
        'Annapurna Terrace',
        'Sous Chef',
        'Pokhara',
        '2018-03',
        '2021-05',
        'Second in a 120-cover restaurant kitchen, running service and ordering.',
        [
          'Ran evening service for a team of nine across four sections',
          'Cut wastage by 18% by changing prep quantities and rotation',
          'Introduced written recipe cards, making dishes consistent between shifts',
          'Covered head chef duties for three months during a vacancy',
        ],
      ],
      [
        'Hotel Everest View',
        'Chef de Partie',
        'Namche',
        '2016-02',
        '2018-02',
        'Ran the grill and sauce sections in a high-altitude hotel kitchen.',
        [
          'Worked a seasonal operation with supply deliveries only twice a week',
          'Developed four dishes that stayed on the menu after my departure',
          'Maintained cold chain and hygiene records under difficult conditions',
        ],
      ],
    ],
    education: [
      [
        'Nepal Academy of Tourism and Hotel Management',
        'Bachelor in Hotel Management',
        'Culinary Arts',
        '2012-08',
        '2016-01',
        'First Division',
      ],
      ['Le Cordon Bleu', 'Short Course', 'Pastry Fundamentals', '2019-05', '2019-07', 'Completed'],
    ],
    skills:
      'Menu Development:E, Kitchen Management:E, Food Costing:A, Food Safety (HACCP):A, Banquet Service:A, Inventory Control:A, Supplier Negotiation:A, Nepali Cuisine:E, Continental Cuisine:A, Pastry:I, Team Training:A, Rota Planning:A',
    projects: [
      [
        'Local Sourcing Menu',
        'Head Chef',
        'A seasonal à la carte menu built around growers within 40 km of Pokhara, which raised covers by 22% and cut produce cost despite shorter supply lines.',
        ['Menu Development', 'Supplier Relations'],
        '',
      ],
      [
        'Recipe Card System',
        'Creator',
        'Written specifications with photographs and portion weights for 84 dishes, which made plates consistent between shifts and cut new-starter training time in half.',
        ['Standardisation', 'Training'],
        '',
      ],
    ],
    certifications: [
      ['HACCP Level 3', 'Nepal Food Safety Institute', '2023'],
      ['Food Hygiene Supervisor', 'Highfield Qualifications', '2021'],
    ],
    languages: 'Nepali:Native, English:Fluent, Magar:Native',
  },

  {
    name: 'Sarah Mitchell',
    headline: 'Journalist',
    city: 'Dublin, Ireland',
    phone: '+353 86 441 2207',
    website: 'sarahmitchell.ie',
    github: false,
    look: { skin: 0, hair: 'wavy', hairColor: '#8c5a2b', shirt: '#be123c', bg: '#ffe4e9' },
    summary:
      'Reporter with seven years covering local government and housing, now writing long-form investigations for a national title. Works from documents and records rather than press releases, and has taken three stories through legal review to publication. Two pieces have led to policy change at council level.',
    jobs: [
      [
        'The Irish Chronicle',
        'Investigations Reporter',
        'Dublin',
        '2022-02',
        '',
        'Long-form investigative reporting on housing, planning and local government spending.',
        [
          'Published a six-part investigation into derelict housing that prompted a national audit',
          'Filed 40+ freedom of information requests and won two appeals',
          'Took three stories through legal review without a correction or complaint upheld',
          'Mentored two junior reporters on records-based reporting',
        ],
      ],
      [
        'Leinster Daily',
        'Local Government Correspondent',
        'Dublin',
        '2019-08',
        '2022-01',
        'Covered four county councils, planning decisions and local budgets.',
        [
          'Broke a story on planning irregularities that led to a council review',
          'Filed an average of nine stories a week across print and online',
          'Built a contact network across four councils and three state agencies',
          'Covered two local election cycles as lead reporter',
        ],
      ],
      [
        'Westmeath Examiner',
        'Staff Reporter',
        'Mullingar',
        '2017-09',
        '2019-07',
        'General news reporting for a weekly regional paper.',
        [
          'Covered courts, council meetings and community news',
          'Shot and edited own photography for most assignments',
          'Ran the paper’s social accounts, tripling referral traffic',
        ],
      ],
    ],
    education: [
      [
        'Dublin City University',
        'Master of Arts',
        'Journalism',
        '2016-09',
        '2017-08',
        'First Class Honours',
      ],
      [
        'University College Cork',
        'Bachelor of Arts',
        'History and Politics',
        '2013-09',
        '2016-06',
        'Second Class Honours, Grade 1',
      ],
    ],
    skills:
      'Investigative Research:E, Interviewing:E, Freedom of Information:A, Data Journalism:A, News Writing:E, Feature Writing:A, Media Law:A, Fact Checking:E, Document Analysis:A, Photography:I, Audio Editing:I, Shorthand:A',
    projects: [
      [
        'The Empty Houses',
        'Lead Reporter',
        'A six-part series mapping 3,100 long-term vacant homes against council records and site visits, which prompted a national audit and a change to the vacancy levy.',
        ['FOI', 'Data Analysis', 'Long-form'],
        'sarahmitchell.ie/empty-houses',
      ],
      [
        'Planning Permissions Database',
        'Reporter and Builder',
        'A searchable record of five years of county planning decisions, assembled from scanned minutes and used as the basis for two subsequent investigations.',
        ['Data Journalism', 'Records Research'],
        '',
      ],
    ],
    certifications: [
      ['NCTJ Diploma in Journalism', 'NCTJ', '2017'],
      ['Media Law for Journalists', 'Law Society of Ireland', '2022'],
    ],
    languages: 'English:Native, Irish:Conversational, French:Basic',
  },

  {
    name: 'Rajesh Mishra',
    headline: 'Corporate Lawyer',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 110 4420',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#15100e', shirt: '#1e3a5f', bg: '#dde6f0' },
    summary:
      'Corporate lawyer with nine years in commercial and regulatory practice, advising on company formation, joint ventures and foreign investment approvals. Drafts contracts people can follow without a lawyer in the room, and has closed transactions on both sides of the table. Appears before the regulator regularly.',
    jobs: [
      [
        'Mishra & Partners',
        'Senior Associate',
        'Kathmandu',
        '2021-01',
        '',
        'Advise corporate clients on transactions, regulatory approvals and commercial contracts.',
        [
          'Closed fourteen foreign investment approvals through the Department of Industry',
          'Led the legal workstream on a NPR 2.1 billion joint venture in hydropower',
          'Drafted the standard commercial contract suite now used across the firm',
          'Supervise a team of three associates and two paralegals',
        ],
      ],
      [
        'Everest Legal Services',
        'Associate',
        'Kathmandu',
        '2017-06',
        '2020-12',
        'Corporate and commercial practice across company law, employment and dispute work.',
        [
          'Handled company formation and compliance for 60+ entities',
          'Appeared in commercial bench proceedings on eleven matters',
          'Advised on employment disputes including four tribunal cases',
          'Ran the firm’s annual compliance calendar for retained clients',
        ],
      ],
      [
        'Supreme Court of Nepal',
        'Judicial Intern',
        'Kathmandu',
        '2016-08',
        '2017-05',
        'Research and drafting support to a sitting justice.',
        [
          'Researched and summarised precedent for 30+ constitutional and commercial matters',
          'Drafted bench memoranda under tight hearing timetables',
          'Observed and noted proceedings across civil and commercial lists',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu School of Law',
        'Master of Laws',
        'Corporate and Commercial Law',
        '2014-08',
        '2016-07',
        'Distinction',
      ],
      ['Nepal Law Campus', 'Bachelor of Laws', 'Law', '2010-07', '2014-06', 'First Division'],
    ],
    skills:
      'Contract Drafting:E, Corporate Law:E, Regulatory Compliance:A, Due Diligence:A, Joint Ventures:A, Foreign Investment Law:A, Legal Research:E, Negotiation:A, Employment Law:A, Dispute Resolution:A, Company Secretarial:I, Legal Writing:E',
    projects: [
      [
        'Hydropower Joint Venture',
        'Lead Counsel',
        'Legal workstream on a NPR 2.1 billion cross-border joint venture, covering shareholder agreement, regulatory approval and the construction contract framework.',
        ['Joint Ventures', 'Regulatory', 'Drafting'],
        '',
      ],
      [
        'Standard Contract Suite',
        'Author',
        'A set of twelve plain-language commercial templates with drafting notes, now the firm’s starting point for most engagements and used by all five fee earners.',
        ['Contract Drafting', 'Knowledge Management'],
        '',
      ],
    ],
    certifications: [
      ['Advocate, Nepal Bar Council', 'Nepal Bar Council', '2016'],
      ['Certificate in International Arbitration', 'CIArb', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Fluent',
  },

  {
    name: 'Nisha Joshi',
    headline: 'Clinical Pharmacist',
    city: 'Lalitpur, Nepal',
    phone: '+977 980 660 3317',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#231910', shirt: '#0891b2', bg: '#d8f3f8' },
    summary:
      'Clinical pharmacist with six years on hospital wards, reviewing prescriptions, advising on dosing and sitting on the medicines committee. Spends most of the day on interactions and renal dosing, and the rest explaining to patients why the regimen changed. Has cut avoidable readmissions through a discharge counselling service.',
    jobs: [
      [
        'Patan Hospital',
        'Clinical Pharmacist',
        'Lalitpur',
        '2021-07',
        '',
        'Ward-based pharmacy across medical and surgical units, plus antimicrobial stewardship.',
        [
          'Review 120+ prescriptions a week and intervene on around 9% of them',
          'Set up discharge counselling that cut medicine-related readmissions by 23%',
          'Lead the antimicrobial stewardship round twice weekly with the medical team',
          'Sit on the hospital medicines and therapeutics committee',
        ],
      ],
      [
        'Norvic International Hospital',
        'Pharmacist',
        'Kathmandu',
        '2019-02',
        '2021-06',
        'Dispensing, clinical checking and inventory management for inpatient and outpatient pharmacy.',
        [
          'Introduced a high-alert medication labelling system across both pharmacies',
          'Cut stock expiry write-offs by 31% with revised reorder levels',
          'Counselled outpatients on chronic disease regimens, around 40 a day',
          'Trained four pharmacy assistants on dispensing accuracy checks',
        ],
      ],
      [
        'Kathmandu Community Pharmacy',
        'Pharmacist',
        'Kathmandu',
        '2018-01',
        '2019-01',
        'Community dispensing and over-the-counter advice.',
        [
          'Dispensed and checked an average of 150 items a day',
          'Ran a monthly blood pressure and blood sugar screening clinic',
          'Maintained controlled drug records and audits',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Master of Pharmacy',
        'Clinical Pharmacy',
        '2016-08',
        '2018-07',
        'Distinction',
      ],
      [
        'Pokhara University',
        'Bachelor of Pharmacy',
        'Pharmacy',
        '2012-09',
        '2016-06',
        'First Division',
      ],
    ],
    skills:
      'Clinical Review:E, Medication Reconciliation:E, Antimicrobial Stewardship:A, Renal Dosing:A, Patient Counselling:E, Drug Interactions:E, Inventory Management:A, Pharmacovigilance:A, Clinical Audit:A, Hospital Formulary:A, Dispensing:E, Training:A',
    projects: [
      [
        'Discharge Counselling Service',
        'Lead Pharmacist',
        'A structured medicines review and counselling session before discharge for high-risk patients, which reduced medicine-related readmissions on the medical unit by 23%.',
        ['Clinical Service Design', 'Audit'],
        '',
      ],
      [
        'High-Alert Medication Labelling',
        'Project Lead',
        'A colour-coded labelling and double-check scheme for 40 high-risk medicines across two pharmacies, with a three-month audit showing no administration errors on those drugs.',
        ['Patient Safety', 'Protocol Design'],
        '',
      ],
    ],
    certifications: [
      ['Registered Pharmacist', 'Nepal Pharmacy Council', '2016'],
      ['Antimicrobial Stewardship Certificate', 'BSAC', '2023'],
    ],
    languages: 'Nepali:Native, English:Fluent, Newari:Conversational',
  },

  {
    name: 'Oliver Bennett',
    headline: 'Architect',
    city: 'Melbourne, Australia',
    phone: '+61 412 338 907',
    website: 'bennettarchitecture.au',
    github: false,
    look: { skin: 0, hair: 'short', hairColor: '#5c4433', shirt: '#334155', bg: '#e6eaf0' },
    summary:
      'Registered architect with ten years across residential and civic projects, taking schemes from feasibility through planning to construction administration. Works in timber and mass timber where the budget allows, and is as comfortable in a council planning meeting as in a site hut. Has led projects to AUD 12 million.',
    jobs: [
      [
        'Bennett & Row Architects',
        'Associate Architect',
        'Melbourne',
        '2020-02',
        '',
        'Project lead on civic and multi-residential schemes from feasibility through to completion.',
        [
          'Led a AUD 12 million community library from competition win to handover',
          'Secured planning approval on nine schemes, including three at appeal',
          'Introduced the practice’s mass timber detailing standard',
          'Supervise a team of four architects and two graduates',
        ],
      ],
      [
        'Southbank Studio',
        'Project Architect',
        'Melbourne',
        '2016-07',
        '2020-01',
        'Delivered residential and small commercial projects across design and construction stages.',
        [
          'Delivered 23 residential projects from concept to practical completion',
          'Ran construction administration on sites up to AUD 5 million',
          'Rebuilt the practice’s Revit template and detail library',
          'Won a state chapter commendation for a small house project',
        ],
      ],
      [
        'Harrow Architecture',
        'Graduate of Architecture',
        'Sydney',
        '2014-03',
        '2016-06',
        'Design development and documentation under registered architects.',
        [
          'Produced documentation packages for six residential projects',
          'Assisted on planning submissions and council negotiations',
          'Built physical and digital models for client presentations',
        ],
      ],
    ],
    education: [
      [
        'University of Melbourne',
        'Master of Architecture',
        'Architecture',
        '2012-02',
        '2013-12',
        'High Distinction',
      ],
      [
        'University of Melbourne',
        'Bachelor of Environments',
        'Architecture',
        '2009-02',
        '2011-11',
        'Distinction',
      ],
    ],
    skills:
      'Architectural Design:E, Revit:E, Construction Documentation:E, Planning Applications:A, Contract Administration:A, Mass Timber:A, Sustainable Design:A, AutoCAD:A, Rhino:I, Client Management:A, Cost Planning:I, Site Supervision:A',
    projects: [
      [
        'Fitzroy Community Library',
        'Project Lead',
        'A AUD 12 million civic library in cross-laminated timber, won in open competition and delivered on programme, now serving around 2,000 visitors a week.',
        ['Revit', 'Mass Timber', 'Civic'],
        'bennettarchitecture.au/library',
      ],
      [
        'Northcote Terrace House',
        'Project Architect',
        'A heritage-overlay terrace extension in timber and brick, approved at appeal after a refused first application, and commended by the state chapter.',
        ['Heritage', 'Residential', 'Planning'],
        '',
      ],
    ],
    certifications: [
      ['Registered Architect (VIC)', 'Architects Registration Board of Victoria', '2016'],
      ['Passive House Designer', 'Passive House Institute', '2022'],
    ],
    languages: 'English:Native, German:Conversational, Italian:Basic',
  },

  {
    name: 'Pooja Khadka',
    headline: 'Social Media Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 550 2290',
    website: 'poojakhadka.co',
    github: false,
    look: { skin: 1, hair: 'long', hairColor: '#2d1d14', shirt: '#db2777', bg: '#fce7f3' },
    summary:
      'Social media manager with five years running accounts for consumer brands, from the content calendar through to the paid budget and the monthly report. Writes and shoots as well as plans, which means campaigns go out on time. Grew one account from 12,000 to 180,000 followers without buying any of them.',
    jobs: [
      [
        'Himalayan Java',
        'Social Media Manager',
        'Kathmandu',
        '2022-03',
        '',
        'Own organic and paid social across four platforms for a 28-outlet coffee chain.',
        [
          'Grew the main account from 12,000 to 180,000 followers in two years',
          'Produce 20+ pieces of original content a week, shot and edited in house',
          'Manage a monthly paid budget of NPR 900,000 at a 4.1x return',
          'Built the response playbook that cut average reply time to 40 minutes',
        ],
      ],
      [
        'Digital Nepal Agency',
        'Social Media Executive',
        'Lalitpur',
        '2020-06',
        '2022-02',
        'Managed social accounts for six retained clients across retail, food and education.',
        [
          'Ran content calendars and community management for six brands at once',
          'Grew average client engagement rate from 1.8% to 4.3%',
          'Produced two campaigns that reached over a million accounts each',
          'Introduced monthly client reporting with clear, comparable metrics',
        ],
      ],
      [
        'Freelance',
        'Content Creator',
        'Kathmandu',
        '2019-05',
        '2020-05',
        'Content and account management for small local businesses.',
        [
          'Built and ran accounts for nine small businesses',
          'Shot and edited product photography on a phone and a reflector',
          'Learned paid social on small budgets with tight reporting',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Media Studies',
        'Media and Communication',
        '2016-08',
        '2020-05',
        'First Division',
      ],
      [
        'Hult International Online',
        'Professional Certificate',
        'Digital Marketing',
        '2021-02',
        '2021-06',
        'Completed',
      ],
    ],
    skills:
      'Content Strategy:E, Community Management:E, Paid Social:A, Copywriting:A, Photography:A, Video Editing:A, Canva:E, Meta Business Suite:E, TikTok Ads:A, Analytics:A, Influencer Outreach:A, Crisis Response:I',
    projects: [
      [
        'Coffee Culture Series',
        'Creator and Lead',
        'A weekly short-video series on Nepali coffee growers which drove most of the account’s growth from 12,000 to 180,000 followers, produced entirely in house.',
        ['Video', 'Content Strategy'],
        'poojakhadka.co/coffee-culture',
      ],
      [
        'Response Playbook',
        'Author',
        'A tiered reply framework covering routine questions, complaints and escalation, which brought average first response time down from four hours to forty minutes.',
        ['Community Management', 'Process'],
        '',
      ],
    ],
    certifications: [
      ['Meta Certified Digital Marketing Associate', 'Meta', '2023'],
      ['TikTok Marketing Science Certification', 'TikTok', '2024'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Fluent',
  },

  {
    name: 'Hari Prasad Neupane',
    headline: 'Senior Bank Officer',
    city: 'Butwal, Nepal',
    phone: '+977 985 220 6634',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#241a14', shirt: '#166534', bg: '#dcf4e3' },
    summary:
      'Branch banking officer with twelve years in credit and operations, now running a branch of eighteen staff in a competitive regional market. Knows the loan book by name as well as by number, which is part of why arrears stay low. Has taken two branches through full regulatory inspection without adverse finding.',
    jobs: [
      [
        'Rastriya Commerce Bank',
        'Branch Manager',
        'Butwal',
        '2020-04',
        '',
        'Run a branch of eighteen staff covering deposits, lending and compliance.',
        [
          'Grew the deposit base by 38% over four years in a competitive market',
          'Held non-performing loans at 1.4% against a bank average of 3.2%',
          'Passed two full regulatory inspections with no adverse findings',
          'Approved and monitored a loan portfolio of NPR 1.8 billion',
        ],
      ],
      [
        'Rastriya Commerce Bank',
        'Credit Officer',
        'Bhairahawa',
        '2016-02',
        '2020-03',
        'Appraisal and monitoring of SME and retail lending proposals.',
        [
          'Appraised 400+ credit proposals across trading, agriculture and manufacturing',
          'Recovered NPR 62 million from accounts previously classified as doubtful',
          'Introduced a site visit checklist later adopted across the region',
          'Trained six junior officers on credit appraisal',
        ],
      ],
      [
        'Nepal Investment Bank',
        'Banking Assistant',
        'Butwal',
        '2013-07',
        '2016-01',
        'Counter operations, account opening and clearing.',
        [
          'Handled teller operations with no cash difference over three years',
          'Processed account opening and KYC for 1,200+ customers',
          'Supported the branch through a core banking system migration',
        ],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Master of Business Studies',
        'Finance',
        '2011-08',
        '2013-06',
        'First Division',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Accounting',
        '2007-07',
        '2011-05',
        'First Division',
      ],
    ],
    skills:
      'Credit Appraisal:E, Risk Assessment:E, Branch Operations:E, Regulatory Compliance:A, AML/KYC:A, Loan Recovery:A, Customer Relationship Management:A, Financial Analysis:A, Team Leadership:A, Core Banking Systems:A, Deposit Mobilisation:A, Reporting:A',
    projects: [
      [
        'SME Lending Programme',
        'Branch Lead',
        'A structured small-business lending push built on a site visit checklist and cash-flow based appraisal, which grew the SME book 54% while keeping arrears below 2%.',
        ['Credit', 'Portfolio Management'],
        '',
      ],
      [
        'Recovery Drive',
        'Lead Officer',
        'A systematic review and negotiation programme across doubtful accounts, recovering NPR 62 million over eighteen months without resorting to legal action in most cases.',
        ['Recovery', 'Negotiation'],
        '',
      ],
    ],
    certifications: [
      ['Certified Anti-Money Laundering Specialist', 'ACAMS', '2022'],
      ['Credit Risk Management', 'National Banking Institute', '2019'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },
  {
    name: 'Lucas Moreau',
    headline: 'Photographer',
    city: 'Lyon, France',
    phone: '+33 6 71 40 28 85',
    website: 'lucasmoreau.photo',
    github: false,
    look: { skin: 0, hair: 'curly', hairColor: '#3a2a1c', shirt: '#0f172a', bg: '#e9e4dc' },
    summary:
      'Editorial and commercial photographer with eight years shooting food, interiors and portraits for magazines and brands. Works fast on location with small kit, and delivers a colour-managed edit the client can publish without a retoucher. Has shot four cookbooks and a long-running restaurant guide.',
    jobs: [
      [
        'Studio Moreau',
        'Owner and Lead Photographer',
        'Lyon',
        '2019-04',
        '',
        'Run an independent studio shooting food, interiors and portraits for editorial and brand clients.',
        [
          'Shot four published cookbooks, each 120+ finished images on a fixed schedule',
          'Hold twelve retained brand clients with repeat seasonal bookings',
          'Built a colour-managed workflow so files publish without further retouching',
          'Grew annual revenue 60% over three years with no paid advertising',
        ],
      ],
      [
        'Revue Gourmande',
        'Staff Photographer',
        'Lyon',
        '2016-09',
        '2019-03',
        'In-house photographer for a monthly food and travel magazine.',
        [
          'Delivered 14 commissions a month across restaurants, producers and portraits',
          'Shot the magazine’s annual restaurant guide for three consecutive years',
          'Set up the digital asset system that replaced unlabelled external drives',
          'Worked to print deadlines with no missed delivery in two and a half years',
        ],
      ],
      [
        'Atelier Lumière',
        'Assistant Photographer',
        'Paris',
        '2015-02',
        '2016-08',
        'Lighting and digital assistance on commercial shoots.',
        [
          'Assisted on 90+ commercial shoots across studio and location',
          'Managed lighting set-up and tethered capture for large sets',
          'Handled file ingest, backup and first-pass selection',
        ],
      ],
    ],
    education: [
      [
        'École Nationale Supérieure de la Photographie',
        'Diplôme',
        'Photography',
        '2012-09',
        '2015-06',
        'Mention Bien',
      ],
      [
        'Université Lumière Lyon 2',
        'Licence',
        'Art History',
        '2009-09',
        '2012-06',
        'Mention Assez Bien',
      ],
    ],
    skills:
      'Food Photography:E, Interior Photography:A, Portraiture:A, Studio Lighting:E, Location Lighting:A, Adobe Lightroom:E, Capture One:A, Adobe Photoshop:A, Colour Management:A, Art Direction:A, Client Briefing:A, Retouching:A',
    projects: [
      [
        'Table Ouverte',
        'Photographer',
        'A cookbook of 140 images shot across eleven regional kitchens over six months, delivered as print-ready files with a matching digital set for the publisher.',
        ['Food Photography', 'Location Lighting'],
        'lucasmoreau.photo/table-ouverte',
      ],
      [
        'Lyon Restaurant Guide',
        'Lead Photographer',
        'Three annual editions covering 90 venues each, shot on tight single-visit schedules with consistent treatment across the whole guide.',
        ['Editorial', 'Colour Management'],
        '',
      ],
    ],
    certifications: [
      ['Adobe Certified Professional, Photoshop', 'Adobe', '2022'],
      ['Drone Pilot Licence (A1/A3)', 'DGAC France', '2023'],
    ],
    languages: 'French:Native, English:Fluent, Italian:Conversational',
  },

  {
    name: 'Anjali Tamang',
    headline: 'Hotel Operations Manager',
    city: 'Pokhara, Nepal',
    phone: '+977 980 440 1172',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#201710', shirt: '#b45309', bg: '#fdeedd' },
    summary:
      'Hotel operations manager with eight years running front office, housekeeping and food and beverage across resort properties. Has taken one property from 58% to 81% occupancy without discounting, mostly by fixing the things guests complained about twice. Manages teams of up to 70 across three departments.',
    jobs: [
      [
        'Fishtail Lodge',
        'Operations Manager',
        'Pokhara',
        '2021-08',
        '',
        'Run day-to-day operations across front office, housekeeping and F&B for a 110-room resort.',
        [
          'Lifted annual occupancy from 58% to 81% over three seasons',
          'Raised the guest satisfaction score from 7.9 to 9.1 on the booking platforms',
          'Cut agency staffing spend by 40% through better rota planning',
          'Manage 70 staff across three departments and two shifts',
        ],
      ],
      [
        'Temple Tree Resort',
        'Front Office Manager',
        'Pokhara',
        '2018-03',
        '2021-07',
        'Led the front office team of twelve across reception, reservations and guest relations.',
        [
          'Reduced check-in time from eleven minutes to under four',
          'Introduced the pre-arrival contact routine that lifted upgrade uptake 26%',
          'Handled escalated guest complaints with a resolution rate above 95%',
          'Managed the switch to a new property management system',
        ],
      ],
      [
        'Hotel Barahi',
        'Guest Relations Executive',
        'Pokhara',
        '2016-05',
        '2018-02',
        'Front-of-house guest relations in a 70-room city hotel.',
        [
          'Handled arrivals, enquiries and complaints across a seven-day rota',
          'Coordinated airport transfers and excursions for up to 40 guests a day',
          'Maintained the hotel’s review responses across three platforms',
        ],
      ],
    ],
    education: [
      [
        'Nepal Academy of Tourism and Hotel Management',
        'Bachelor in Hotel Management',
        'Hospitality Management',
        '2012-08',
        '2016-04',
        'First Division',
      ],
      [
        'American Hotel & Lodging Institute',
        'Certificate',
        'Revenue Management',
        '2020-01',
        '2020-05',
        'Completed',
      ],
    ],
    skills:
      'Hotel Operations:E, Front Office Management:E, Housekeeping Supervision:A, Revenue Management:A, Guest Relations:E, Rota Planning:A, Property Management Systems:A, Budget Control:A, Team Leadership:E, Complaint Handling:E, Supplier Management:A, Food & Beverage:A',
    projects: [
      [
        'Occupancy Recovery Plan',
        'Operations Lead',
        'A three-season programme combining rate discipline, review response and fixing the ten most repeated guest complaints, which took occupancy from 58% to 81% without discounting.',
        ['Revenue Management', 'Operations'],
        '',
      ],
      [
        'Front Office Rebuild',
        'Project Lead',
        'New property management system, revised arrival process and a pre-arrival contact routine, cutting check-in from eleven minutes to under four and raising upgrade uptake 26%.',
        ['Process Design', 'Systems'],
        '',
      ],
    ],
    certifications: [
      ['Certified Hospitality Supervisor', 'AHLEI', '2021'],
      ['Food Safety Level 3', 'Nepal Food Safety Institute', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Tamang:Native, Hindi:Conversational',
  },

  {
    name: 'Samir Koirala',
    headline: 'Mobile App Developer',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 330 8812',
    website: 'samirkoirala.dev',
    github: true,
    look: { skin: 2, hair: 'short', hairColor: '#1a1411', shirt: '#4338ca', bg: '#e0e7ff' },
    summary:
      'Mobile developer with five years shipping native and cross-platform apps, mostly fintech and delivery. Has taken four apps through store review and into production with crash-free rates above 99.5%, and cares about the first-run experience on a three-year-old mid-range Android. Maintains two open-source packages.',
    jobs: [
      [
        'Khalti Digital Wallet',
        'Senior Mobile Developer',
        'Kathmandu',
        '2022-06',
        '',
        'Lead Android development on a wallet app with 2.1 million installs.',
        [
          'Raised the crash-free session rate from 97.2% to 99.6% across two quarters',
          'Cut cold start time from 3.4s to 1.5s on mid-range devices',
          'Led the migration from Java to Kotlin across 60% of the codebase',
          'Introduced automated UI tests covering the payment journeys',
        ],
      ],
      [
        'Foodmandu',
        'Mobile Developer',
        'Kathmandu',
        '2020-04',
        '2022-05',
        'Built and maintained the customer and rider apps in Flutter.',
        [
          'Shipped the rider app used daily by 900+ delivery partners',
          'Built offline order capture that kept the app usable on poor connections',
          'Reduced app size by 38% through asset auditing and code splitting',
          'Ran the fortnightly release train across both apps',
        ],
      ],
      [
        'Leapfrog Technology',
        'Junior Developer',
        'Lalitpur',
        '2019-02',
        '2020-03',
        'Mobile development on client projects in React Native.',
        [
          'Delivered features across three client apps under senior review',
          'Fixed 120+ reported defects in the first year',
          'Wrote the team’s first shared component documentation',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Engineering',
        'Computer Engineering',
        '2015-08',
        '2019-01',
        '3.5 CGPA',
      ],
      [
        'Google Developers',
        'Associate Android Developer',
        'Android Development',
        '2021-03',
        '2021-06',
        'Certified',
      ],
    ],
    skills:
      'Kotlin:E, Android SDK:E, Flutter:A, Dart:A, Swift:I, React Native:A, REST APIs:A, Firebase:A, SQLite:A, CI/CD:A, Git:E, Unit Testing:A',
    projects: [
      [
        'Offline Order Capture',
        'Developer',
        'A queue-and-sync layer that lets riders accept and complete orders without a connection, reconciling on reconnect. Cut failed order updates by 70% on poor networks.',
        ['Flutter', 'SQLite', 'Sync'],
        'github.com/samir-koirala/offline-queue',
      ],
      [
        'nepali-date-picker',
        'Maintainer',
        'An open-source Bikram Sambat date picker for Android used by around 40 applications, with localisation for Nepali and English numerals.',
        ['Kotlin', 'Android', 'Open Source'],
        'github.com/samir-koirala/nepali-date-picker',
      ],
    ],
    certifications: [
      ['Associate Android Developer', 'Google', '2021'],
      ['Flutter Certified Application Developer', 'App Brewery', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },

  {
    name: 'Deepak Thakur',
    headline: 'Network Engineer',
    city: 'Janakpur, Nepal',
    phone: '+977 985 770 3345',
    website: '',
    github: false,
    look: { skin: 3, hair: 'short', hairColor: '#120e0c', shirt: '#0e7490', bg: '#d9f1f6' },
    summary:
      'Network engineer with seven years designing and running enterprise and ISP networks, from branch routing to core BGP. Treats documentation as part of the build rather than something to do afterwards, which is why handovers go quietly. Has run two data centre migrations with under ten minutes of total downtime.',
    jobs: [
      [
        'WorldLink Communications',
        'Senior Network Engineer',
        'Janakpur',
        '2021-05',
        '',
        'Design and operate regional ISP infrastructure serving around 48,000 subscribers.',
        [
          'Redesigned regional routing, cutting average latency to the core by 38%',
          'Ran two data centre migrations with under ten minutes total downtime',
          'Built the monitoring and alerting stack now used across four regions',
          'Reduced repeat fault tickets by 44% through root cause tracking',
        ],
      ],
      [
        'Nepal Telecom',
        'Network Engineer',
        'Kathmandu',
        '2018-09',
        '2021-04',
        'Enterprise network support and project delivery for corporate customers.',
        [
          'Delivered MPLS and VPN connectivity for 60+ corporate sites',
          'Maintained core switching and routing across two exchanges',
          'Introduced configuration backups and version control for 300 devices',
          'Handled escalated faults on a 24/7 on-call rotation',
        ],
      ],
      [
        'Subisu Cablenet',
        'Network Support Engineer',
        'Kathmandu',
        '2017-06',
        '2018-08',
        'First-line and second-line network support for business customers.',
        [
          'Resolved an average of 35 tickets a week within SLA',
          'Documented the troubleshooting runbook used by the support desk',
          'Supported field teams on installation and commissioning',
        ],
      ],
    ],
    education: [
      [
        'Purbanchal University',
        'Bachelor of Engineering',
        'Electronics and Communication',
        '2013-08',
        '2017-05',
        'First Division',
      ],
      [
        'Cisco Networking Academy',
        'CCNA Routing and Switching',
        'Networking',
        '2017-07',
        '2017-12',
        'Completed',
      ],
    ],
    skills:
      'Routing & Switching:E, BGP:A, OSPF:A, MPLS:A, Network Design:A, Firewalls:A, Linux:A, Monitoring (Zabbix):A, VPN:A, Troubleshooting:E, Network Documentation:E, Python Scripting:I',
    projects: [
      [
        'Regional Routing Redesign',
        'Lead Engineer',
        'A rebuild of regional peering and internal routing policy that cut average latency to the national core by 38% and removed a long-standing single point of failure.',
        ['BGP', 'Network Design'],
        '',
      ],
      [
        'Monitoring Stack',
        'Builder',
        'Zabbix-based monitoring and alerting across 1,200 devices with escalation rules and a public status page, now the standard across four regional operations.',
        ['Zabbix', 'Automation', 'Linux'],
        '',
      ],
    ],
    certifications: [
      ['Cisco Certified Network Professional (CCNP)', 'Cisco', '2022'],
      ['Cisco Certified Network Associate (CCNA)', 'Cisco', '2017'],
    ],
    languages: 'Nepali:Native, English:Fluent, Maithili:Native, Hindi:Fluent',
  },

  {
    name: 'Isabel Fernandes',
    headline: 'Financial Analyst',
    city: 'Lisbon, Portugal',
    phone: '+351 912 447 806',
    website: '',
    github: false,
    look: { skin: 1, hair: 'long', hairColor: '#2e2018', shirt: '#1e40af', bg: '#dde8fb' },
    summary:
      'Financial analyst with six years in corporate finance and FP&A, building the models that sit under budgets, pricing and acquisition cases. Known for models other people can open and follow, with assumptions on one sheet. Has supported two completed acquisitions and a refinancing.',
    jobs: [
      [
        'Atlântico Holdings',
        'Senior Financial Analyst',
        'Lisbon',
        '2022-01',
        '',
        'Planning, forecasting and transaction support across a group of six operating companies.',
        [
          'Own the group’s annual budget and rolling 18-month forecast',
          'Built the valuation model behind a EUR 28 million acquisition that completed in 2024',
          'Cut the monthly close reporting cycle from nine days to four',
          'Rebuilt the pricing model for the largest operating company',
        ],
      ],
      [
        'Banco Horizonte',
        'Financial Analyst',
        'Lisbon',
        '2019-07',
        '2021-12',
        'Credit analysis and financial modelling for mid-market corporate lending.',
        [
          'Analysed 120+ corporate lending proposals a year',
          'Built the standard cash-flow model used across the corporate desk',
          'Supported a EUR 40 million refinancing from analysis through to documentation',
          'Produced the quarterly portfolio review pack for the credit committee',
        ],
      ],
      [
        'Deloitte Portugal',
        'Audit Associate',
        'Porto',
        '2018-01',
        '2019-06',
        'Statutory audit across manufacturing and retail clients.',
        [
          'Worked on audit engagements for nine clients across two cycles',
          'Tested revenue, inventory and payroll controls',
          'Prepared audit documentation to firm and ISA standards',
        ],
      ],
    ],
    education: [
      [
        'Nova School of Business and Economics',
        'Master of Science',
        'Finance',
        '2016-09',
        '2017-12',
        'Grade 17/20',
      ],
      [
        'University of Porto',
        'Bachelor of Science',
        'Economics',
        '2013-09',
        '2016-07',
        'Grade 16/20',
      ],
    ],
    skills:
      'Financial Modelling:E, Valuation:A, FP&A:E, Budgeting:E, Forecasting:A, Excel:E, Power BI:A, SQL:I, IFRS:A, Scenario Analysis:A, Due Diligence:A, Presentation:A',
    projects: [
      [
        'Acquisition Model',
        'Lead Analyst',
        'A full valuation and integration model for a EUR 28 million acquisition, covering three scenarios, synergy phasing and the financing structure. The deal completed in 2024.',
        ['Valuation', 'Excel', 'Due Diligence'],
        '',
      ],
      [
        'Close Acceleration',
        'Project Lead',
        'Restructured the monthly reporting process across six entities, moving from nine days to four by fixing intercompany reconciliation and automating the consolidation.',
        ['FP&A', 'Process Design'],
        '',
      ],
    ],
    certifications: [
      ['CFA Level II Candidate', 'CFA Institute', '2024'],
      ['Financial Modelling & Valuation Analyst', 'CFI', '2021'],
    ],
    languages: 'Portuguese:Native, English:Fluent, Spanish:Fluent',
  },

  {
    name: 'James Ellison',
    headline: 'Content Writer',
    city: 'Bristol, United Kingdom',
    phone: '+44 7700 229 514',
    website: 'jamesellison.co.uk',
    github: false,
    look: { skin: 0, hair: 'short', hairColor: '#4b3728', shirt: '#334155', bg: '#eceff4' },
    summary:
      'Content writer with six years in B2B software and financial services, writing the long pieces that have to be accurate as well as readable. Does the interviews and reads the documentation rather than rewriting competitor pages. Has taken one blog from 4,000 to 90,000 monthly sessions.',
    jobs: [
      [
        'Ledgerline Software',
        'Senior Content Writer',
        'Bristol',
        '2022-04',
        '',
        'Own the editorial programme for an accounting software company, from brief to publication.',
        [
          'Grew organic blog traffic from 4,000 to 90,000 monthly sessions in two years',
          'Write and edit 12 long-form pieces a month across blog, guides and docs',
          'Built the style guide and the fact-checking step now used by three writers',
          'Produced a tax-year guide that became the site’s highest-converting page',
        ],
      ],
      [
        'Fathom Agency',
        'Content Writer',
        'Bristol',
        '2020-01',
        '2022-03',
        'Wrote for eight retained B2B clients across software, logistics and professional services.',
        [
          'Delivered around 20 commissioned pieces a month to deadline',
          'Interviewed 60+ subject matter experts for source material',
          'Introduced content briefs that cut client revision rounds from three to one',
          'Ran the agency’s internal writing workshop for new starters',
        ],
      ],
      [
        'Freelance',
        'Copywriter',
        'Bristol',
        '2018-06',
        '2019-12',
        'Independent copywriting for small businesses and trade publications.',
        [
          'Wrote web copy and case studies for a dozen regular clients',
          'Placed eleven features in trade magazines',
          'Learned to scope and quote work properly, which took a year',
        ],
      ],
    ],
    education: [
      [
        'Cardiff University',
        'Master of Arts',
        'Magazine Journalism',
        '2017-09',
        '2018-06',
        'Merit',
      ],
      [
        'University of Bristol',
        'Bachelor of Arts',
        'English',
        '2014-09',
        '2017-06',
        'Upper Second Class Honours',
      ],
    ],
    skills:
      'Long-form Writing:E, SEO Writing:A, Editing:E, Interviewing:A, Content Strategy:A, Style Guides:A, Technical Writing:A, Research:E, WordPress:A, Google Analytics:I, Keyword Research:A, Fact Checking:E',
    projects: [
      [
        'Tax Year Guide',
        'Author',
        'A 9,000-word annually updated guide to the UK tax year for small businesses, now the site’s highest-converting page and its most linked-to piece.',
        ['Long-form', 'SEO', 'Research'],
        'jamesellison.co.uk/tax-guide',
      ],
      [
        'Editorial Style Guide',
        'Author',
        'A 30-page house style guide with a two-stage fact-checking process, adopted across a team of three writers and two freelancers.',
        ['Style Guide', 'Editorial Process'],
        '',
      ],
    ],
    certifications: [
      ['Professional Certificate in Content Marketing', 'CIM', '2023'],
      ['Google Analytics 4 Certification', 'Google', '2022'],
    ],
    languages: 'English:Native, German:Conversational',
  },

  {
    name: 'Sunita Basnet',
    headline: 'Physiotherapist',
    city: 'Kathmandu, Nepal',
    phone: '+977 980 880 5543',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#241a12', shirt: '#0d9488', bg: '#d6f2ef' },
    summary:
      'Physiotherapist with six years in musculoskeletal and neurological rehabilitation, split between hospital outpatients and a sports clinic. Builds programmes patients will actually do at home, which matters more than the perfect exercise they will not. Has run a return-to-play pathway for a national-level squad.',
    jobs: [
      [
        'National Rehabilitation Centre',
        'Senior Physiotherapist',
        'Kathmandu',
        '2021-09',
        '',
        'Lead musculoskeletal and neurological caseloads across outpatient and inpatient rehabilitation.',
        [
          'Carry a caseload of 25–30 patients a week across two specialities',
          'Built the post-stroke gait programme now used across the unit',
          'Raised patient-reported function scores by an average of 38% over treatment',
          'Supervise three junior physiotherapists and two students per rotation',
        ],
      ],
      [
        'Everest Sports Clinic',
        'Physiotherapist',
        'Lalitpur',
        '2019-04',
        '2021-08',
        'Sports injury assessment, treatment and return-to-play planning.',
        [
          'Managed return-to-play for a national-level football squad across two seasons',
          'Reduced reported re-injury rate in the squad from 22% to 9%',
          'Ran pre-season screening for 60 athletes a year',
          'Designed home exercise programmes with 80%+ reported adherence',
        ],
      ],
      [
        'Dhulikhel Hospital',
        'Physiotherapist',
        'Dhulikhel',
        '2018-02',
        '2019-03',
        'General outpatient physiotherapy in a teaching hospital.',
        [
          'Assessed and treated 20+ outpatients a day across orthopaedic referrals',
          'Ran group exercise classes for chronic low back pain',
          'Contributed to the hospital’s patient education leaflets',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University School of Medical Sciences',
        'Bachelor of Physiotherapy',
        'Physiotherapy',
        '2013-09',
        '2017-12',
        'First Division',
      ],
      [
        'Nepal Health Professional Council',
        'Registered Physiotherapist',
        'Physiotherapy',
        '2018-01',
        '2018-02',
        'Registered',
      ],
    ],
    skills:
      'Musculoskeletal Assessment:E, Manual Therapy:E, Neurological Rehabilitation:A, Exercise Prescription:E, Sports Injury Management:A, Gait Analysis:A, Electrotherapy:A, Patient Education:E, Dry Needling:I, Clinical Documentation:A, Outcome Measures:A, Supervision:A',
    projects: [
      [
        'Post-Stroke Gait Programme',
        'Clinical Lead',
        'A six-week structured gait retraining pathway with weekly outcome measures, now standard on the unit and showing an average 38% improvement in function scores.',
        ['Neuro Rehab', 'Outcome Measures'],
        '',
      ],
      [
        'Return-to-Play Pathway',
        'Lead Physiotherapist',
        'A criteria-based pathway for a national football squad covering screening, graded loading and sign-off, which cut reported re-injury from 22% to 9% over two seasons.',
        ['Sports Rehab', 'Screening'],
        '',
      ],
    ],
    certifications: [
      ['Registered Physiotherapist', 'Nepal Health Professional Council', '2018'],
      ['Certificate in Dry Needling', 'Physio Academy India', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },

  {
    name: 'Prakash Yadav',
    headline: 'Supply Chain Coordinator',
    city: 'Birgunj, Nepal',
    phone: '+977 985 330 7724',
    website: '',
    github: false,
    look: { skin: 3, hair: 'short', hairColor: '#120d0b', shirt: '#7c2d12', bg: '#f6e4d8' },
    summary:
      'Supply chain coordinator with six years in import logistics and warehousing, working the border crossing where most delays actually happen. Keeps customs documentation right first time, which is worth more than any expediting. Has cut average clearance time at Birgunj from eleven days to four.',
    jobs: [
      [
        'Himalaya Trading House',
        'Supply Chain Coordinator',
        'Birgunj',
        '2021-11',
        '',
        'Coordinate imports, customs clearance and warehouse distribution for a consumer goods importer.',
        [
          'Cut average customs clearance from eleven days to four',
          'Manage 240+ import consignments a year across four supplier countries',
          'Reduced demurrage charges by NPR 6.8 million in the first full year',
          'Built the supplier scorecard now used in annual negotiations',
        ],
      ],
      [
        'Nepal Freight Services',
        'Logistics Officer',
        'Birgunj',
        '2019-06',
        '2021-10',
        'Freight forwarding and customs documentation for import clients.',
        [
          'Processed customs documentation for 400+ consignments a year',
          'Reduced document rejection rate from 18% to 3%',
          'Coordinated transport across three border crossings',
          'Trained two junior officers on HS classification',
        ],
      ],
      [
        'Birgunj Warehousing',
        'Warehouse Supervisor',
        'Birgunj',
        '2018-02',
        '2019-05',
        'Day-to-day running of a 4,000 m² distribution warehouse.',
        [
          'Supervised a team of fourteen across receiving, picking and dispatch',
          'Introduced cycle counting, taking stock accuracy from 91% to 98%',
          'Maintained safety and housekeeping standards across the floor',
        ],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Master of Business Studies',
        'Supply Chain Management',
        '2017-08',
        '2019-07',
        'First Division',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Management',
        '2013-07',
        '2017-05',
        'First Division',
      ],
    ],
    skills:
      'Import Logistics:E, Customs Documentation:E, Warehouse Management:A, Inventory Control:A, Supplier Management:A, Freight Negotiation:A, HS Classification:A, ERP (SAP):I, Excel:A, Demand Planning:I, Transport Coordination:A, Compliance:A',
    projects: [
      [
        'Clearance Time Reduction',
        'Project Lead',
        'A rebuild of the documentation pack and a pre-arrival submission routine with the clearing agent, taking average customs clearance at Birgunj from eleven days to four.',
        ['Customs', 'Process Design'],
        '',
      ],
      [
        'Supplier Scorecard',
        'Creator',
        'A quarterly rating across on-time dispatch, documentation accuracy and claim rate for eighteen suppliers, now the basis for annual terms negotiation.',
        ['Supplier Management', 'Analytics'],
        '',
      ],
    ],
    certifications: [
      ['Certified Supply Chain Professional (CSCP)', 'ASCM', '2023'],
      ['Customs Agent Licence', 'Department of Customs, Nepal', '2020'],
    ],
    languages: 'Nepali:Native, English:Fluent, Bhojpuri:Native, Hindi:Fluent',
  },

  {
    name: 'Emily Watson',
    headline: 'Customer Support Team Lead',
    city: 'Toronto, Canada',
    phone: '+1 416 555 0187',
    website: '',
    github: false,
    look: { skin: 0, hair: 'long', hairColor: '#8a6336', shirt: '#0891b2', bg: '#d9f2f7' },
    summary:
      'Support team lead with seven years in SaaS, running a team of twelve across chat, email and phone for a product with 60,000 business users. Fixes the cause of repeat tickets rather than the ticket, and works closely enough with product that the fixes actually ship. Has held CSAT above 94% for three years.',
    jobs: [
      [
        'Brightpath Software',
        'Customer Support Team Lead',
        'Toronto',
        '2021-08',
        '',
        'Lead a team of twelve covering chat, email and phone support across three time zones.',
        [
          'Held CSAT above 94% for three consecutive years',
          'Cut first response time from 6 hours to 48 minutes',
          'Built the help centre that deflects around 30% of former ticket volume',
          'Run a monthly ticket-theme review with product, which has shipped 40+ fixes',
        ],
      ],
      [
        'Brightpath Software',
        'Senior Support Specialist',
        'Toronto',
        '2019-03',
        '2021-07',
        'Second-line support on technical escalations and integrations.',
        [
          'Handled 2,000+ escalated technical cases over two years',
          'Wrote the troubleshooting runbooks used by first-line agents',
          'Became the team’s subject expert on API and webhook issues',
          'Onboarded and mentored six new support specialists',
        ],
      ],
      [
        'Northline Telecom',
        'Customer Service Representative',
        'Toronto',
        '2017-06',
        '2019-02',
        'Front-line support for consumer broadband and mobile customers.',
        [
          'Handled 60+ contacts a day across phone and chat',
          'Consistently in the top three for customer satisfaction on the floor',
          'Trained on and supported three product launches',
        ],
      ],
    ],
    education: [
      [
        'Ryerson University',
        'Bachelor of Commerce',
        'Business Management',
        '2013-09',
        '2017-05',
        'Cum Laude',
      ],
      [
        'HubSpot Academy',
        'Certificate',
        'Customer Success Management',
        '2021-02',
        '2021-04',
        'Completed',
      ],
    ],
    skills:
      'Team Leadership:E, Customer Support:E, Escalation Management:E, Zendesk:E, Knowledge Base Writing:A, SLA Management:A, Coaching:A, Process Improvement:A, API Troubleshooting:A, Reporting:A, Hiring:I, Conflict Resolution:A',
    projects: [
      [
        'Help Centre Rebuild',
        'Project Lead',
        'A rewritten help centre of 180 articles organised by task rather than by feature, which deflects around 30% of the ticket volume it was built to answer.',
        ['Knowledge Base', 'Information Architecture'],
        '',
      ],
      [
        'Ticket Theme Review',
        'Creator',
        'A monthly session taking the top ten recurring ticket causes to product with evidence and volume, which has resulted in more than forty shipped fixes.',
        ['Process', 'Cross-team Working'],
        '',
      ],
    ],
    certifications: [
      ['Zendesk Support Administrator', 'Zendesk', '2022'],
      ['ITIL 4 Foundation', 'AXELOS', '2021'],
    ],
    languages: 'English:Native, French:Fluent',
  },

  {
    name: 'Bishnu Dahal',
    headline: 'Electrical Engineer',
    city: 'Hetauda, Nepal',
    phone: '+977 984 660 9913',
    website: '',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#1c1511', shirt: '#ca8a04', bg: '#fdf3d7' },
    summary:
      'Electrical engineer with seven years on power distribution and industrial installation, from substation design through to testing and commissioning. Does the protection coordination study properly, which is why the relays trip where they should. Has commissioned three 11 kV substations and a 2 MW solar plant.',
    jobs: [
      [
        'Nepal Electricity Authority',
        'Electrical Engineer',
        'Hetauda',
        '2021-02',
        '',
        'Design, testing and commissioning of distribution substations and feeder networks.',
        [
          'Commissioned three 11 kV substations serving 14,000 connections',
          'Reduced feeder outage duration by 32% through protection recoordination',
          'Carried out load flow and fault level studies for network extensions',
          'Supervise testing teams and witness all pre-energisation checks',
        ],
      ],
      [
        'Surya Power Solutions',
        'Project Engineer',
        'Hetauda',
        '2018-07',
        '2021-01',
        'Industrial electrical installation and solar project delivery.',
        [
          'Delivered a 2 MW ground-mounted solar plant from design to grid connection',
          'Designed LV distribution for six industrial installations',
          'Cut commissioning snag lists by half with a pre-handover checklist',
          'Managed site teams of up to 22 electricians',
        ],
      ],
      [
        'Hetauda Cement Industry',
        'Graduate Engineer',
        'Hetauda',
        '2017-08',
        '2018-06',
        'Plant electrical maintenance and support.',
        [
          'Maintained motor control centres and drives across the plant',
          'Assisted on the annual shutdown electrical scope',
          'Updated single-line diagrams that had been unrevised for six years',
        ],
      ],
    ],
    education: [
      [
        'Institute of Engineering, Pulchowk Campus',
        'Bachelor of Engineering',
        'Electrical Engineering',
        '2013-09',
        '2017-07',
        '3.2 CGPA',
      ],
      [
        'Nepal Engineering Council',
        'Registered Engineer',
        'Electrical Engineering',
        '2017-09',
        '2017-11',
        'Registered',
      ],
    ],
    skills:
      'Power Distribution:E, Substation Design:A, Protection Coordination:A, ETAP:A, AutoCAD Electrical:A, Testing & Commissioning:E, Solar PV Design:A, Load Flow Analysis:A, LV/MV Systems:E, Electrical Safety:A, Site Supervision:A, Maintenance Planning:A',
    projects: [
      [
        '2 MW Solar Plant',
        'Project Engineer',
        'A ground-mounted solar plant from array layout and inverter selection through to grid connection and performance testing, delivered within the grant programme deadline.',
        ['Solar PV', 'Commissioning', 'ETAP'],
        '',
      ],
      [
        'Protection Recoordination',
        'Lead Engineer',
        'A full relay coordination study across eleven feeders, resetting grading so faults isolate locally. Outage duration across the network fell 32%.',
        ['Protection', 'Power Systems'],
        '',
      ],
    ],
    certifications: [
      ['Registered Engineer, NEC', 'Nepal Engineering Council', '2017'],
      ['Certified Solar PV Installer', 'Alternative Energy Promotion Centre', '2020'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },
  {
    name: 'Dr. Meera Pandey',
    headline: 'Research Scientist, Microbiology',
    city: 'Kathmandu, Nepal',
    phone: '+977 980 770 4418',
    website: 'meerapandey.research',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#211710', shirt: '#166534', bg: '#dcf5e5' },
    summary:
      'Research microbiologist with nine years working on antimicrobial resistance in clinical isolates, now leading a laboratory of seven. Has published fourteen peer-reviewed papers and built the surveillance network that three hospitals now report into. Writes grants as carefully as protocols, which is why most of them land.',
    jobs: [
      [
        'National Public Health Laboratory',
        'Senior Research Scientist',
        'Kathmandu',
        '2021-03',
        '',
        'Lead the antimicrobial resistance research group, a laboratory of seven across bench and data work.',
        [
          'Secured NPR 48 million in competitive research funding across three grants',
          'Built a resistance surveillance network now covering three tertiary hospitals',
          'Published nine peer-reviewed papers, four as first author',
          'Supervise two PhD candidates and three research assistants',
        ],
      ],
      [
        'Tribhuvan University Teaching Hospital',
        'Research Officer',
        'Kathmandu',
        '2017-08',
        '2021-02',
        'Clinical microbiology research alongside diagnostic laboratory duties.',
        [
          'Characterised 1,400 clinical isolates for resistance patterns over three years',
          'Introduced whole-genome sequencing to the department’s research workflow',
          'Co-authored five papers on carbapenem resistance in Gram-negative organisms',
          'Trained laboratory staff on molecular diagnostic techniques',
        ],
      ],
      [
        'Kathmandu Research Institute',
        'Research Assistant',
        'Kathmandu',
        '2015-02',
        '2017-07',
        'Bench work on a tuberculosis diagnostics project.',
        [
          'Processed and cultured 900+ sputum samples under BSL-3 conditions',
          'Maintained the sample registry and chain-of-custody records',
          'Contributed to two published papers as a named co-author',
        ],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Doctor of Philosophy',
        'Medical Microbiology',
        '2016-09',
        '2021-01',
        'Awarded',
      ],
      [
        'Tribhuvan University',
        'Master of Science',
        'Microbiology',
        '2012-08',
        '2014-12',
        'Distinction',
      ],
    ],
    skills:
      'Microbiology:E, Antimicrobial Susceptibility Testing:E, PCR:E, Whole-Genome Sequencing:A, Bioinformatics:A, R:A, Research Design:E, Grant Writing:A, Scientific Writing:E, Laboratory Management:A, Biosafety:A, Statistical Analysis:A',
    projects: [
      [
        'National AMR Surveillance Network',
        'Principal Investigator',
        'A standardised resistance reporting network across three tertiary hospitals, covering protocol, data definitions and a quarterly national report now used by the ministry.',
        ['Surveillance', 'Study Design', 'R'],
        'meerapandey.research/amr-network',
      ],
      [
        'Carbapenem Resistance Study',
        'Lead Researcher',
        'A three-year characterisation of carbapenem-resistant Gram-negative isolates from 1,400 clinical samples, published across four papers in peer-reviewed journals.',
        ['Genomics', 'Microbiology'],
        '',
      ],
    ],
    certifications: [
      ['Good Clinical Laboratory Practice', 'WHO TDR', '2022'],
      ['Biosafety Level 3 Certification', 'National Public Health Laboratory', '2019'],
    ],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },

  {
    name: 'Ethan Brooks',
    headline: 'Product Manager',
    city: 'Austin, United States',
    phone: '+1 512 555 0142',
    website: 'ethanbrooks.pm',
    github: false,
    look: { skin: 0, hair: 'short', hairColor: '#3f2e1f', shirt: '#4f46e5', bg: '#e4e6fd' },
    summary:
      'Product manager with seven years in B2B SaaS, owning roadmaps where the buyer and the user are different people. Spends real time in customer calls and support tickets, and is comfortable killing a feature that tested badly. Has taken two products from first paying customer to eight figures of recurring revenue.',
    jobs: [
      [
        'Cascade Analytics',
        'Senior Product Manager',
        'Austin',
        '2022-02',
        '',
        'Own the core analytics product for a company serving 3,400 business customers.',
        [
          'Grew product-qualified trials to paid conversion from 11% to 24%',
          'Shipped a self-serve onboarding flow that cut time-to-first-value from 9 days to 2',
          'Run discovery with 20+ customers a quarter and publish the findings internally',
          'Work with a team of nine engineers and two designers across two squads',
        ],
      ],
      [
        'Meridian Tools',
        'Product Manager',
        'Austin',
        '2019-06',
        '2022-01',
        'Owned the integrations and API product area from launch through to maturity.',
        [
          'Launched a public API now used by 600+ customers and 40 partners',
          'Took integration-attached revenue from zero to USD 4.1 million ARR',
          'Replaced a feature request spreadsheet with a scored, published roadmap',
          'Reduced integration support tickets 48% through better error messaging',
        ],
      ],
      [
        'Meridian Tools',
        'Business Analyst',
        'Austin',
        '2017-08',
        '2019-05',
        'Requirements and analysis work supporting two product teams.',
        [
          'Documented workflows and requirements across four product areas',
          'Built the usage reporting the product team still runs on',
          'Ran the customer advisory panel sessions each quarter',
        ],
      ],
    ],
    education: [
      [
        'University of Texas at Austin',
        'Master of Business Administration',
        'Technology Commercialisation',
        '2015-08',
        '2017-05',
        'Honours',
      ],
      [
        'Texas A&M University',
        'Bachelor of Science',
        'Industrial Engineering',
        '2011-08',
        '2015-05',
        'Magna Cum Laude',
      ],
    ],
    skills:
      'Product Strategy:E, Customer Discovery:E, Roadmap Planning:E, A/B Testing:A, SQL:A, User Research:A, Agile Delivery:A, Pricing:A, Stakeholder Management:E, Jira:A, Analytics:A, Technical Writing:A',
    projects: [
      [
        'Self-Serve Onboarding',
        'Product Lead',
        'A guided first-run experience replacing a sales-led setup call, which cut time-to-first-value from nine days to two and more than doubled trial-to-paid conversion.',
        ['Onboarding', 'Experimentation'],
        'ethanbrooks.pm/onboarding',
      ],
      [
        'Public API Launch',
        'Product Owner',
        'Took an internal API to a documented public product with versioning, rate limits and a partner programme. Now used by 600+ customers and attached to USD 4.1 million of ARR.',
        ['API Product', 'Partnerships'],
        '',
      ],
    ],
    certifications: [
      ['Certified Scrum Product Owner', 'Scrum Alliance', '2021'],
      ['Pragmatic Institute Certified Product Manager', 'Pragmatic Institute', '2020'],
    ],
    languages: 'English:Native, Spanish:Conversational',
  },

  {
    name: 'Ritu Malla',
    headline: 'Interior Designer',
    city: 'Lalitpur, Nepal',
    phone: '+977 984 880 2217',
    website: 'ritumalla.design',
    github: false,
    look: { skin: 1, hair: 'wavy', hairColor: '#2b1e15', shirt: '#be185d', bg: '#fce8f0' },
    summary:
      'Interior designer with seven years across residential and hospitality projects, working with local timber, brick and textile where the budget and the climate suit it. Takes schemes from concept through joinery drawings to site, and knows which detail will survive a Nepali contractor and which will not. Has delivered 40+ completed interiors.',
    jobs: [
      [
        'Malla Interiors',
        'Principal Designer',
        'Lalitpur',
        '2021-04',
        '',
        'Run an independent studio delivering residential and boutique hospitality interiors.',
        [
          'Delivered 28 completed projects, from single rooms to a 22-room boutique hotel',
          'Built a maker network of nine local workshops for bespoke joinery and textiles',
          'Hold average project margin at 31% while finishing on programme',
          'Manage a team of two designers and one draughtsperson',
        ],
      ],
      [
        'Design Collective Nepal',
        'Interior Designer',
        'Kathmandu',
        '2018-08',
        '2021-03',
        'Residential and commercial interiors from concept to construction documentation.',
        [
          'Delivered 15 residential and four office projects',
          'Produced full joinery and finishes packages for site',
          'Introduced 3D visualisation, which halved client revision rounds',
          'Managed supplier procurement across lighting, furniture and surfaces',
        ],
      ],
      [
        'Sthapana Architects',
        'Junior Designer',
        'Lalitpur',
        '2017-02',
        '2018-07',
        'Interior design support on architectural projects.',
        [
          'Produced interior layouts and finish schedules under senior review',
          'Built physical material boards for client presentations',
          'Carried out site measurement and as-built surveys',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Design',
        'Interior Design',
        '2013-08',
        '2017-01',
        'First Division',
      ],
      [
        'National Institute of Design, Ahmedabad',
        'Short Programme',
        'Furniture and Craft',
        '2019-06',
        '2019-08',
        'Completed',
      ],
    ],
    skills:
      'Space Planning:E, Interior Detailing:E, SketchUp:E, AutoCAD:A, V-Ray:A, Material Selection:E, Joinery Drawings:A, Lighting Design:A, Procurement:A, Site Coordination:A, Budget Management:A, Client Presentation:E',
    projects: [
      [
        'Patan Courtyard Hotel',
        'Lead Designer',
        'Interiors for a 22-room boutique hotel in a restored Newari courtyard building, using local brick, salvaged timber and textiles woven by three workshops in the valley.',
        ['Hospitality', 'Local Craft', 'SketchUp'],
        'ritumalla.design/patan-courtyard',
      ],
      [
        'Maker Network',
        'Founder',
        'A standing relationship with nine local joinery, metal and textile workshops, with shared drawing standards and tolerances that made bespoke work affordable on normal budgets.',
        ['Procurement', 'Craft', 'Detailing'],
        '',
      ],
    ],
    certifications: [
      ['Certified Interior Designer', 'Nepal Institute of Design', '2018'],
      ['Lighting Design Fundamentals', 'IES', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Newari:Native',
  },

  {
    name: 'Karina Villanueva',
    headline: 'Flight Attendant',
    city: 'Madrid, Spain',
    phone: '+34 628 117 440',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#2a1b12', shirt: '#b91c1c', bg: '#fde3e3' },
    summary:
      'Cabin crew member with eight years on long-haul operations, now senior crew on wide-body routes across three continents. Keeps a calm cabin through the parts of the job passengers never see, and has handled two in-flight medical diversions as lead. Trains new crew on service and safety procedure.',
    jobs: [
      [
        'Iberia',
        'Senior Cabin Crew',
        'Madrid',
        '2021-06',
        '',
        'Lead cabin crew on long-haul wide-body routes to the Americas and Asia.',
        [
          'Lead a cabin team of nine across flights of up to fourteen hours',
          'Handled two in-flight medical diversions as the responsible crew member',
          'Maintain a personal passenger satisfaction rating above 96%',
          'Train and assess new crew on service standards and safety drills',
        ],
      ],
      [
        'Air Europa',
        'Cabin Crew',
        'Madrid',
        '2018-02',
        '2021-05',
        'Short and medium-haul European and transatlantic operations.',
        [
          'Flew 2,400+ sectors with no safety or service incident',
          'Selected for the business cabin team after eighteen months',
          'Supported the airline’s accessibility assistance programme',
          'Completed annual recurrent training with distinction three years running',
        ],
      ],
      [
        'Meliá Hotels International',
        'Guest Services Agent',
        'Barcelona',
        '2016-03',
        '2018-01',
        'Front desk and guest relations in a 240-room city hotel.',
        [
          'Handled arrivals, complaints and concierge requests across all shifts',
          'Worked in four languages with an international guest base',
          'Recognised twice for guest service in quarterly awards',
        ],
      ],
    ],
    education: [
      [
        'Universidad Rey Juan Carlos',
        'Bachelor of Tourism',
        'Tourism Management',
        '2012-09',
        '2016-06',
        'Notable',
      ],
      [
        'Iberia Training Academy',
        'Cabin Crew Attestation',
        'Safety and Emergency Procedures',
        '2018-01',
        '2018-02',
        'Certified',
      ],
    ],
    skills:
      'Cabin Safety:E, Emergency Procedures:E, First Aid:A, Customer Service:E, Conflict De-escalation:A, Crew Coordination:A, Service Delivery:E, Multilingual Communication:E, Security Awareness:A, Cultural Awareness:A, Training Delivery:A, Reporting:A',
    projects: [
      [
        'New Crew Mentoring',
        'Lead Trainer',
        'A structured first-six-flights mentoring routine for new cabin crew covering safety drills, service flow and debrief, now run across the long-haul base.',
        ['Training', 'Safety'],
        '',
      ],
      [
        'Accessibility Assistance Programme',
        'Crew Representative',
        'Contributed to a revised procedure for assisting passengers with reduced mobility and sensory impairments, including the briefing card now used on every flight.',
        ['Accessibility', 'Procedure Design'],
        '',
      ],
    ],
    certifications: [
      ['EASA Cabin Crew Attestation', 'EASA', '2018'],
      ['Advanced First Aid and CPR', 'Spanish Red Cross', '2024'],
    ],
    languages: 'Spanish:Native, English:Fluent, French:Fluent, Portuguese:Conversational',
  },

  {
    name: 'Tenzing Sherpa',
    headline: 'Trekking Guide & Travel Consultant',
    city: 'Namche Bazaar, Nepal',
    phone: '+977 980 990 5567',
    website: 'tenzingtreks.com',
    github: false,
    look: { skin: 2, hair: 'short', hairColor: '#151010', shirt: '#0369a1', bg: '#ddeefa' },
    summary:
      'Licensed trekking guide with eleven years in the Khumbu and Annapurna regions, leading groups to 5,500 metres and advising on itineraries for an agency. Has never had a client evacuated for preventable altitude illness, which comes down to pacing and saying no. Trains younger guides on altitude and rescue.',
    jobs: [
      [
        'Himalayan Trails',
        'Senior Guide and Travel Consultant',
        'Namche Bazaar',
        '2019-03',
        '',
        'Lead treks across the Khumbu and advise clients on itinerary planning and acclimatisation.',
        [
          'Led 140+ treks with groups of up to fourteen, to a maximum of 5,644 m',
          'No client evacuated for preventable altitude illness across eleven seasons',
          'Rewrote the agency’s acclimatisation schedules for three standard routes',
          'Train and assess six junior guides a year on altitude and rescue procedure',
        ],
      ],
      [
        'Everest Base Camp Expeditions',
        'Trekking Guide',
        'Lukla',
        '2015-02',
        '2019-02',
        'Guided scheduled and private treks on Everest Base Camp and Gokyo routes.',
        [
          'Guided 90+ group treks across five seasons',
          'Managed two emergency helicopter evacuations as the responsible guide',
          'Coordinated logistics, permits and teahouse bookings for groups of twelve',
          'Maintained a 4.9 average client rating across 300+ reviews',
        ],
      ],
      [
        'Khumbu Porter Collective',
        'Assistant Guide',
        'Namche Bazaar',
        '2013-03',
        '2015-01',
        'Portering and assistant guiding while completing the guide licence.',
        [
          'Supported 40+ treks as assistant guide and load carrier',
          'Completed the government trekking guide training and licence',
          'Learned route conditions and teahouse networks across three valleys',
        ],
      ],
    ],
    education: [
      [
        'Nepal Academy of Tourism and Hotel Management',
        'Trekking Guide Licence',
        'Mountain Tourism',
        '2014-03',
        '2014-09',
        'Licensed',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Arts',
        'Travel and Tourism',
        '2009-07',
        '2013-06',
        'Second Division',
      ],
    ],
    skills:
      'Trek Leadership:E, Altitude Management:E, Wilderness First Aid:A, Route Planning:E, Group Management:E, Risk Assessment:A, Permit Administration:A, Itinerary Design:A, Client Consultation:A, Rescue Coordination:A, Local Logistics:E, Guide Training:A',
    projects: [
      [
        'Acclimatisation Schedules',
        'Author',
        'Rewritten day-by-day ascent profiles for three standard Khumbu routes with built-in rest days and turnaround criteria, now the agency standard across all departures.',
        ['Altitude Safety', 'Itinerary Design'],
        'tenzingtreks.com/acclimatisation',
      ],
      [
        'Junior Guide Training',
        'Lead Trainer',
        'A seasonal programme for six guides a year covering altitude illness recognition, evacuation decision-making and group management in bad weather.',
        ['Training', 'Mountain Safety'],
        '',
      ],
    ],
    certifications: [
      ['Government Licensed Trekking Guide', 'Nepal Tourism Board', '2014'],
      ['Wilderness First Responder', 'NOLS', '2023'],
    ],
    languages: 'Nepali:Native, Sherpa:Native, English:Fluent, Japanese:Conversational',
  },

  {
    name: 'Olivia Carter',
    headline: 'Cybersecurity Analyst',
    city: 'Edinburgh, United Kingdom',
    phone: '+44 7700 884 316',
    website: '',
    github: true,
    look: { skin: 0, hair: 'short', hairColor: '#2f2520', shirt: '#1e293b', bg: '#e3e8ef' },
    summary:
      'Security analyst with six years in detection and incident response, working in a financial services SOC covering 11,000 endpoints. Writes detections that fire on real activity rather than on noise, and has cut alert volume by two thirds without losing coverage. Leads the incident bridge when something is actually happening.',
    jobs: [
      [
        'Caledonian Financial Group',
        'Senior Security Analyst',
        'Edinburgh',
        '2022-03',
        '',
        'Detection engineering and incident response in a 24/7 security operations centre.',
        [
          'Cut false positive alert volume by 67% while increasing true detections',
          'Led response on fourteen confirmed incidents, including two ransomware attempts',
          'Wrote 80+ detection rules mapped to MITRE ATT&CK techniques',
          'Run the quarterly purple team exercise with an external red team',
        ],
      ],
      [
        'Northlight Security',
        'Security Analyst',
        'Glasgow',
        '2019-09',
        '2022-02',
        'Managed detection and response for mid-market clients across twelve tenants.',
        [
          'Triaged an average of 200 alerts a week across twelve client environments',
          'Built the onboarding runbook that cut new client setup from three weeks to five days',
          'Handled phishing and business email compromise response for 40+ cases',
          'Produced monthly threat reporting for client security leads',
        ],
      ],
      [
        'Northlight Security',
        'SOC Analyst, Tier 1',
        'Glasgow',
        '2018-07',
        '2019-08',
        'First-line alert triage and escalation.',
        [
          'Triaged alerts against documented playbooks on a shift rotation',
          'Escalated and documented 600+ cases in the first year',
          'Contributed to the playbook library still in use',
        ],
      ],
    ],
    education: [
      [
        'University of Edinburgh',
        'Master of Science',
        'Cyber Security',
        '2017-09',
        '2018-08',
        'Distinction',
      ],
      [
        'University of Glasgow',
        'Bachelor of Science',
        'Computing Science',
        '2014-09',
        '2017-06',
        'First Class Honours',
      ],
    ],
    skills:
      'Incident Response:E, Detection Engineering:E, SIEM (Splunk):E, MITRE ATT&CK:A, Threat Hunting:A, Malware Analysis:A, Python:A, Network Forensics:A, Cloud Security (AWS):A, Phishing Analysis:E, Purple Teaming:A, Reporting:A',
    projects: [
      [
        'Alert Tuning Programme',
        'Lead Analyst',
        'A systematic review of every firing rule against six months of outcomes, retiring or rewriting the noisiest. False positives fell 67% and mean time to triage halved.',
        ['Splunk', 'Detection Engineering'],
        'github.com/olivia-carter/detection-rules',
      ],
      [
        'Purple Team Exercise',
        'Coordinator',
        'A quarterly exercise pairing an external red team with the SOC, mapping which techniques were detected, which were missed, and closing the gaps within the quarter.',
        ['Purple Teaming', 'MITRE ATT&CK'],
        '',
      ],
    ],
    certifications: [
      ['GIAC Certified Incident Handler (GCIH)', 'SANS/GIAC', '2023'],
      ['Offensive Security Certified Professional (OSCP)', 'OffSec', '2021'],
    ],
    languages: 'English:Native, Spanish:Conversational',
  },

  {
    name: 'Daniel Okafor',
    headline: 'Business Development Manager',
    city: 'Lagos, Nigeria',
    phone: '+234 802 441 9076',
    website: '',
    github: false,
    look: { skin: 4, hair: 'short', hairColor: '#0f0b09', shirt: '#065f46', bg: '#d6f0e4' },
    summary:
      'Business development manager with eight years opening markets and partnerships for fintech and logistics companies across West Africa. Works the long partnership cycle rather than the quick deal, and has signed agreements that were still producing revenue four years later. Comfortable in regulatory conversations.',
    jobs: [
      [
        'Paylink Africa',
        'Business Development Manager',
        'Lagos',
        '2021-07',
        '',
        'Lead partnerships and market entry across Nigeria, Ghana and Kenya for a payments company.',
        [
          'Signed fourteen bank and merchant partnerships worth USD 6.2 million in annual volume',
          'Opened the Ghana market from scratch to profitability in eleven months',
          'Negotiated the regulatory approvals needed for two new product categories',
          'Lead a team of four business development executives',
        ],
      ],
      [
        'Swiftline Logistics',
        'Senior Business Development Executive',
        'Lagos',
        '2018-04',
        '2021-06',
        'New business and key account growth across e-commerce and manufacturing clients.',
        [
          'Grew territory revenue 74% over three years',
          'Won and onboarded the company’s three largest accounts to date',
          'Built the partner referral programme that now supplies 18% of new business',
          'Reduced client churn from 24% to 11% through structured account reviews',
        ],
      ],
      [
        'Zenith Commercial Services',
        'Account Executive',
        'Abuja',
        '2016-08',
        '2018-03',
        'Corporate sales of business services into SME and mid-market accounts.',
        [
          'Exceeded annual target in both full years, by 12% and 21%',
          'Built a territory pipeline from a standing start to 90 live accounts',
          'Ran monthly client review meetings across the top twenty accounts',
        ],
      ],
    ],
    education: [
      [
        'Lagos Business School',
        'Master of Business Administration',
        'Business Administration',
        '2019-01',
        '2021-06',
        'Distinction',
      ],
      [
        'University of Ibadan',
        'Bachelor of Science',
        'Economics',
        '2011-09',
        '2015-07',
        'Second Class Upper',
      ],
    ],
    skills:
      'Business Development:E, Partnership Negotiation:E, Market Entry:A, Key Account Management:E, Regulatory Engagement:A, Pipeline Management:A, Contract Negotiation:A, Financial Modelling:I, CRM (HubSpot):A, Team Leadership:A, Presentations:E, Market Research:A',
    projects: [
      [
        'Ghana Market Entry',
        'Lead',
        'Took a payments product into a new country from regulatory application through to partner selection and first profitable month, achieved in eleven months.',
        ['Market Entry', 'Regulatory', 'Partnerships'],
        '',
      ],
      [
        'Partner Referral Programme',
        'Designer',
        'A tiered referral scheme with clear commercial terms and a partner portal, which now supplies around 18% of all new business at a lower cost of acquisition.',
        ['Partnerships', 'Programme Design'],
        '',
      ],
    ],
    certifications: [
      ['Certified Business Development Professional', 'IBDI', '2022'],
      ['HubSpot Sales Software Certification', 'HubSpot', '2023'],
    ],
    languages: 'English:Native, Igbo:Native, Yoruba:Conversational, French:Basic',
  },

  {
    name: 'Dr. Samjhana Bhandari',
    headline: 'Medical Officer',
    city: 'Nepalgunj, Nepal',
    phone: '+977 981 440 6690',
    website: '',
    github: false,
    look: { skin: 1, hair: 'bun', hairColor: '#1f1510', shirt: '#0e7490', bg: '#d8f0f6' },
    summary:
      'Medical officer with six years in general medicine and emergency care at a district hospital serving a catchment of 600,000. Runs an outpatient clinic of 60 patients a day alongside inpatient duties, and has set up two services that outlived the funding that started them. Teaches medical interns on rotation.',
    jobs: [
      [
        'Bheri Provincial Hospital',
        'Medical Officer',
        'Nepalgunj',
        '2021-08',
        '',
        'General medicine, emergency cover and outpatient clinics in a 300-bed provincial hospital.',
        [
          'See 50–60 outpatients a day alongside a 30-bed inpatient caseload',
          'Set up a hypertension and diabetes follow-up clinic now seeing 400 patients a month',
          'Lead the hospital’s antibiotic prescribing audit, cutting inappropriate use by 29%',
          'Teach and supervise four medical interns on each rotation',
        ],
      ],
      [
        'Rapti Academy of Health Sciences',
        'Medical Officer',
        'Dang',
        '2019-04',
        '2021-07',
        'Emergency department and general medical ward duties.',
        [
          'Managed emergency presentations across a department seeing 120 patients a day',
          'Led the department’s response during two outbreak periods',
          'Introduced a structured handover sheet between shifts',
          'Trained nursing staff on early warning score escalation',
        ],
      ],
      [
        'Patan Academy of Health Sciences',
        'Intern Medical Officer',
        'Lalitpur',
        '2018-03',
        '2019-03',
        'Rotating internship across medicine, surgery, paediatrics and obstetrics.',
        [
          'Completed all four core rotations with satisfactory assessment',
          'Assisted in over 200 procedures across surgery and obstetrics',
          'Maintained ward documentation and discharge summaries',
        ],
      ],
    ],
    education: [
      [
        'Patan Academy of Health Sciences',
        'Bachelor of Medicine, Bachelor of Surgery',
        'Medicine',
        '2012-09',
        '2018-02',
        'Distinction',
      ],
      [
        'Nepal Medical Council',
        'Registered Medical Practitioner',
        'Medicine',
        '2018-03',
        '2018-04',
        'Registered',
      ],
    ],
    skills:
      'General Medicine:E, Emergency Care:E, Outpatient Management:E, Clinical Diagnosis:E, Chronic Disease Management:A, Antibiotic Stewardship:A, Minor Procedures:A, Clinical Audit:A, Medical Teaching:A, Patient Counselling:E, Infection Control:A, Record Keeping:A',
    projects: [
      [
        'NCD Follow-up Clinic',
        'Founding Clinician',
        'A nurse-supported follow-up clinic for hypertension and diabetes with a recall register, now seeing 400 patients a month and continuing after its pilot funding ended.',
        ['Service Design', 'Chronic Disease'],
        '',
      ],
      [
        'Antibiotic Prescribing Audit',
        'Lead',
        'A two-cycle audit of prescribing against national guidance with feedback sessions for prescribers, which reduced inappropriate antibiotic use by 29%.',
        ['Clinical Audit', 'Stewardship'],
        '',
      ],
    ],
    certifications: [
      ['Registered Medical Practitioner', 'Nepal Medical Council', '2018'],
      ['Advanced Trauma Life Support', 'American College of Surgeons', '2022'],
    ],
    languages: 'Nepali:Native, English:Fluent, Awadhi:Fluent, Hindi:Fluent',
  },

  {
    name: 'Zara Ahmed',
    headline: 'Fashion Designer',
    city: 'Dubai, United Arab Emirates',
    phone: '+971 50 448 2217',
    website: 'zaraahmed.studio',
    github: false,
    look: { skin: 2, hair: 'long', hairColor: '#1d1410', shirt: '#9d174d', bg: '#fbe4ed' },
    summary:
      'Fashion designer with seven years in ready-to-wear and occasion wear, running a small label from first sketch through to production in two factories. Works in deadstock and natural fibre where the collection allows, and knows a tech pack is where margin is won or lost. Has shown four collections at regional fashion weeks.',
    jobs: [
      [
        'Studio Zara Ahmed',
        'Founder and Head Designer',
        'Dubai',
        '2021-02',
        '',
        'Run an independent ready-to-wear label across design, production and wholesale.',
        [
          'Designed and produced eight seasonal collections, 40–60 pieces each',
          'Grew wholesale to eleven stockists across the Gulf and the United Kingdom',
          'Moved 60% of the range onto deadstock and natural fibres without raising prices',
          'Manage two production factories and a studio team of four',
        ],
      ],
      [
        'Aara Couture',
        'Senior Designer',
        'Dubai',
        '2018-05',
        '2021-01',
        'Occasion wear design and development for a regional couture house.',
        [
          'Designed three collections a year across bridal and evening wear',
          'Rebuilt the tech pack standard, cutting factory sampling rounds from four to two',
          'Managed fittings and client commissions for 80+ bespoke pieces',
          'Sourced fabric and trim across India, Turkey and the UAE',
        ],
      ],
      [
        'Lamiya Label',
        'Assistant Designer',
        'Karachi',
        '2016-08',
        '2018-04',
        'Design and development support on ready-to-wear collections.',
        [
          'Produced technical flats and specification sheets for two collections a year',
          'Managed the fabric library and supplier sample requests',
          'Assisted on fittings and pattern correction with the sample room',
        ],
      ],
    ],
    education: [
      [
        'London College of Fashion',
        'Master of Arts',
        'Fashion Design Technology',
        '2014-09',
        '2016-06',
        'Merit',
      ],
      [
        'Indus Valley School of Art and Architecture',
        'Bachelor of Design',
        'Textile Design',
        '2010-09',
        '2014-06',
        'First Division',
      ],
    ],
    skills:
      'Collection Design:E, Pattern Cutting:A, Technical Packs:E, Draping:A, Adobe Illustrator:E, CLO 3D:A, Fabric Sourcing:E, Production Management:A, Fittings:A, Trend Research:A, Costing:A, Sustainable Sourcing:A',
    projects: [
      [
        'Deadstock Capsule',
        'Designer',
        'A 24-piece capsule built entirely from mill deadstock, costed to the same retail price as the main line and sold through in nine weeks.',
        ['Sustainable Sourcing', 'Collection Design'],
        'zaraahmed.studio/deadstock',
      ],
      [
        'Tech Pack Standard',
        'Author',
        'A rebuilt specification format with graded measurements, construction notes and photographic references, which cut factory sampling rounds from four to two.',
        ['Technical Design', 'Production'],
        '',
      ],
    ],
    certifications: [
      ['CLO 3D Certified Professional', 'CLO Virtual Fashion', '2023'],
      ['Sustainable Fashion Certificate', 'Centre for Sustainable Fashion', '2022'],
    ],
    languages: 'English:Fluent, Urdu:Native, Arabic:Conversational',
  },

  {
    name: 'Ryan Patel',
    headline: 'DevOps Engineer',
    city: 'Toronto, Canada',
    phone: '+1 647 555 0219',
    website: 'ryanpatel.io',
    github: true,
    look: { skin: 2, hair: 'short', hairColor: '#171210', shirt: '#0f766e', bg: '#d5f2ee' },
    summary:
      'DevOps engineer with six years building and running production infrastructure on AWS and Kubernetes, for teams that deploy several times a day. Treats the pipeline as a product with its own users, and has taken deployment from a fortnightly event to something nobody mentions. On call and comfortable with it.',
    jobs: [
      [
        'Northwind Cloud',
        'Senior DevOps Engineer',
        'Toronto',
        '2022-04',
        '',
        'Own platform and delivery infrastructure for a SaaS product serving 4,000 business customers.',
        [
          'Took deployment frequency from fortnightly to 30+ releases a week',
          'Cut AWS spend by 34% through rightsizing and spot instances, with no SLA breach',
          'Built the Terraform modules that now provision every environment',
          'Reduced mean time to recovery from 95 minutes to 18',
        ],
      ],
      [
        'Vantage Analytics',
        'DevOps Engineer',
        'Toronto',
        '2020-01',
        '2022-03',
        'Infrastructure and CI/CD for a data platform team of twenty engineers.',
        [
          'Migrated 40 services from EC2 to EKS with no customer-visible downtime',
          'Built the CI pipeline that cut average build time from 22 minutes to 6',
          'Introduced infrastructure as code across all three environments',
          'Set up centralised logging and tracing across the estate',
        ],
      ],
      [
        'Vantage Analytics',
        'Systems Engineer',
        'Toronto',
        '2018-06',
        '2019-12',
        'Linux systems administration and release support.',
        [
          'Maintained 120 Linux servers across staging and production',
          'Automated routine patching and backup verification',
          'Supported releases on a weekly deployment cycle',
        ],
      ],
    ],
    education: [
      [
        'University of Waterloo',
        'Bachelor of Applied Science',
        'Computer Engineering',
        '2014-09',
        '2018-05',
        'Distinction',
      ],
      [
        'Linux Foundation',
        'Certified Kubernetes Administrator',
        'Kubernetes',
        '2021-02',
        '2021-04',
        'Certified',
      ],
    ],
    skills:
      'Kubernetes:E, AWS:E, Terraform:E, Docker:E, CI/CD:E, Linux:E, Python:A, Observability:A, GitHub Actions:A, Helm:A, Incident Response:A, Cost Optimisation:A',
    projects: [
      [
        'EKS Migration',
        'Lead Engineer',
        'Moved 40 services from EC2 to managed Kubernetes across three environments with no customer-visible downtime, including a rollback plan exercised twice in staging.',
        ['Kubernetes', 'AWS', 'Terraform'],
        'github.com/ryan-patel/eks-migration-notes',
      ],
      [
        'Pipeline Rebuild',
        'Engineer',
        'A rebuilt CI pipeline with layer caching and parallel test sharding, taking average build time from 22 minutes to 6 and making the deploy-on-merge default safe.',
        ['GitHub Actions', 'Docker'],
        '',
      ],
    ],
    certifications: [
      ['Certified Kubernetes Administrator (CKA)', 'Linux Foundation', '2021'],
      ['AWS Certified Solutions Architect – Associate', 'Amazon Web Services', '2022'],
    ],
    languages: 'English:Native, Gujarati:Fluent, French:Conversational',
  },
];

/** Every person as a full CV body, in the same order as PEOPLE. */
export const SAMPLE_PEOPLE = PEOPLE.map(toCV);
