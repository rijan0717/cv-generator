/**
 * The invented CV the template gallery renders every thumbnail with.
 *
 * A gallery that drew each template with the user's own CV would show a
 * half-filled CV eleven times over, and every template would look empty.
 * This one has something in every section, at the length a real CV has,
 * so the templates can be compared on how they lay content out — which is
 * the only thing that differs between them.
 *
 * The person is made up. The photo is a drawing built here as an inline
 * SVG rather than a stock picture, so there is nothing to license and
 * nothing to download before the gallery can render.
 */

/** A simple head-and-shoulders silhouette on a soft background. */
const SAMPLE_PHOTO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#dbe4ee"/>
  <circle cx="60" cy="47" r="22" fill="#8a9bb0"/>
  <path d="M18 120c3-26 21-40 42-40s39 14 42 40z" fill="#8a9bb0"/>
</svg>`;

export const SAMPLE_PHOTO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_PHOTO_SVG.trim())}`;

/** Section keys in the default order, all visible. */
const ALL_SECTIONS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
];

export const SAMPLE_CV = {
  _id: 'sample',
  title: 'Sample CV',
  templateKey: 'classic',
  settings: {
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    headingFont: '',
    fontSize: 'medium',
    themePreset: 'slate',
    spacing: 'normal',
    sectionOrder: ALL_SECTIONS,
    hiddenSections: [],
  },
  personal: {
    fullName: 'Anisha Thapa',
    headline: 'Full-Stack Developer',
    email: 'anisha.thapa@example.com',
    phone: '+977 980 000 0000',
    address: 'Lalitpur, Nepal',
    website: 'anishathapa.dev',
    linkedin: 'linkedin.com/in/anisha-thapa',
    github: 'github.com/anisha-thapa',
    photoUrl: SAMPLE_PHOTO_URL,
  },
  summary:
    'Full-stack developer with three years of experience building web applications in React and Node.js. Comfortable from database design to deployment, and most interested in making complex workflows simple for the people who use them.',
  experience: [
    {
      _id: 'x1',
      company: 'Himal Digital',
      position: 'Software Engineer',
      location: 'Kathmandu',
      startDate: '2023-04',
      endDate: '',
      isCurrent: true,
      description:
        'Lead developer on a booking platform used by 40 partner hotels across the Kathmandu valley.',
      achievements: [
        'Cut page load time by 45% by moving image processing to a background queue',
        'Designed the REST API and MongoDB schema for the reservations module',
        'Mentored two junior developers through their first production releases',
      ],
    },
    {
      _id: 'x2',
      company: 'Everest Softworks',
      position: 'Junior Web Developer',
      location: 'Lalitpur',
      startDate: '2021-08',
      endDate: '2023-03',
      isCurrent: false,
      description: 'Built and maintained client websites and internal dashboards.',
      achievements: [
        'Delivered 12 client projects on schedule',
        'Introduced automated tests, reducing reported bugs by 30%',
      ],
    },
  ],
  education: [
    {
      _id: 'e1',
      institution: 'Tribhuvan University',
      degree: 'Bachelor of Computer Application',
      fieldOfStudy: 'Computer Application',
      startDate: '2017-09',
      endDate: '2021-06',
      grade: '3.7 CGPA',
      description: '',
    },
  ],
  skills: [
    { _id: 's1', name: 'JavaScript', level: 'Expert' },
    { _id: 's2', name: 'React', level: 'Advanced' },
    { _id: 's3', name: 'Node.js', level: 'Advanced' },
    { _id: 's4', name: 'MongoDB', level: 'Advanced' },
    { _id: 's5', name: 'SQL', level: 'Intermediate' },
    { _id: 's6', name: 'Git', level: 'Advanced' },
    { _id: 's7', name: 'Tailwind CSS', level: 'Intermediate' },
  ],
  projects: [
    {
      _id: 'p1',
      name: 'Smart CV Generator',
      role: 'Developer',
      description: 'A CV builder with live templates, PDF export and job matching.',
      technologies: ['React', 'Express', 'MongoDB'],
      link: 'github.com/anisha-thapa/cv-generator',
    },
  ],
  certifications: [
    {
      _id: 'c1',
      name: 'Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2024',
      credentialLink: '',
    },
  ],
  languages: [
    { _id: 'l1', language: 'Nepali', proficiency: 'Native' },
    { _id: 'l2', language: 'English', proficiency: 'Fluent' },
    { _id: 'l3', language: 'Hindi', proficiency: 'Conversational' },
  ],
  references: [],
  referencesOnRequest: true,
};

/**
 * The sample CV in a given template, carrying the styling of the CV it is
 * being shown beside.
 *
 * In the editor the gallery should answer "what would *my* CV look like in
 * this?", so the user's colours and fonts are carried over; on the
 * standalone gallery page there is no CV yet and the sample's own neutral
 * settings are used.
 *
 * @param {string} templateKey - The template to render.
 * @param {object} [settings] - Styling to apply instead of the sample's.
 * @returns {object} A CV object any template can render.
 */
export function sampleFor(templateKey, settings) {
  return {
    ...SAMPLE_CV,
    templateKey,
    settings: settings
      ? // The section order and visibility stay the sample's own: the user
        // may have hidden sections their CV does not have, and hiding them
        // here would make the thumbnails look as empty as their own CV.
        { ...settings, sectionOrder: ALL_SECTIONS, hiddenSections: [] }
      : SAMPLE_CV.settings,
  };
}
