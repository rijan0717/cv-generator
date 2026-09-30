/**
 * A fictional CV used for the home page previews.
 *
 * Deliberately invented and obviously so. Using a real user's CV here
 * would be a privacy problem, and an empty one would show nothing worth
 * looking at.
 *
 * Shared between the hero fan and the rotating showcase so both show the
 * same person, which makes the templates comparable.
 */
export const SAMPLE_CV = {
  templateKey: 'classic',
  settings: {
    primaryColor: '#4f46e5',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    fontSize: 'medium',
    spacing: 'normal',
    sectionOrder: ['summary', 'experience', 'education', 'skills'],
    hiddenSections: [],
  },
  personal: {
    fullName: 'Sample Candidate',
    headline: 'Software Developer',
    email: 'hello@example.com',
    phone: '+977 9800000000',
    address: 'Kathmandu',
    website: '',
    linkedin: '',
    github: '',
    photoUrl: '',
  },
  summary:
    'Developer with three years building web applications in React and Node.js, focused on clear code and measurable results.',
  experience: [
    {
      _id: 'x1',
      company: 'Example Ltd',
      position: 'Software Developer',
      location: 'Kathmandu',
      startDate: '2023-01',
      endDate: '',
      isCurrent: true,
      description: 'Built and maintained the customer-facing web application.',
      achievements: ['Improved page load time by 40%', 'Mentored two junior developers'],
    },
    {
      _id: 'x2',
      company: 'Beta Systems',
      position: 'Junior Developer',
      location: 'Kathmandu',
      startDate: '2021-06',
      endDate: '2022-12',
      isCurrent: false,
      description: 'Worked on internal reporting tools.',
      achievements: ['Automated a weekly report that took four hours by hand'],
    },
  ],
  education: [
    {
      _id: 'x3',
      institution: 'Tribhuvan University',
      degree: 'BCA',
      fieldOfStudy: 'Computer Application',
      startDate: '2021-09',
      endDate: '2025-06',
      grade: '',
      description: '',
    },
  ],
  skills: [
    { _id: 'x4', name: 'React', level: 'Advanced' },
    { _id: 'x5', name: 'Node.js', level: 'Advanced' },
    { _id: 'x6', name: 'MongoDB', level: 'Intermediate' },
    { _id: 'x7', name: 'TypeScript', level: 'Intermediate' },
  ],
  projects: [],
  certifications: [],
  languages: [],
  references: [],
  referencesOnRequest: true,
};

/** Accent colour per template, so the previews are not five grey pages. */
export const TEMPLATE_ACCENTS = {
  classic: '#1e293b',
  modern: '#4f46e5',
  minimal: '#111827',
  creative: '#be123c',
  ats: '#000000',
};

/**
 * Builds the sample CV for one template, with its accent colour.
 * @param {string} templateKey - Which template to render.
 * @returns {object} A CV ready to pass to a template component.
 */
export function sampleFor(templateKey) {
  return {
    ...SAMPLE_CV,
    templateKey,
    settings: {
      ...SAMPLE_CV.settings,
      primaryColor: TEMPLATE_ACCENTS[templateKey] ?? SAMPLE_CV.settings.primaryColor,
    },
  };
}

export default SAMPLE_CV;
