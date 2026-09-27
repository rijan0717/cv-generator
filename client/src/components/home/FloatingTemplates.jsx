import { useState, useEffect } from 'react';
import { TEMPLATES } from '../../templates/index.js';
import { buildTemplateVariables } from '../../templates/templateUtils.js';

/**
 * A miniature CV used only for the home page showcase.
 *
 * It is deliberately fictional and obviously so. Using a real user's CV here
 * would be a privacy problem, and an empty one would show nothing.
 */
const SAMPLE_CV = {
  templateKey: 'classic',
  settings: {
    primaryColor: '#0f172a',
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
  summary: 'Developer building web applications with React and Node.js.',
  experience: [
    {
      _id: 'x1',
      company: 'Example Ltd',
      position: 'Software Developer',
      location: 'Kathmandu',
      startDate: '2023-01',
      endDate: '',
      isCurrent: true,
      description: '',
      achievements: ['Improved page load time by 40%'],
    },
  ],
  education: [
    {
      _id: 'x2',
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
    { _id: 'x3', name: 'React', level: 'Advanced' },
    { _id: 'x4', name: 'Node.js', level: 'Advanced' },
    { _id: 'x5', name: 'MongoDB', level: 'Intermediate' },
  ],
  projects: [],
  certifications: [],
  languages: [],
  references: [],
  referencesOnRequest: true,
};

/** Accent colour per template, so the showcase is not five grey pages. */
const ACCENTS = {
  classic: '#0f172a',
  modern: '#1e3a8a',
  minimal: '#111827',
  creative: '#881337',
  ats: '#000000',
};

/** How long each template stays on screen. */
const ROTATE_MS = 3500;

/** True A4 width in CSS pixels, matching the real preview. */
const A4_WIDTH_PX = 793.7;

/**
 * The rotating template showcase on the home page.
 *
 * It renders the genuine template components at true A4 size and scales them
 * down, exactly as the editor preview does. Using real templates rather than
 * screenshots means the showcase can never drift out of date when a template
 * changes.
 */
export default function FloatingTemplates() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Respect a reduced-motion preference by not rotating automatically.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || isPaused) return undefined;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % TEMPLATES.length);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [isPaused]);

  const active = TEMPLATES[index];
  const { Component } = active;

  const cv = {
    ...SAMPLE_CV,
    templateKey: active.key,
    settings: { ...SAMPLE_CV.settings, primaryColor: ACCENTS[active.key] },
  };

  // The preview is 300px wide on screen but laid out at full A4.
  const scale = 300 / A4_WIDTH_PX;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* The page itself, floating. The CV stays white in dark mode, because
          that is what it will actually print as. */}
      <div
        className="cvg-float mx-auto overflow-hidden rounded-lg shadow-2xl ring-1 ring-slate-900/10"
        style={{ width: 300, height: 424 }}
      >
        <div
          style={{
            ...buildTemplateVariables(cv.settings),
            width: `${A4_WIDTH_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <Component cv={cv} />
        </div>
      </div>

      {/* Which template is showing, and a way to pick one directly. */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {TEMPLATES.map((template, i) => (
          <button
            key={template.key}
            type="button"
            onClick={() => setIndex(i)}
            aria-current={i === index}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition',
              i === index
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
