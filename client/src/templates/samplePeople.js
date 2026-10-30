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
      'Full-stack developer with three years of experience building web applications in React and Node.js. Comfortable from database design to deployment, and most interested in making complex workflows simple for the people who use them.',
    jobs: [
      [
        'Himal Digital',
        'Software Engineer',
        'Kathmandu',
        '2023-04',
        '',
        'Lead developer on a booking platform used by 40 partner hotels across the Kathmandu valley.',
        [
          'Cut page load time by 45% by moving image processing to a background queue',
          'Designed the REST API and MongoDB schema for the reservations module',
          'Mentored two junior developers through their first production releases',
        ],
      ],
      [
        'Everest Softworks',
        'Junior Web Developer',
        'Lalitpur',
        '2021-08',
        '2023-03',
        'Built and maintained client websites and internal dashboards.',
        [
          'Delivered 12 client projects on schedule',
          'Introduced automated tests, reducing reported bugs by 30%',
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
    ],
    skills: 'JavaScript:E, React:A, Node.js:A, MongoDB:A, SQL:I, Git:A, Tailwind CSS:I',
    projects: [
      [
        'Smart CV Generator',
        'Developer',
        'A CV builder with live templates, PDF export and job matching.',
        ['React', 'Express', 'MongoDB'],
        'github.com/anisha-thapa/cv-generator',
      ],
    ],
    certifications: [['Cloud Practitioner', 'Amazon Web Services', '2024']],
    languages: 'Nepali:Native, English:Fluent, Hindi:Conversational',
  },
  {
    name: 'Rohan Karki',
    headline: 'Marketing Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 220 1187',
    look: { skin: 2, hair: 'short', hairColor: '#1f1a17', shirt: '#1e3a8a', bg: '#e0e7ff' },
    summary:
      'Marketing manager with seven years of experience leading brand and digital campaigns for consumer brands. Known for turning research into clear campaigns that move sales, and for building teams that ship on time.',
    jobs: [
      [
        'Gorkha Beverages',
        'Marketing Manager',
        'Kathmandu',
        '2021-02',
        '',
        'Own the marketing plan and a team of six for three national drink brands.',
        [
          'Grew market share from 18% to 26% in two years',
          'Launched a loyalty app with 120,000 sign-ups in its first year',
          'Cut cost per lead by 35% by moving spend to search and video',
        ],
      ],
      [
        'Bluebird Advertising',
        'Account Executive',
        'Lalitpur',
        '2017-06',
        '2021-01',
        'Managed campaigns for retail, telecom and banking clients.',
        [
          'Won four new accounts worth NPR 30 million a year',
          'Ran the agency’s first fully digital product launch',
        ],
      ],
    ],
    education: [
      [
        'Kathmandu University School of Management',
        'Master of Business Administration',
        'Marketing',
        '2015-08',
        '2017-05',
        'Distinction',
      ],
    ],
    skills:
      'Brand Strategy:E, Digital Campaigns:A, Market Research:A, Google Ads:A, Team Leadership:A, Budgeting:I',
    projects: [
      [
        '“Taste of the Hills” campaign',
        'Campaign lead',
        'A national TV and social campaign that lifted summer sales by 22%.',
        ['TV', 'Meta Ads', 'YouTube'],
        '',
      ],
    ],
    certifications: [['Google Ads Search Certification', 'Google', '2023']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Sofia Marquez',
    headline: 'Graphic Designer',
    city: 'Pokhara, Nepal',
    phone: '+977 981 330 4521',
    website: 'sofiamarquez.design',
    look: { skin: 2, hair: 'wavy', hairColor: '#5a3825', shirt: '#be185d', bg: '#fce7f3' },
    summary:
      'Graphic designer specialising in brand identity and packaging, with five years in studios and in-house teams. I care about type, colour and making a brand feel the same everywhere it appears.',
    jobs: [
      [
        'Lakeside Creative Studio',
        'Senior Graphic Designer',
        'Pokhara',
        '2022-03',
        '',
        'Lead designer for identity, packaging and print work for hospitality clients.',
        [
          'Rebranded 14 hotels and cafés, from logo to signage',
          'Built a shared brand library that halved artwork turnaround',
          'Art-directed photo shoots for three seasonal menus',
        ],
      ],
      [
        'Mandala Print House',
        'Graphic Designer',
        'Kathmandu',
        '2019-07',
        '2022-02',
        'Designed packaging, posters and catalogues for local manufacturers.',
        [
          'Designed packaging for a tea range now sold in five countries',
          'Prepared over 300 print-ready files with zero reprints',
        ],
      ],
    ],
    education: [
      [
        'Lalit Kala Campus',
        'Bachelor of Fine Arts',
        'Applied Arts',
        '2015-08',
        '2019-06',
        'First Division',
      ],
    ],
    skills:
      'Adobe Illustrator:E, Photoshop:E, InDesign:A, Figma:A, Typography:A, Brand Identity:E, Packaging:A',
    projects: [
      [
        'Himalayan Tea Co. packaging',
        'Lead designer',
        'A five-flavour packaging system using illustrated landscapes.',
        ['Illustrator', 'Print'],
        'behance.net/sofiamarquez',
      ],
    ],
    certifications: [['Adobe Certified Professional: Illustrator', 'Adobe', '2022']],
    languages: 'English:Fluent, Spanish:Native, Nepali:Conversational',
  },
  {
    name: 'Bikash Adhikari',
    headline: 'Chartered Accountant',
    city: 'Biratnagar, Nepal',
    phone: '+977 985 440 7712',
    look: { skin: 3, hair: 'beard', hairColor: '#1b1512', shirt: '#0f172a', bg: '#e2e8f0' },
    summary:
      'Chartered accountant with eight years in audit and financial reporting for manufacturing and NGO clients. Careful, deadline-driven and comfortable explaining numbers to people who are not accountants.',
    jobs: [
      [
        'Koshi Industries Ltd.',
        'Finance Manager',
        'Biratnagar',
        '2020-01',
        '',
        'Lead a team of five covering reporting, tax and payroll for a 600-person manufacturer.',
        [
          'Closed monthly accounts in 5 days instead of 12',
          'Saved NPR 4.2 million a year by renegotiating supplier terms',
          'Passed three external audits with no findings',
        ],
      ],
      [
        'Shah & Associates',
        'Audit Senior',
        'Kathmandu',
        '2016-08',
        '2019-12',
        'Led statutory audits for manufacturing, trading and non-profit clients.',
        ['Managed audits for 25 clients a year', 'Trained eight audit juniors'],
      ],
    ],
    education: [
      [
        'Institute of Chartered Accountants of Nepal',
        'Chartered Accountancy',
        'Accounting',
        '2012-01',
        '2016-06',
        'Qualified',
      ],
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Accounting',
        '2009-08',
        '2012-07',
        'First Division',
      ],
    ],
    skills: 'Financial Reporting:E, NFRS / IFRS:A, Tax Planning:A, Audit:E, Excel:E, Tally ERP:A',
    projects: [
      [
        'ERP migration',
        'Finance lead',
        'Moved the company’s ledgers from spreadsheets to an ERP with no lost records.',
        ['Tally ERP', 'Excel'],
        '',
      ],
    ],
    certifications: [['Certified Information Systems Auditor', 'ISACA', '2021']],
    languages: 'Nepali:Native, Maithili:Native, English:Fluent',
  },
  {
    name: 'Priya Sharma',
    headline: 'Registered Nurse',
    city: 'Chitwan, Nepal',
    phone: '+977 982 550 9086',
    look: { skin: 2, hair: 'bun', hairColor: '#24160f', shirt: '#0e7490', bg: '#cffafe' },
    summary:
      'Registered nurse with six years in intensive care and emergency wards. Calm under pressure, careful with medicines and records, and patient with families at difficult moments.',
    jobs: [
      [
        'Chitwan Medical College Hospital',
        'Senior Staff Nurse, ICU',
        'Bharatpur',
        '2021-05',
        '',
        'Care for critically ill adults in a 20-bed intensive care unit.',
        [
          'Cut medication errors on the unit by 40% with a double-check routine',
          'Trained 30 new nurses in ventilator care',
          'Led the unit’s infection-control audits',
        ],
      ],
      [
        'Bharatpur Hospital',
        'Staff Nurse, Emergency',
        'Bharatpur',
        '2018-03',
        '2021-04',
        'Triage and treatment in a busy public emergency department.',
        [
          'Handled an average of 60 patients a shift',
          'Helped set up the hospital’s first triage colour system',
        ],
      ],
    ],
    education: [
      [
        'B.P. Koirala Institute of Health Sciences',
        'Bachelor of Nursing Science',
        'Nursing',
        '2014-09',
        '2018-02',
        '78%',
      ],
    ],
    skills:
      'Critical Care:E, Patient Assessment:E, IV Therapy:A, Ventilator Care:A, Infection Control:A, Patient Records:A',
    projects: [
      [
        'Safe medicines round',
        'Project lead',
        'A checklist and labelling routine adopted by four wards.',
        ['Quality improvement'],
        '',
      ],
    ],
    certifications: [
      ['Basic Life Support (BLS)', 'Nepal Red Cross', '2024'],
      ['Advanced Cardiac Life Support', 'NHRC', '2023'],
    ],
    languages: 'Nepali:Native, Hindi:Fluent, English:Fluent',
  },
  {
    name: 'Suman Gurung',
    headline: 'Civil Engineer',
    city: 'Dharan, Nepal',
    phone: '+977 980 660 2245',
    look: { skin: 1, hair: 'short', hairColor: '#111111', shirt: '#b45309', bg: '#fef3c7' },
    summary:
      'Civil engineer with six years designing and supervising roads, bridges and water-supply schemes in hill districts. Practical on site, strict on safety and quality, and good at keeping contractors on schedule.',
    jobs: [
      [
        'Sagarmatha Construction Pvt. Ltd.',
        'Site Engineer',
        'Dhankuta',
        '2021-01',
        '',
        'Supervise construction of a 42 km hill road and its drainage.',
        [
          'Completed the first 18 km two months ahead of schedule',
          'Reduced concrete wastage by 15% with batch planning',
          'Kept the site at zero lost-time accidents for 400 days',
        ],
      ],
      [
        'Department of Roads',
        'Assistant Engineer',
        'Kathmandu',
        '2018-07',
        '2020-12',
        'Designed and estimated rural roads and bridges.',
        [
          'Designed 6 suspension bridges',
          'Prepared cost estimates for projects worth NPR 900 million',
        ],
      ],
    ],
    education: [
      [
        'Pulchowk Campus, IOE',
        'Bachelor of Civil Engineering',
        'Civil Engineering',
        '2013-11',
        '2018-04',
        '76%',
      ],
    ],
    skills:
      'AutoCAD:E, Structural Analysis:A, SAP2000:A, Site Supervision:E, Cost Estimation:A, MS Project:I',
    projects: [
      [
        'Leguwa suspension bridge',
        'Design engineer',
        'A 120 m pedestrian bridge serving four villages.',
        ['AutoCAD', 'SAP2000'],
        '',
      ],
    ],
    certifications: [['Nepal Engineering Council Registration', 'NEC', '2018']],
    languages: 'Nepali:Native, Gurung:Native, English:Fluent',
  },
  {
    name: 'Grace Lama',
    headline: 'Human Resources Executive',
    city: 'Kathmandu, Nepal',
    phone: '+977 986 770 3319',
    look: { skin: 1, hair: 'long', hairColor: '#120d0b', shirt: '#7c3aed', bg: '#ede9fe' },
    summary:
      'HR executive with five years in recruitment, onboarding and employee relations for fast-growing companies. I build fair, simple processes that make people want to join and stay.',
    jobs: [
      [
        'Summit Telecom',
        'HR Executive',
        'Kathmandu',
        '2022-01',
        '',
        'Run recruitment and onboarding for a 900-person telecom operator.',
        [
          'Filled 140 roles in a year with a 92% probation pass rate',
          'Cut time to hire from 45 to 28 days',
          'Launched an exit survey that halved first-year turnover',
        ],
      ],
      [
        'Peak Staffing',
        'Recruitment Officer',
        'Lalitpur',
        '2019-04',
        '2021-12',
        'Sourced and screened candidates for banking and IT clients.',
        ['Placed 200+ candidates', 'Built a talent pool of 5,000 profiles'],
      ],
    ],
    education: [
      [
        'Ace Institute of Management',
        'Bachelor of Business Administration',
        'Human Resources',
        '2015-08',
        '2019-06',
        '3.5 CGPA',
      ],
    ],
    skills:
      'Recruitment:E, Onboarding:A, Employee Relations:A, Labour Law:I, HRIS:A, Interviewing:E',
    projects: [
      [
        'Graduate trainee programme',
        'Coordinator',
        'A yearly intake of 20 graduates with a six-month rotation plan.',
        ['Training design'],
        '',
      ],
    ],
    certifications: [['SHRM Certified Professional', 'SHRM', '2023']],
    languages: 'Nepali:Native, Tamang:Native, English:Fluent',
  },
  {
    name: 'Arjun Bhattarai',
    headline: 'Data Analyst',
    city: 'Lalitpur, Nepal',
    phone: '+977 984 880 4410',
    github: true,
    look: { skin: 2, hair: 'short', hairColor: '#2a1c14', shirt: '#047857', bg: '#d1fae5' },
    summary:
      'Data analyst with four years of turning messy business data into dashboards and decisions. Strong in SQL and Python, and in explaining what the numbers mean in plain words.',
    jobs: [
      [
        'Daraz Nepal',
        'Data Analyst',
        'Lalitpur',
        '2022-06',
        '',
        'Analyse sales, delivery and customer data for the commercial team.',
        [
          'Built a delivery dashboard that cut late orders by 18%',
          'Found a pricing error worth NPR 2 million a month',
          'Automated 12 weekly reports, saving 15 hours a week',
        ],
      ],
      [
        'CloudFactory',
        'Junior Analyst',
        'Kathmandu',
        '2020-08',
        '2022-05',
        'Cleaned and reported on data-labelling quality.',
        ['Raised labelling accuracy from 91% to 97%', 'Wrote the team’s first Python data checks'],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Science',
        'Computer Science',
        '2016-08',
        '2020-07',
        '3.6 CGPA',
      ],
    ],
    skills: 'SQL:E, Python:A, Power BI:A, Excel:E, Statistics:A, Tableau:I',
    projects: [
      [
        'Customer churn model',
        'Analyst',
        'Predicted which customers were likely to leave, with 81% accuracy.',
        ['Python', 'pandas', 'scikit-learn'],
        'github.com/arjun-bhattarai/churn',
      ],
    ],
    certifications: [['Microsoft Certified: Power BI Data Analyst', 'Microsoft', '2023']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Maya Rai',
    headline: 'Secondary School Teacher',
    city: 'Ilam, Nepal',
    phone: '+977 981 990 5521',
    look: { skin: 1, hair: 'bun', hairColor: '#1c1410', shirt: '#dc2626', bg: '#fee2e2' },
    summary:
      'Science teacher with nine years of teaching grades 8–12. I make lessons practical, track every student’s progress, and enjoy running the school’s science club.',
    jobs: [
      [
        'Ilam Model Secondary School',
        'Senior Science Teacher',
        'Ilam',
        '2019-04',
        '',
        'Teach physics and chemistry to grades 9–12 and lead the science department.',
        [
          'Raised SEE science pass rate from 68% to 91%',
          'Set up the school’s first working laboratory',
          'Coached a team to the national science fair final',
        ],
      ],
      [
        'Kanchanjunga Academy',
        'Science Teacher',
        'Ilam',
        '2015-05',
        '2019-03',
        'Taught general science to grades 6–10.',
        ['Introduced weekly practical classes', 'Mentored 4 student teachers'],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Master of Education',
        'Science Education',
        '2013-08',
        '2015-04',
        'First Division',
      ],
      [
        'Mahendra Ratna Campus',
        'Bachelor of Science',
        'Physics',
        '2009-08',
        '2012-07',
        'First Division',
      ],
    ],
    skills:
      'Lesson Planning:E, Physics:E, Chemistry:A, Classroom Management:A, Assessment:A, Google Classroom:I',
    projects: [
      [
        'Solar science club',
        'Founder',
        'Students built and installed solar lights for 30 homes.',
        ['Physics', 'Electronics'],
        '',
      ],
    ],
    certifications: [['Teaching Licence (Secondary)', 'Teacher Service Commission', '2015']],
    languages: 'Nepali:Native, Rai:Native, English:Fluent',
  },
  {
    name: 'David Chen',
    headline: 'Sales Representative',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 101 6632',
    look: { skin: 0, hair: 'short', hairColor: '#0f0f0f', shirt: '#1d4ed8', bg: '#dbeafe' },
    summary:
      'B2B sales representative with five years selling software and office equipment. Consistently over target, organised in the CRM, and good at long-term client relationships.',
    jobs: [
      [
        'Nexus IT Solutions',
        'Senior Sales Representative',
        'Kathmandu',
        '2021-09',
        '',
        'Sell accounting and HR software to small and medium businesses.',
        [
          'Reached 128% of annual target two years running',
          'Brought in 45 new business accounts',
          'Kept a 94% renewal rate across 120 clients',
        ],
      ],
      [
        'OfficePro Traders',
        'Sales Executive',
        'Lalitpur',
        '2019-01',
        '2021-08',
        'Sold printers and office equipment to corporate buyers.',
        ['Grew territory revenue by 40%', 'Named sales executive of the year 2020'],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Bachelor of Business Studies',
        'Marketing',
        '2014-08',
        '2018-07',
        'Second Division',
      ],
    ],
    skills:
      'B2B Sales:E, Negotiation:A, CRM (HubSpot):A, Prospecting:A, Presentations:A, Account Management:E',
    projects: [
      [
        'Partner reseller network',
        'Sales lead',
        'Signed 8 resellers outside the valley, adding 20% to revenue.',
        ['Channel sales'],
        '',
      ],
    ],
    certifications: [['HubSpot Sales Software', 'HubSpot Academy', '2023']],
    languages: 'English:Fluent, Mandarin:Native, Nepali:Fluent',
  },
  {
    name: 'Aisha Rahman',
    headline: 'UX Designer',
    city: 'Lalitpur, Nepal',
    phone: '+977 980 211 7743',
    website: 'aisharahman.design',
    look: { skin: 3, hair: 'long', hairColor: '#120c09', shirt: '#0f766e', bg: '#ccfbf1' },
    summary:
      'UX designer with four years designing mobile and web products, from research to tested prototypes. I like hard problems, honest usability tests and designs developers enjoy building.',
    jobs: [
      [
        'Khalti Digital Wallet',
        'Product Designer',
        'Lalitpur',
        '2022-02',
        '',
        'Design payment and onboarding flows for a wallet with 4 million users.',
        [
          'Redesigned sign-up, raising completion from 61% to 83%',
          'Ran 40 usability sessions across five cities',
          'Built the team’s Figma component library',
        ],
      ],
      [
        'Bitmap Studio',
        'UI/UX Designer',
        'Kathmandu',
        '2020-06',
        '2022-01',
        'Designed websites and apps for start-ups and NGOs.',
        [
          'Delivered 15 products from wireframe to launch',
          'Introduced design reviews with developers',
        ],
      ],
    ],
    education: [
      [
        'Islington College',
        'BSc (Hons) Computing',
        'Interaction Design',
        '2016-09',
        '2020-05',
        'First Class',
      ],
    ],
    skills:
      'Figma:E, User Research:A, Prototyping:E, Usability Testing:A, Design Systems:A, HTML/CSS:I',
    projects: [
      [
        'Bill-split feature',
        'Lead designer',
        'Let users split a bill with friends; used 300,000 times in month one.',
        ['Figma', 'Maze'],
        'aisharahman.design/split',
      ],
    ],
    certifications: [['Google UX Design Certificate', 'Google', '2021']],
    languages: 'English:Fluent, Urdu:Native, Nepali:Fluent',
  },
  {
    name: 'Nabin Shrestha',
    headline: 'Mechanical Engineer',
    city: 'Hetauda, Nepal',
    phone: '+977 982 312 8854',
    look: { skin: 2, hair: 'beard', hairColor: '#231812', shirt: '#475569', bg: '#e2e8f0' },
    summary:
      'Mechanical engineer with seven years in plant maintenance and production for cement and food factories. Focused on uptime, safety and steady, measurable improvement.',
    jobs: [
      [
        'Hetauda Cement Industries',
        'Maintenance Engineer',
        'Hetauda',
        '2020-03',
        '',
        'Lead preventive maintenance for kilns, mills and conveyors.',
        [
          'Raised plant uptime from 84% to 93%',
          'Cut spare-parts spending by 20% with stock planning',
          'Introduced lock-out/tag-out across the plant',
        ],
      ],
      [
        'Nepal Dairy Pvt. Ltd.',
        'Production Engineer',
        'Kathmandu',
        '2017-01',
        '2020-02',
        'Ran packaging and processing lines.',
        ['Increased line output by 15%', 'Commissioned a new pasteuriser on budget'],
      ],
    ],
    education: [
      [
        'Pulchowk Campus, IOE',
        'Bachelor of Mechanical Engineering',
        'Mechanical Engineering',
        '2012-11',
        '2016-10',
        '74%',
      ],
    ],
    skills:
      'SolidWorks:A, Preventive Maintenance:E, Root Cause Analysis:A, Lean Manufacturing:A, AutoCAD:A, PLC Basics:I',
    projects: [
      [
        'Kiln heat recovery',
        'Project engineer',
        'Reused waste heat to dry raw material, saving 8% fuel.',
        ['Thermodynamics', 'SolidWorks'],
        '',
      ],
    ],
    certifications: [['Lean Six Sigma Green Belt', 'KnowledgeHut', '2022']],
    languages: 'Nepali:Native, Newari:Native, English:Fluent',
  },
  {
    name: 'Elena Novak',
    headline: 'Project Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 986 413 9965',
    look: { skin: 0, hair: 'wavy', hairColor: '#b07a43', shirt: '#9f1239', bg: '#ffe4e6' },
    summary:
      'Project manager with nine years delivering international development and IT projects. I keep budgets honest, risks visible and teams pointed at the same goal.',
    jobs: [
      [
        'Green Valley Development Trust',
        'Senior Project Manager',
        'Kathmandu',
        '2020-06',
        '',
        'Manage a USD 6 million clean-water programme across 12 districts.',
        [
          'Delivered water to 85,000 people a quarter ahead of plan',
          'Kept spending within 2% of budget for four years',
          'Led a team of 35 staff and 8 partner organisations',
        ],
      ],
      [
        'Tech Bridge Consulting',
        'Project Manager',
        'Lalitpur',
        '2016-02',
        '2020-05',
        'Ran software rollouts for banks and government offices.',
        ['Delivered 11 projects on time', 'Introduced agile planning to three client teams'],
      ],
    ],
    education: [
      [
        'University of Ljubljana',
        'Master of Science',
        'Project Management',
        '2012-10',
        '2014-09',
        'Distinction',
      ],
    ],
    skills:
      'Project Planning:E, Risk Management:A, Budgeting:A, Stakeholder Management:E, MS Project:A, Agile / Scrum:A',
    projects: [
      [
        'Clean water for 12 districts',
        'Programme lead',
        'Wells, tanks and training for village water committees.',
        ['Monitoring & evaluation'],
        '',
      ],
    ],
    certifications: [['Project Management Professional (PMP)', 'PMI', '2018']],
    languages: 'English:Fluent, Slovenian:Native, Nepali:Conversational',
  },
  {
    name: 'Kiran Magar',
    headline: 'Head Chef',
    city: 'Pokhara, Nepal',
    phone: '+977 981 514 1076',
    look: { skin: 3, hair: 'short', hairColor: '#120d0a', shirt: '#f8fafc', bg: '#fde68a' },
    summary:
      'Head chef with ten years in hotel and restaurant kitchens, cooking Nepali, Indian and continental food. Runs a clean, calm kitchen and keeps food costs under control.',
    jobs: [
      [
        'Fishtail Lakeside Resort',
        'Head Chef',
        'Pokhara',
        '2020-09',
        '',
        'Run a 14-person kitchen serving three restaurants and banquets.',
        [
          'Brought food cost down from 38% to 31%',
          'Created a tasting menu now booked out every weekend',
          'Passed every health inspection with top grade',
        ],
      ],
      [
        'Hotel Annapurna',
        'Sous Chef',
        'Kathmandu',
        '2016-04',
        '2020-08',
        'Second in charge of a busy five-star kitchen.',
        ['Catered events for up to 800 guests', 'Trained 20 commis chefs'],
      ],
    ],
    education: [
      [
        'Nepal Academy of Tourism and Hotel Management',
        'Diploma in Culinary Arts',
        'Culinary Arts',
        '2012-08',
        '2014-07',
        'Distinction',
      ],
    ],
    skills:
      'Menu Design:E, Nepali Cuisine:E, Food Costing:A, Kitchen Management:E, Food Safety (HACCP):A, Pastry:I',
    projects: [
      [
        'Farm-to-table menu',
        'Creator',
        'A seasonal menu sourced from 10 local farms.',
        ['Menu design', 'Sourcing'],
        '',
      ],
    ],
    certifications: [['HACCP Level 3 Food Safety', 'Highfield', '2022']],
    languages: 'Nepali:Native, Magar:Native, English:Good',
  },
  {
    name: 'Sarita Poudel',
    headline: 'Journalist',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 615 2187',
    look: { skin: 2, hair: 'long', hairColor: '#2a1a12', shirt: '#334155', bg: '#f1f5f9' },
    summary:
      'Reporter with seven years covering politics, health and climate for print and online news. Accurate, quick on deadline and good at making complicated stories easy to follow.',
    jobs: [
      [
        'The Valley Post',
        'Senior Reporter',
        'Kathmandu',
        '2021-01',
        '',
        'Cover national politics and health policy for print and web.',
        [
          'Broke a hospital-procurement story that led to a public inquiry',
          'Grew the health newsletter to 40,000 subscribers',
          'Published 300+ stories with no corrections required',
        ],
      ],
      [
        'Radio Sagarmatha',
        'News Reporter',
        'Lalitpur',
        '2017-05',
        '2020-12',
        'Reported and produced daily radio bulletins.',
        [
          'Produced a 20-part series on climate in the mountains',
          'Won a national reporting award in 2019',
        ],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Master of Arts',
        'Journalism and Mass Communication',
        '2014-08',
        '2016-12',
        'First Division',
      ],
    ],
    skills:
      'News Writing:E, Investigative Reporting:A, Interviewing:E, Fact-checking:A, Audio Editing:I, Social Media:A',
    projects: [
      [
        '“Thin Air” climate series',
        'Reporter and producer',
        'Long-form reports on glacier melt and mountain communities.',
        ['Audio', 'Data journalism'],
        '',
      ],
    ],
    certifications: [['Data Journalism', 'Google News Initiative', '2022']],
    languages: 'Nepali:Native, English:Fluent, Hindi:Good',
  },
  {
    name: 'Rajesh Mishra',
    headline: 'Corporate Lawyer',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 716 3298',
    look: { skin: 2, hair: 'bald', hairColor: '#111111', shirt: '#111827', bg: '#e5e7eb' },
    summary:
      'Corporate lawyer with eleven years advising companies on contracts, investment and disputes. Clear, careful and practical: I explain the risk and the options, not just the law.',
    jobs: [
      [
        'Mishra & Partners Law Firm',
        'Partner',
        'Kathmandu',
        '2019-01',
        '',
        'Lead the corporate and commercial practice of a 20-lawyer firm.',
        [
          'Advised on foreign investments worth USD 120 million',
          'Won 14 of 16 commercial arbitration cases',
          'Built a client list of 40 companies',
        ],
      ],
      [
        'Nepal Legal Associates',
        'Associate',
        'Lalitpur',
        '2013-06',
        '2018-12',
        'Drafted contracts and represented clients in court.',
        ['Drafted 500+ commercial contracts', 'Represented clients in the Supreme Court'],
      ],
    ],
    education: [
      [
        'Kathmandu School of Law',
        'Master of Laws (LLM)',
        'Business Law',
        '2011-08',
        '2013-05',
        'First Division',
      ],
      ['Nepal Law Campus', 'Bachelor of Laws (LLB)', 'Law', '2007-08', '2011-07', 'First Division'],
    ],
    skills:
      'Contract Drafting:E, Corporate Law:E, Arbitration:A, Legal Research:E, Negotiation:A, Due Diligence:A',
    projects: [
      [
        'Hydropower investment framework',
        'Legal adviser',
        'Shareholder and power-purchase agreements for a 60 MW project.',
        ['Project finance'],
        '',
      ],
    ],
    certifications: [['Licensed Advocate', 'Nepal Bar Council', '2012']],
    languages: 'Nepali:Native, Hindi:Fluent, English:Fluent',
  },
  {
    name: 'Nisha Joshi',
    headline: 'Clinical Pharmacist',
    city: 'Dhulikhel, Nepal',
    phone: '+977 986 817 4309',
    look: { skin: 1, hair: 'bun', hairColor: '#2a1c14', shirt: '#0891b2', bg: '#e0f2fe' },
    summary:
      'Clinical pharmacist with five years in hospital pharmacy. I make sure patients get the right medicine at the right dose, and I train staff to use medicines safely.',
    jobs: [
      [
        'Dhulikhel Hospital',
        'Clinical Pharmacist',
        'Dhulikhel',
        '2021-03',
        '',
        'Review prescriptions and advise doctors on medicines on four wards.',
        [
          'Prevented 300+ prescribing errors a year',
          'Cut antibiotic use on the surgical ward by 20%',
          'Wrote the hospital’s first high-risk medicines guide',
        ],
      ],
      [
        'Medicare Pharmacy',
        'Pharmacist',
        'Bhaktapur',
        '2019-06',
        '2021-02',
        'Dispensed medicines and counselled patients in a busy community pharmacy.',
        ['Served 150 patients a day', 'Introduced a stock system that ended expired-drug losses'],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Pharmacy',
        'Pharmacy',
        '2014-09',
        '2019-04',
        '3.8 CGPA',
      ],
    ],
    skills:
      'Clinical Pharmacy:E, Drug Interactions:A, Patient Counselling:E, Pharmacovigilance:A, Inventory Control:A, Antibiotic Stewardship:A',
    projects: [
      [
        'Antibiotic stewardship',
        'Project lead',
        'A review routine for antibiotic prescriptions on surgical wards.',
        ['Clinical audit'],
        '',
      ],
    ],
    certifications: [['Registered Pharmacist', 'Nepal Pharmacy Council', '2019']],
    languages: 'Nepali:Native, Newari:Fluent, English:Fluent',
  },
  {
    name: 'Oliver Bennett',
    headline: 'Architect',
    city: 'Lalitpur, Nepal',
    phone: '+977 980 918 5410',
    website: 'oliverbennett.studio',
    look: { skin: 0, hair: 'beard', hairColor: '#6b4423', shirt: '#57534e', bg: '#e7e5e4' },
    summary:
      'Architect with eight years designing homes, schools and heritage restorations. I combine traditional Newari craft with modern, earthquake-safe building.',
    jobs: [
      [
        'Patan Design Collaborative',
        'Project Architect',
        'Lalitpur',
        '2020-04',
        '',
        'Lead design of residential and heritage projects from brief to handover.',
        [
          'Restored three listed courtyard houses in Patan',
          'Designed 9 earthquake-resistant schools',
          'Won a regional award for sustainable housing',
        ],
      ],
      [
        'UrbanForm Architects',
        'Architect',
        'London, UK',
        '2016-09',
        '2020-03',
        'Designed apartment buildings and public spaces.',
        ['Worked on a 240-home housing scheme', 'Produced planning drawings for 12 projects'],
      ],
    ],
    education: [
      [
        'University of Sheffield',
        'Master of Architecture',
        'Architecture',
        '2014-09',
        '2016-07',
        'Merit',
      ],
    ],
    skills:
      'Revit:E, AutoCAD:A, SketchUp:A, Heritage Restoration:A, Sustainable Design:A, Site Coordination:A',
    projects: [
      [
        'Bungamati school',
        'Lead architect',
        'A 12-classroom school built with local brick and timber.',
        ['Revit', 'Rammed earth'],
        'oliverbennett.studio/bungamati',
      ],
    ],
    certifications: [['RIBA Chartered Architect', 'Royal Institute of British Architects', '2017']],
    languages: 'English:Native, Nepali:Conversational',
  },
  {
    name: 'Pooja Khadka',
    headline: 'Social Media Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 981 119 6521',
    look: { skin: 2, hair: 'wavy', hairColor: '#1a110c', shirt: '#db2777', bg: '#fdf2f8' },
    summary:
      'Social media manager with four years growing brands on Instagram, TikTok and Facebook. Creative with content, careful with data, and quick to spot what an audience wants next.',
    jobs: [
      [
        'Urban Threads Clothing',
        'Social Media Manager',
        'Kathmandu',
        '2022-04',
        '',
        'Plan and run all social channels for a fashion brand.',
        [
          'Grew Instagram from 12,000 to 180,000 followers',
          'Made social the top sales channel, 35% of online revenue',
          'Ran 25 creator partnerships',
        ],
      ],
      [
        'Pixel Media',
        'Content Executive',
        'Lalitpur',
        '2020-07',
        '2022-03',
        'Created content for food, travel and retail clients.',
        ['Produced 600+ posts and reels', 'Lifted average engagement by 3×'],
      ],
    ],
    education: [
      [
        'Kathmandu College of Management',
        'Bachelor of Business Administration',
        'Marketing',
        '2016-08',
        '2020-06',
        '3.4 CGPA',
      ],
    ],
    skills:
      'Content Strategy:E, Instagram & TikTok:E, Copywriting:A, Canva:A, Meta Ads:A, Analytics:A',
    projects: [
      [
        '#WearLocal campaign',
        'Campaign lead',
        'A creator campaign reaching 2 million people in a month.',
        ['Instagram', 'TikTok'],
        '',
      ],
    ],
    certifications: [['Meta Certified Digital Marketing Associate', 'Meta', '2023']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Hari Prasad Neupane',
    headline: 'Senior Bank Officer',
    city: 'Butwal, Nepal',
    phone: '+977 984 220 7632',
    look: { skin: 2, hair: 'short', hairColor: '#3b3b3b', shirt: '#0f172a', bg: '#e0e7ff' },
    summary:
      'Banker with ten years in credit, branch operations and customer service. Sound on risk, strong on compliance, and focused on growing a healthy loan book.',
    jobs: [
      [
        'Lumbini Bank Ltd.',
        'Branch Manager',
        'Butwal',
        '2020-07',
        '',
        'Lead a 22-person branch with NPR 4 billion in deposits.',
        [
          'Grew deposits by 30% in three years',
          'Kept bad loans under 1.5%',
          'Rated top branch in the region in 2023',
        ],
      ],
      [
        'Lumbini Bank Ltd.',
        'Credit Officer',
        'Bhairahawa',
        '2014-03',
        '2020-06',
        'Assessed and managed SME and home loans.',
        ['Approved loans worth NPR 1.2 billion', 'Cut processing time from 10 to 4 days'],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Master of Business Studies',
        'Finance',
        '2011-08',
        '2013-12',
        'First Division',
      ],
    ],
    skills:
      'Credit Analysis:E, Branch Operations:E, Risk & Compliance:A, KYC / AML:A, Customer Service:A, Team Leadership:A',
    projects: [
      [
        'SME lending drive',
        'Lead',
        'A small-business loan scheme for 300 local traders.',
        ['Credit'],
        '',
      ],
    ],
    certifications: [['Certified Credit Professional', 'National Banking Institute', '2019']],
    languages: 'Nepali:Native, Bhojpuri:Fluent, English:Fluent',
  },
  {
    name: 'Lucas Moreau',
    headline: 'Photographer',
    city: 'Bhaktapur, Nepal',
    phone: '+977 985 321 8743',
    website: 'lucasmoreau.photo',
    look: { skin: 1, hair: 'curly', hairColor: '#3a2416', shirt: '#1f2937', bg: '#fde68a' },
    summary:
      'Photographer with eight years shooting travel, editorial and commercial work. I tell stories with light and people, and deliver polished images on tight deadlines.',
    jobs: [
      [
        'Freelance',
        'Photographer',
        'Bhaktapur',
        '2019-01',
        '',
        'Shoot editorial, hotel and NGO assignments across South Asia.',
        [
          'Published in 20+ international magazines',
          'Shot campaigns for 15 hotels and lodges',
          'Ran 30 photo workshops for young photographers',
        ],
      ],
      [
        'Studio Lumière',
        'Assistant Photographer',
        'Lyon, France',
        '2016-03',
        '2018-12',
        'Assisted on fashion and product shoots.',
        ['Managed lighting for 200+ shoots', 'Edited catalogues for 6 brands'],
      ],
    ],
    education: [
      [
        'École de Photographie de Lyon',
        'Diploma',
        'Photography',
        '2013-09',
        '2016-02',
        'Distinction',
      ],
    ],
    skills:
      'Portrait Photography:E, Lightroom:E, Photoshop:A, Studio Lighting:A, Drone Photography:I, Video:I',
    projects: [
      [
        '“Faces of Bhaktapur”',
        'Photographer',
        'A portrait exhibition of craftspeople, shown in Kathmandu and Paris.',
        ['Medium format'],
        'lucasmoreau.photo/faces',
      ],
    ],
    certifications: [['FAA Part 107 Drone Pilot', 'FAA', '2021']],
    languages: 'French:Native, English:Fluent, Nepali:Basic',
  },
  {
    name: 'Anjali Tamang',
    headline: 'Hotel Operations Manager',
    city: 'Nagarkot, Nepal',
    phone: '+977 986 422 9854',
    look: { skin: 1, hair: 'long', hairColor: '#0f0b09', shirt: '#065f46', bg: '#d1fae5' },
    summary:
      'Hospitality manager with nine years in resorts and city hotels. I build teams that make guests feel at home and keep occupancy and reviews high.',
    jobs: [
      [
        'Himalayan Horizon Resort',
        'Operations Manager',
        'Nagarkot',
        '2021-02',
        '',
        'Run rooms, food and beverage and events for a 90-room resort.',
        [
          'Lifted occupancy from 58% to 81%',
          'Raised the review score from 8.1 to 9.3',
          'Cut staff turnover by 40% with a training plan',
        ],
      ],
      [
        'Hotel Yak & Pine',
        'Front Office Manager',
        'Kathmandu',
        '2016-05',
        '2021-01',
        'Led front desk, reservations and guest relations.',
        ['Managed a team of 18', 'Introduced online check-in'],
      ],
    ],
    education: [
      [
        'Nepal Academy of Tourism and Hotel Management',
        'Bachelor of Hotel Management',
        'Hospitality',
        '2011-08',
        '2015-07',
        'First Division',
      ],
    ],
    skills:
      'Hotel Operations:E, Guest Relations:E, Revenue Management:A, Opera PMS:A, Event Planning:A, Team Training:A',
    projects: [
      [
        'Eco-resort certification',
        'Lead',
        'Solar, water recycling and plastic-free rooms; certified in one year.',
        ['Sustainability'],
        '',
      ],
    ],
    certifications: [['Certified Hotel Administrator', 'AHLEI', '2022']],
    languages: 'Nepali:Native, Tamang:Native, English:Fluent, Hindi:Good',
  },
  {
    name: 'Samir Koirala',
    headline: 'Mobile App Developer',
    city: 'Kathmandu, Nepal',
    phone: '+977 980 523 1965',
    github: true,
    look: { skin: 2, hair: 'curly', hairColor: '#1a120d', shirt: '#4338ca', bg: '#e0e7ff' },
    summary:
      'Mobile developer with four years building Android and iOS apps in Flutter and Kotlin. I ship fast, smooth apps and care about offline use and battery life.',
    jobs: [
      [
        'Pathao Nepal',
        'Mobile Developer',
        'Kathmandu',
        '2022-03',
        '',
        'Build the rider and food-delivery apps used by 1 million people.',
        [
          'Cut app start time by 50%',
          'Built offline order tracking for weak networks',
          'Raised the Play Store rating from 3.9 to 4.5',
        ],
      ],
      [
        'Appsmith Nepal',
        'Junior Android Developer',
        'Lalitpur',
        '2020-05',
        '2022-02',
        'Built Android apps for retail and school clients.',
        ['Released 8 apps', 'Wrote the team’s first unit tests'],
      ],
    ],
    education: [
      [
        'Pulchowk Campus, IOE',
        'Bachelor of Computer Engineering',
        'Computer Engineering',
        '2015-11',
        '2020-03',
        '78%',
      ],
    ],
    skills: 'Flutter:E, Dart:E, Kotlin:A, Firebase:A, REST APIs:A, Swift:I',
    projects: [
      [
        'Bus Saathi',
        'Developer',
        'A live bus-tracking app for Kathmandu with 50,000 downloads.',
        ['Flutter', 'Firebase', 'Google Maps'],
        'github.com/samir-koirala/bus-saathi',
      ],
    ],
    certifications: [['Associate Android Developer', 'Google', '2021']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Deepak Thakur',
    headline: 'Network Engineer',
    city: 'Janakpur, Nepal',
    phone: '+977 981 624 3076',
    look: { skin: 3, hair: 'short', hairColor: '#0f0f0f', shirt: '#0369a1', bg: '#e0f2fe' },
    summary:
      'Network engineer with six years designing and running enterprise and ISP networks. Strong on routing, security and keeping downtime close to zero.',
    jobs: [
      [
        'WorldLink Communications',
        'Network Engineer',
        'Kathmandu',
        '2021-01',
        '',
        'Run the core and regional network for an ISP with 700,000 users.',
        [
          'Kept core network uptime at 99.98%',
          'Rolled out IPv6 to 300,000 customers',
          'Automated configuration backups for 1,200 devices',
        ],
      ],
      [
        'Janakpur IT Hub',
        'Network Administrator',
        'Janakpur',
        '2018-04',
        '2020-12',
        'Managed office and campus networks for local clients.',
        ['Installed networks for 15 schools', 'Cut support tickets by 30%'],
      ],
    ],
    education: [
      [
        'Kathford International College',
        'Bachelor of Engineering',
        'Electronics and Communication',
        '2013-11',
        '2018-02',
        '72%',
      ],
    ],
    skills:
      'Cisco Routing:E, BGP / OSPF:A, Firewalls:A, Linux:A, Network Monitoring:A, Python Scripting:I',
    projects: [
      [
        'Regional fibre ring',
        'Network lead',
        'A redundant fibre ring for six eastern cities.',
        ['BGP', 'MPLS'],
        '',
      ],
    ],
    certifications: [['Cisco Certified Network Professional (CCNP)', 'Cisco', '2022']],
    languages: 'Maithili:Native, Nepali:Fluent, Hindi:Fluent, English:Fluent',
  },
  {
    name: 'Isabel Fernandes',
    headline: 'Financial Analyst',
    city: 'Kathmandu, Nepal',
    phone: '+977 984 725 4187',
    look: { skin: 2, hair: 'bun', hairColor: '#3a2517', shirt: '#1e40af', bg: '#dbeafe' },
    summary:
      'Financial analyst with five years in budgeting, forecasting and investment analysis. I build clear models and turn them into decisions leaders can act on.',
    jobs: [
      [
        'Nabil Investment Banking',
        'Financial Analyst',
        'Kathmandu',
        '2021-08',
        '',
        'Build valuation models for listings, mergers and advisory clients.',
        [
          'Modelled 9 public listings worth NPR 15 billion',
          'Built a forecasting tool now used across the bank',
          'Presented to investment committees every quarter',
        ],
      ],
      [
        'Deloitte',
        'Business Analyst',
        'Lisbon, Portugal',
        '2019-09',
        '2021-07',
        'Supported cost-reduction and budgeting projects.',
        ['Found EUR 1.2 million of savings for one client', 'Built 20+ budget dashboards'],
      ],
    ],
    education: [
      [
        'Nova School of Business and Economics',
        'Master in Finance',
        'Finance',
        '2017-09',
        '2019-06',
        '17/20',
      ],
    ],
    skills:
      'Financial Modelling:E, Valuation:A, Excel & VBA:E, Forecasting:A, Power BI:A, Accounting:A',
    projects: [
      [
        'Hydropower IPO valuation',
        'Lead analyst',
        'A discounted-cash-flow valuation used to price a 40 MW listing.',
        ['Excel', 'DCF'],
        '',
      ],
    ],
    certifications: [['CFA Level II Candidate', 'CFA Institute', '2024']],
    languages: 'Portuguese:Native, English:Fluent, Spanish:Good',
  },
  {
    name: 'Ramesh Bista',
    headline: 'Content Writer',
    city: 'Dhangadhi, Nepal',
    phone: '+977 985 826 5298',
    website: 'rameshbista.blog',
    look: { skin: 2, hair: 'short', hairColor: '#2a1a10', shirt: '#a16207', bg: '#fef9c3' },
    summary:
      'Content writer with five years writing blogs, websites and guides for tech and travel brands. Clear, well-researched writing that ranks in search and reads like a person wrote it.',
    jobs: [
      [
        'Upwork & direct clients',
        'Freelance Content Writer',
        'Remote',
        '2021-01',
        '',
        'Write blogs, landing pages and guides for clients in six countries.',
        [
          'Wrote 400+ articles for 30 clients',
          'Took a client blog from 2,000 to 60,000 monthly visits',
          'Kept a 5-star rating on 90 contracts',
        ],
      ],
      [
        'Tripnepal.com',
        'Content Writer',
        'Kathmandu',
        '2019-02',
        '2020-12',
        'Wrote destination guides and trek itineraries.',
        ['Published 150 guides', 'Ranked first on Google for 40 trek keywords'],
      ],
    ],
    education: [
      [
        'Far Western University',
        'Bachelor of Arts',
        'English Literature',
        '2015-08',
        '2018-12',
        'First Division',
      ],
    ],
    skills: 'SEO Writing:E, Copywriting:A, Editing:A, WordPress:A, Research:E, Google Analytics:I',
    projects: [
      [
        'Trekking in the Far West',
        'Author',
        'A free online guide to 12 lesser-known treks.',
        ['WordPress'],
        'rameshbista.blog/far-west',
      ],
    ],
    certifications: [['Content Marketing Certification', 'HubSpot Academy', '2022']],
    languages: 'Nepali:Native, Doteli:Native, English:Fluent',
  },
  {
    name: 'Sunita Basnet',
    headline: 'Physiotherapist',
    city: 'Kathmandu, Nepal',
    phone: '+977 986 927 6309',
    look: { skin: 2, hair: 'long', hairColor: '#1c120c', shirt: '#16a34a', bg: '#dcfce7' },
    summary:
      'Physiotherapist with six years treating sports injuries, back pain and stroke recovery. I set clear goals with each patient and help them get back to the things they love.',
    jobs: [
      [
        'Grande International Hospital',
        'Senior Physiotherapist',
        'Kathmandu',
        '2021-04',
        '',
        'Treat outpatients and inpatients in a 12-person rehabilitation unit.',
        [
          'See 25 patients a day with 90% goal achievement',
          'Set up a stroke rehabilitation pathway',
          'Physio for the national women’s football team',
        ],
      ],
      [
        'Spine & Sports Clinic',
        'Physiotherapist',
        'Lalitpur',
        '2018-06',
        '2021-03',
        'Treated sports and back injuries.',
        ['Ran weekly injury-prevention classes', 'Introduced digital exercise plans'],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Physiotherapy',
        'Physiotherapy',
        '2013-09',
        '2018-05',
        '3.6 CGPA',
      ],
    ],
    skills:
      'Sports Rehabilitation:E, Manual Therapy:A, Exercise Prescription:E, Stroke Rehab:A, Dry Needling:A, Patient Education:A',
    projects: [
      [
        'Desk-worker back care',
        'Founder',
        'Free workplace sessions reaching 1,500 office staff.',
        ['Health promotion'],
        '',
      ],
    ],
    certifications: [['Certified Dry Needling Practitioner', 'Physio Nepal', '2022']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Prakash Yadav',
    headline: 'Supply Chain Coordinator',
    city: 'Birgunj, Nepal',
    phone: '+977 980 128 7410',
    look: { skin: 3, hair: 'beard', hairColor: '#120d0a', shirt: '#c2410c', bg: '#ffedd5' },
    summary:
      'Supply chain coordinator with six years in import, warehousing and distribution. I keep stock flowing, costs down and paperwork right at the border.',
    jobs: [
      [
        'Birgunj Trading House',
        'Supply Chain Coordinator',
        'Birgunj',
        '2021-02',
        '',
        'Run imports, customs and a 20,000 m² warehouse for an FMCG distributor.',
        [
          'Cut customs clearance time from 6 to 2 days',
          'Brought stock accuracy to 99.4%',
          'Saved NPR 8 million a year on freight',
        ],
      ],
      [
        'Nepal Logistics Pvt. Ltd.',
        'Logistics Officer',
        'Kathmandu',
        '2018-01',
        '2021-01',
        'Planned truck routes and deliveries across Nepal.',
        ['Planned 1,000 deliveries a month', 'Reduced empty return trips by 25%'],
      ],
    ],
    education: [
      [
        'Tribhuvan University',
        'Bachelor of Business Administration',
        'Operations',
        '2013-08',
        '2017-07',
        'First Division',
      ],
    ],
    skills:
      'Inventory Control:E, Customs & Import:E, Warehouse Management:A, SAP MM:A, Route Planning:A, Excel:A',
    projects: [
      [
        'Barcode warehouse',
        'Project lead',
        'Barcoded every pallet and shelf, ending lost stock.',
        ['Barcode scanning', 'SAP'],
        '',
      ],
    ],
    certifications: [['Certified Supply Chain Professional', 'APICS', '2023']],
    languages: 'Bhojpuri:Native, Nepali:Fluent, Hindi:Fluent, English:Good',
  },
  {
    name: 'Emily Watson',
    headline: 'Customer Support Team Lead',
    city: 'Lalitpur, Nepal',
    phone: '+977 981 229 8521',
    look: { skin: 0, hair: 'long', hairColor: '#d4a056', shirt: '#7c3aed', bg: '#f3e8ff' },
    summary:
      'Support lead with six years in customer service for software companies. I build happy, skilled teams and processes that solve problems the first time.',
    jobs: [
      [
        'Leapfrog Technology',
        'Customer Support Team Lead',
        'Lalitpur',
        '2021-06',
        '',
        'Lead a 15-person team supporting customers in the US and UK.',
        [
          'Raised customer satisfaction from 86% to 96%',
          'Cut first-reply time from 6 hours to 40 minutes',
          'Wrote a help centre that deflects 30% of tickets',
        ],
      ],
      [
        'Zendesk partner agency',
        'Support Specialist',
        'Manchester, UK',
        '2018-01',
        '2021-05',
        'Answered technical questions by chat, email and phone.',
        ['Handled 60 tickets a day', 'Trained 12 new specialists'],
      ],
    ],
    education: [
      ['University of Manchester', 'Bachelor of Arts', 'Psychology', '2014-09', '2017-06', '2:1'],
    ],
    skills:
      'Customer Service:E, Team Leadership:A, Zendesk:E, Coaching:A, Knowledge Base Writing:A, SQL:B',
    projects: [
      [
        'Support playbook',
        'Author',
        'Standard replies and escalation rules for 80 common issues.',
        ['Zendesk'],
        '',
      ],
    ],
    certifications: [['Customer Service Management', 'Institute of Customer Service', '2020']],
    languages: 'English:Native, Nepali:Basic',
  },
  {
    name: 'Bishnu Dahal',
    headline: 'Electrical Engineer',
    city: 'Butwal, Nepal',
    phone: '+977 984 330 9632',
    look: { skin: 2, hair: 'short', hairColor: '#1b1410', shirt: '#ca8a04', bg: '#fef9c3' },
    summary:
      'Electrical engineer with seven years in hydropower and transmission projects. Strong on design, testing and commissioning, and careful about safety on live sites.',
    jobs: [
      [
        'Kali Gandaki Hydro Ltd.',
        'Electrical Engineer',
        'Syangja',
        '2020-01',
        '',
        'Maintain generators, switchyards and protection for a 144 MW plant.',
        [
          'Cut unplanned outages by 35%',
          'Replaced protection relays with no lost generation',
          'Trained 10 plant technicians',
        ],
      ],
      [
        'Nepal Electricity Authority',
        'Assistant Engineer',
        'Butwal',
        '2017-03',
        '2019-12',
        'Designed and supervised distribution lines and substations.',
        ['Electrified 40 villages', 'Commissioned two 33 kV substations'],
      ],
    ],
    education: [
      [
        'Pulchowk Campus, IOE',
        'Bachelor of Electrical Engineering',
        'Electrical Engineering',
        '2012-11',
        '2016-10',
        '75%',
      ],
    ],
    skills:
      'Power Systems:E, ETAP:A, Protection Relays:A, AutoCAD Electrical:A, Commissioning:A, PLC / SCADA:I',
    projects: [
      [
        'Rural solar mini-grid',
        'Design engineer',
        'A 50 kW solar mini-grid for 300 homes.',
        ['ETAP', 'Solar PV'],
        '',
      ],
    ],
    certifications: [['Nepal Engineering Council Registration', 'NEC', '2016']],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Dr. Meera Pandey',
    headline: 'Research Scientist, Microbiology',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 431 1743',
    look: { skin: 1, hair: 'bun', hairColor: '#2b1b12', shirt: '#0d9488', bg: '#ccfbf1' },
    summary:
      'Microbiologist with eight years of research on antibiotic resistance and water-borne disease. Published, grant-funded and experienced in running a lab and mentoring students.',
    jobs: [
      [
        'Nepal Health Research Council',
        'Research Scientist',
        'Kathmandu',
        '2020-09',
        '',
        'Lead studies on antibiotic resistance in hospitals and rivers.',
        [
          'Won USD 450,000 in research grants',
          'Published 14 papers in peer-reviewed journals',
          'Supervised 9 master’s students',
        ],
      ],
      [
        'Tribhuvan University',
        'Research Assistant',
        'Kirtipur',
        '2016-01',
        '2020-08',
        'Ran laboratory work for water-quality projects.',
        ['Tested 3,000 water samples', 'Set up the lab’s DNA sequencing workflow'],
      ],
    ],
    education: [
      ['University of Tokyo', 'PhD', 'Microbiology', '2016-04', '2020-03', ''],
      [
        'Tribhuvan University',
        'Master of Science',
        'Microbiology',
        '2012-08',
        '2014-12',
        'First Division',
      ],
    ],
    skills:
      'Microbiology:E, PCR & Sequencing:A, R Statistics:A, Grant Writing:A, Lab Management:A, Scientific Writing:E',
    projects: [
      [
        'Bagmati resistance map',
        'Principal investigator',
        'Mapped antibiotic-resistant bacteria along the Bagmati river.',
        ['Sequencing', 'R'],
        '',
      ],
    ],
    certifications: [['Good Clinical Practice', 'NIDA', '2023']],
    languages: 'Nepali:Native, English:Fluent, Japanese:Good',
  },
  {
    name: 'Ethan Brooks',
    headline: 'Product Manager',
    city: 'Kathmandu, Nepal',
    phone: '+977 986 532 2854',
    look: { skin: 4, hair: 'short', hairColor: '#0b0b0b', shirt: '#2563eb', bg: '#dbeafe' },
    summary:
      'Product manager with six years building SaaS and fintech products. I talk to users, set clear priorities and help teams ship things that matter.',
    jobs: [
      [
        'Fusemachines',
        'Senior Product Manager',
        'Kathmandu',
        '2022-01',
        '',
        'Lead an AI education product used in 40 schools.',
        [
          'Grew weekly active users from 8,000 to 55,000',
          'Cut churn by 30% with a new onboarding flow',
          'Ran a roadmap for three engineering squads',
        ],
      ],
      [
        'Payflow Inc.',
        'Product Manager',
        'Austin, USA',
        '2018-06',
        '2021-12',
        'Owned invoicing and payments features.',
        ['Launched invoicing used by 12,000 businesses', 'Lifted conversion to paid by 22%'],
      ],
    ],
    education: [
      [
        'University of Texas at Austin',
        'Bachelor of Science',
        'Information Systems',
        '2013-09',
        '2017-05',
        '3.7 GPA',
      ],
    ],
    skills: 'Product Strategy:E, User Research:A, Roadmapping:E, Data Analysis:A, Agile:A, Jira:A',
    projects: [
      [
        'Smart homework',
        'Product lead',
        'Personalised practice that raised test scores by 12%.',
        ['A/B testing'],
        '',
      ],
    ],
    certifications: [['Certified Scrum Product Owner', 'Scrum Alliance', '2019']],
    languages: 'English:Native, Spanish:Good',
  },
  {
    name: 'Ritu Malla',
    headline: 'Interior Designer',
    city: 'Lalitpur, Nepal',
    phone: '+977 980 633 3965',
    website: 'ritumalla.studio',
    look: { skin: 1, hair: 'wavy', hairColor: '#2b170e', shirt: '#a16207', bg: '#fef3c7' },
    summary:
      'Interior designer with six years creating homes, cafés and offices. Warm, practical spaces that use local materials and suit how people actually live.',
    jobs: [
      [
        'Ritu Malla Studio',
        'Founder & Interior Designer',
        'Lalitpur',
        '2021-03',
        '',
        'Design homes and hospitality spaces from concept to handover.',
        [
          'Completed 35 projects, 70% from referrals',
          'Designed 6 cafés featured in local magazines',
          'Kept every project within its budget',
        ],
      ],
      [
        'Space Craft Interiors',
        'Junior Designer',
        'Kathmandu',
        '2018-05',
        '2021-02',
        'Drew plans, 3D views and material boards.',
        ['Produced 3D views for 50 projects', 'Managed site work for 10 apartments'],
      ],
    ],
    education: [
      [
        'Nepal Institute of Interior Design',
        'Bachelor of Interior Design',
        'Interior Design',
        '2014-08',
        '2018-04',
        'First Division',
      ],
    ],
    skills:
      'SketchUp:E, AutoCAD:A, 3ds Max & V-Ray:A, Space Planning:E, Material Selection:A, Client Presentations:A',
    projects: [
      [
        'Mitho Café',
        'Lead designer',
        'A 60-seat café in reclaimed timber and handmade tiles.',
        ['SketchUp', 'V-Ray'],
        'ritumalla.studio/mitho',
      ],
    ],
    certifications: [['NCIDQ Fundamentals', 'CIDQ', '2022']],
    languages: 'Nepali:Native, Newari:Native, English:Fluent',
  },
  {
    name: 'Karina Villanueva',
    headline: 'Flight Attendant',
    city: 'Kathmandu, Nepal',
    phone: '+977 981 734 4076',
    look: { skin: 2, hair: 'bun', hairColor: '#120c08', shirt: '#1e3a8a', bg: '#dbeafe' },
    summary:
      'Flight attendant with seven years on regional and long-haul flights. Safety-first, calm in emergencies, and known for warm, attentive service in four languages.',
    jobs: [
      [
        'Himalaya Airlines',
        'Senior Cabin Crew',
        'Kathmandu',
        '2021-01',
        '',
        'Lead the cabin on A320 flights across Asia and the Gulf.',
        [
          'Lead a crew of 5 on 70 flights a year',
          'Scored 98% in yearly safety checks',
          'Trained 25 new crew in service standards',
        ],
      ],
      [
        'Philippine Airlines',
        'Cabin Crew',
        'Manila, Philippines',
        '2017-04',
        '2020-12',
        'Served passengers on regional and long-haul routes.',
        ['Flew 2,400 hours', 'Received 40 passenger commendations'],
      ],
    ],
    education: [
      [
        'University of Santo Tomas',
        'Bachelor of Science',
        'Tourism Management',
        '2012-06',
        '2016-04',
        'Cum laude',
      ],
    ],
    skills:
      'Passenger Safety:E, First Aid:A, Customer Service:E, Conflict Handling:A, Teamwork:E, Announcements:A',
    projects: [
      [
        'Cabin service refresh',
        'Team member',
        'A new meal and service routine that raised scores by 15%.',
        ['Service design'],
        '',
      ],
    ],
    certifications: [
      ['Cabin Crew Licence (A320)', 'CAAN', '2021'],
      ['First Aid at Work', 'Red Cross', '2024'],
    ],
    languages: 'Filipino:Native, English:Fluent, Nepali:Good, Hindi:Basic',
  },
  {
    name: 'Tenzing Sherpa',
    headline: 'Trekking Guide & Travel Consultant',
    city: 'Solukhumbu, Nepal',
    phone: '+977 984 835 5187',
    look: { skin: 2, hair: 'short', hairColor: '#0d0d0d', shirt: '#dc2626', bg: '#fee2e2' },
    summary:
      'Licensed trekking guide with twelve years leading groups in the Everest and Annapurna regions. Safety-first, rich in local knowledge, and great company on the trail.',
    jobs: [
      [
        'Khumbu Adventures',
        'Lead Guide & Travel Consultant',
        'Lukla',
        '2018-03',
        '',
        'Plan and lead treks and climbs for international groups.',
        [
          'Led 120 treks with a 100% safety record',
          'Planned trips for 2,000 guests from 25 countries',
          'Rated 5 stars in 400+ online reviews',
        ],
      ],
      [
        'Everest Base Camp Treks',
        'Trekking Guide',
        'Kathmandu',
        '2012-04',
        '2018-02',
        'Guided groups on classic Himalayan routes.',
        ['Guided 300+ trekkers a year', 'Trained 15 porters as assistant guides'],
      ],
    ],
    education: [
      [
        'Nepal Mountaineering Association',
        'Mountain Guide Course',
        'Mountaineering',
        '2011-09',
        '2012-03',
        'Certified',
      ],
    ],
    skills:
      'Trek Planning:E, Wilderness First Aid:A, Route Finding:E, Group Leadership:E, Customer Service:A, Photography:I',
    projects: [
      [
        'Clean Khumbu trail',
        'Organiser',
        'Volunteer clean-ups that removed 3 tonnes of waste.',
        ['Community work'],
        '',
      ],
    ],
    certifications: [
      ['Wilderness First Responder', 'NOLS', '2022'],
      ['Licensed Trekking Guide', 'Nepal Tourism Board', '2012'],
    ],
    languages: 'Sherpa:Native, Nepali:Native, English:Fluent, German:Basic',
  },
  {
    name: 'Alisha Khatri',
    headline: 'Cybersecurity Analyst',
    city: 'Kathmandu, Nepal',
    phone: '+977 985 936 6298',
    github: true,
    look: { skin: 2, hair: 'long', hairColor: '#0e0a08', shirt: '#111827', bg: '#d1d5db' },
    summary:
      'Security analyst with five years protecting banks and software companies. I find weaknesses before attackers do, and respond quickly and calmly when something goes wrong.',
    jobs: [
      [
        'Vairav Technology',
        'Cybersecurity Analyst',
        'Kathmandu',
        '2021-07',
        '',
        'Monitor, test and harden systems for 20 banking and fintech clients.',
        [
          'Found 60+ critical vulnerabilities before release',
          'Cut incident response time from 4 hours to 45 minutes',
          'Ran phishing training for 3,000 bank staff',
        ],
      ],
      [
        'Cyber Nepal',
        'SOC Analyst',
        'Lalitpur',
        '2019-05',
        '2021-06',
        'Watched alerts and investigated incidents in a security operations centre.',
        ['Handled 200 alerts a day', 'Wrote 30 detection rules'],
      ],
    ],
    education: [
      [
        'Herald College Kathmandu',
        'BSc (Hons) Computer Science',
        'Cyber Security',
        '2015-09',
        '2019-04',
        'First Class',
      ],
    ],
    skills:
      'Penetration Testing:A, SIEM (Splunk):A, Incident Response:E, Linux:A, Network Security:A, Python:I',
    projects: [
      [
        'Bank red-team exercise',
        'Lead tester',
        'A full attack simulation that closed 12 serious gaps.',
        ['Burp Suite', 'Metasploit'],
        '',
      ],
    ],
    certifications: [
      ['Certified Ethical Hacker (CEH)', 'EC-Council', '2022'],
      ['CompTIA Security+', 'CompTIA', '2020'],
    ],
    languages: 'Nepali:Native, English:Fluent',
  },
  {
    name: 'Manoj Pokharel',
    headline: 'Business Development Manager',
    city: 'Pokhara, Nepal',
    phone: '+977 986 137 7309',
    look: { skin: 2, hair: 'beard', hairColor: '#1b130f', shirt: '#0f766e', bg: '#ccfbf1' },
    summary:
      'Business development manager with eight years opening new markets for tourism and agri-business companies. Builds partnerships, closes big deals and plans for steady growth.',
    jobs: [
      [
        'Annapurna Agro Exports',
        'Business Development Manager',
        'Pokhara',
        '2020-02',
        '',
        'Find buyers and partners for coffee, tea and spices abroad.',
        [
          'Opened markets in Japan, Germany and the UAE',
          'Grew export revenue from NPR 90 million to 310 million',
          'Signed 18 long-term buyer contracts',
        ],
      ],
      [
        'Pokhara Tours & Travels',
        'Partnership Manager',
        'Pokhara',
        '2016-01',
        '2020-01',
        'Built partnerships with overseas travel agents.',
        ['Signed 45 agent partners', 'Doubled group bookings in three years'],
      ],
    ],
    education: [
      [
        'Pokhara University',
        'Master of Business Administration',
        'International Business',
        '2013-08',
        '2015-08',
        '3.6 CGPA',
      ],
    ],
    skills:
      'Partnerships:E, Export Sales:E, Negotiation:A, Market Entry:A, Trade Fairs:A, Financial Planning:I',
    projects: [
      [
        'Nepali coffee in Tokyo',
        'Lead',
        'Placed single-origin Nepali coffee in 40 Tokyo cafés.',
        ['Export'],
        '',
      ],
    ],
    certifications: [['International Trade Certificate', 'ITC Geneva', '2021']],
    languages: 'Nepali:Native, English:Fluent, Japanese:Basic',
  },
  {
    name: 'Dr. Samjhana Bhandari',
    headline: 'Medical Officer',
    city: 'Nepalgunj, Nepal',
    phone: '+977 980 238 8410',
    look: { skin: 2, hair: 'bun', hairColor: '#1d130e', shirt: '#f8fafc', bg: '#e0f2fe' },
    summary:
      'Medical officer with six years in emergency and general medicine in public hospitals. Quick, thorough and caring, with a strong interest in maternal and child health.',
    jobs: [
      [
        'Bheri Hospital',
        'Medical Officer',
        'Nepalgunj',
        '2021-01',
        '',
        'Treat patients in emergency, medical and maternity wards.',
        [
          'Treat 40–60 patients a shift',
          'Helped cut maternal deaths in the district by 25%',
          'Teach intern doctors on ward rounds',
        ],
      ],
      [
        'Health Post Program',
        'Medical Officer',
        'Dailekh',
        '2018-09',
        '2020-12',
        'Ran primary care and outreach in remote villages.',
        ['Led 30 mobile health camps', 'Started a child nutrition clinic'],
      ],
    ],
    education: [
      [
        'Institute of Medicine, Maharajgunj',
        'MBBS',
        'Medicine',
        '2012-11',
        '2018-07',
        'Pass with distinction',
      ],
    ],
    skills:
      'Emergency Medicine:A, General Medicine:E, Obstetrics:A, Paediatrics:A, Ultrasound:I, Patient Communication:E',
    projects: [
      [
        'Safe motherhood outreach',
        'Coordinator',
        'Antenatal visits for 2,000 mothers in remote villages.',
        ['Public health'],
        '',
      ],
    ],
    certifications: [
      ['Nepal Medical Council Registration', 'NMC', '2018'],
      ['Advanced Trauma Life Support', 'ATLS Nepal', '2022'],
    ],
    languages: 'Nepali:Native, Awadhi:Fluent, English:Fluent',
  },
  {
    name: 'Zara Ahmed',
    headline: 'Fashion Designer',
    city: 'Kathmandu, Nepal',
    phone: '+977 981 339 9521',
    website: 'zaraahmed.co',
    look: { skin: 3, hair: 'wavy', hairColor: '#120b07', shirt: '#9d174d', bg: '#fce7f3' },
    summary:
      'Fashion designer with six years creating womenswear from Nepali handloom fabrics. I sketch, drape and produce small collections that sell at home and abroad.',
    jobs: [
      [
        'Zara Ahmed Label',
        'Founder & Designer',
        'Kathmandu',
        '2021-04',
        '',
        'Design and produce two womenswear collections a year.',
        [
          'Sold in 12 stores in Nepal, India and the UK',
          'Showed at Kathmandu Fashion Week three times',
          'Work with 25 handloom weavers',
        ],
      ],
      [
        'Dhaka Weaves',
        'Assistant Designer',
        'Lalitpur',
        '2018-06',
        '2021-03',
        'Developed prints and patterns for a textile house.',
        ['Designed 80 prints', 'Managed sampling with 5 workshops'],
      ],
    ],
    education: [
      [
        'Pearl Academy',
        'Bachelor of Design',
        'Fashion Design',
        '2014-07',
        '2018-05',
        'First Class',
      ],
    ],
    skills:
      'Fashion Illustration:E, Pattern Making:A, Draping:A, Textile Sourcing:A, Adobe Illustrator:A, Production Planning:A',
    projects: [
      [
        '“Dhaka Reimagined” collection',
        'Designer',
        'A 24-piece collection modernising Dhaka cloth.',
        ['Handloom', 'Natural dye'],
        'zaraahmed.co/dhaka',
      ],
    ],
    certifications: [['Sustainable Fashion', 'London College of Fashion (online)', '2022']],
    languages: 'English:Fluent, Hindi:Fluent, Urdu:Native, Nepali:Fluent',
  },
  {
    name: 'Kushal Maharjan',
    headline: 'DevOps Engineer',
    city: 'Bhaktapur, Nepal',
    phone: '+977 984 430 1632',
    github: true,
    look: { skin: 2, hair: 'curly', hairColor: '#120d09', shirt: '#0f172a', bg: '#e2e8f0' },
    summary:
      'DevOps engineer with five years automating builds, deployments and cloud infrastructure. I make releases boring, systems observable and cloud bills smaller.',
    jobs: [
      [
        'F1Soft International',
        'DevOps Engineer',
        'Lalitpur',
        '2021-09',
        '',
        'Run CI/CD and Kubernetes clusters for mobile-banking products.',
        [
          'Cut deployment time from 2 hours to 8 minutes',
          'Reached 99.95% uptime for 40 bank apps',
          'Saved 30% on cloud costs with autoscaling',
        ],
      ],
      [
        'Deerwalk Inc.',
        'System Administrator',
        'Kathmandu',
        '2019-07',
        '2021-08',
        'Managed Linux servers and backups.',
        ['Automated 200 servers with Ansible', 'Brought restore time from days to hours'],
      ],
    ],
    education: [
      [
        'Kathmandu University',
        'Bachelor of Engineering',
        'Computer Engineering',
        '2015-08',
        '2019-06',
        '3.5 CGPA',
      ],
    ],
    skills:
      'Kubernetes:A, Docker:E, AWS:A, Terraform:A, CI/CD (GitHub Actions):E, Linux:E, Prometheus:I',
    projects: [
      [
        'Zero-downtime deploys',
        'Lead',
        'Blue-green releases for a banking app with 2 million users.',
        ['Kubernetes', 'Argo CD'],
        'github.com/kushal-maharjan/blue-green',
      ],
    ],
    certifications: [
      ['Certified Kubernetes Administrator', 'CNCF', '2023'],
      ['AWS Solutions Architect – Associate', 'Amazon Web Services', '2022'],
    ],
    languages: 'Newari:Native, Nepali:Native, English:Fluent',
  },
];

/** Every person as a full CV body, in the same order as PEOPLE. */
export const SAMPLE_PEOPLE = PEOPLE.map(toCV);
