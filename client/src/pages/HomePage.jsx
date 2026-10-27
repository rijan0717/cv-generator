import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import ReviewSlider from '../components/home/ReviewSlider.jsx';
import CVPreview from '../components/cv/CVPreview.jsx';
import { homePathFor } from '../utils/homePath.js';

/**
 * The landing page.
 *
 * Kept plain on purpose: no gradients, glows or badges, and no invented
 * figures. Instead of decoration, the hero shows the product itself — the
 * real Classic template component, filled in with example details — so a
 * visitor sees what they will get before they sign up.
 */

/**
 * The features, grouped by what the user is trying to do at the time:
 * write the CV, check it, then use it. Three short lists read faster than
 * seven identical cards.
 */
const FEATURE_GROUPS = [
  {
    heading: 'Build',
    items: [
      {
        title: 'CV builder',
        description:
          'Fill in each section and watch the A4 preview update as you type. Work saves automatically.',
      },
      {
        title: 'Five templates',
        description: 'Change the colours, font, spacing and the order of the sections.',
      },
      {
        title: 'Export',
        description: 'Download as a PDF, Word or Excel file.',
      },
    ],
  },
  {
    heading: 'Check',
    items: [
      {
        title: 'CV strength score',
        description: 'A score out of 100, with a list of what to improve.',
      },
      {
        title: 'Match my CV',
        description: 'Drop in your CV and every job on the board is ranked by how well you fit.',
      },
    ],
  },
  {
    heading: 'Apply',
    items: [
      {
        title: 'Rewrite with JD',
        description: 'Paste a job description and your CV is rewritten to use its keywords.',
      },
      {
        title: 'Job board',
        description: 'Save the jobs you like and apply with the CV of your choice.',
      },
    ],
  },
];

/** The steps in the "How it works" list. */
const STEPS = [
  { title: 'Create an account', detail: 'Free, with no limit on how many CVs you keep.' },
  { title: 'Fill in your CV', detail: 'Pick a template, or drop in the CV you already have.' },
  { title: 'Check and improve', detail: 'Fix what the strength score points out.' },
  { title: 'Match and apply', detail: 'Rewrite it for a job, download it, or apply here.' },
];

/**
 * The example CV shown in the hero. Every detail is made up, and the
 * caption under the preview says so.
 */
const EXAMPLE_CV = {
  templateKey: 'classic',
  settings: { primaryColor: '#1e3a8a', fontFamily: 'Inter', fontSize: 'medium' },
  personal: {
    fullName: 'Asha Gurung',
    headline: 'Frontend Developer',
    email: 'asha.gurung@example.com',
    phone: '+977 9800000000',
    address: 'Lalitpur, Nepal',
    linkedin: 'linkedin.com/in/ashagurung',
  },
  summary:
    'Frontend developer with 3 years of experience building web apps in React. ' +
    'Cut page load time by 40% on a booking site used by 20,000 people a month, ' +
    'and enjoy turning rough designs into accessible, tested interfaces.',
  experience: [
    {
      position: 'Frontend Developer',
      company: 'Himal Tech',
      location: 'Kathmandu',
      startDate: '2023-04',
      isCurrent: true,
      achievements: [
        'Rebuilt the booking flow in React, cutting load time by 40%',
        'Added automated tests that caught 25+ bugs before release',
        'Mentored 2 junior developers through their first year',
      ],
    },
    {
      position: 'Web Developer Intern',
      company: 'Pixel Studio',
      location: 'Lalitpur',
      startDate: '2022-06',
      endDate: '2023-03',
      achievements: ['Built 12 landing pages for client campaigns'],
    },
  ],
  education: [
    {
      institution: 'Tribhuvan University',
      degree: 'BCA',
      fieldOfStudy: 'Computer Applications',
      startDate: '2018-11',
      endDate: '2022-10',
    },
  ],
  skills: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Testing'].map((name) => ({
    name,
    level: 'Advanced',
  })),
  projects: [],
  certifications: [],
  languages: [
    { language: 'Nepali', proficiency: 'Native' },
    { language: 'English', proficiency: 'Fluent' },
  ],
  references: [],
};

/** The centred column every section's content sits in. */
const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* --- Hero: the pitch on the left, the product on the right --- */}
      <section className={`${CONTAINER} grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2`}>
        <Reveal>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Free CV builder with job matching
          </p>

          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Build a CV that gets you shortlisted
          </h1>

          <p className="mt-4 max-w-lg text-lg text-slate-600 dark:text-slate-400">
            Make a professional CV, see how strong it is, and find out how well it matches the job
            you want.
          </p>

          {/* Nothing renders until the session check finishes, so a button
              never flips from one label to the other. */}
          {!isLoading && (
            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link to={homePathFor(user)}>
                  <Button size="lg">
                    {user?.accountType === 'employer' ? 'Go to my company' : 'Go to my account'}
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="lg">Get started — it&apos;s free</Button>
                </Link>
              )}
              <Link to="/jobs">
                <Button size="lg" variant="secondary">
                  Browse jobs
                </Button>
              </Link>
            </div>
          )}

          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            Free to use · ATS-friendly templates · PDF, Word and Excel export · AI rewrite
          </p>
        </Reveal>

        {/* The real template component, so the picture cannot drift from
            what the builder produces. Only the top of the page is shown;
            hidden on phones, where it would push everything else down. */}
        <figure className="hidden sm:block">
          <div className="relative mx-auto max-h-[460px] max-w-md overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700">
            <CVPreview cv={EXAMPLE_CV} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-slate-950"
            />
          </div>
          <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            The Classic template, filled in with example details.
          </figcaption>
        </figure>
      </section>

      {/* --- Reviews: full width, outside the centred column --- */}
      <ReviewSlider />

      {/* --- Features, grouped by what you are doing --- */}
      <section className="border-t border-slate-200 py-12 sm:py-16 dark:border-slate-700">
        <div className={CONTAINER}>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            What you can do
          </h2>

          <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-200 dark:md:divide-slate-700">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.heading} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {group.heading}
                </h3>
                <dl className="mt-4 space-y-5">
                  {group.items.map((item) => (
                    <div key={item.title}>
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </dt>
                      <dd className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- How it works --- */}
      <section className="border-t border-slate-200 bg-slate-50 py-12 sm:py-16 dark:border-slate-700 dark:bg-slate-900/50">
        <div className={CONTAINER}>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            How it works
          </h2>

          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="border-t-2 border-slate-900 pt-4 dark:border-slate-100"
              >
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Step {index + 1}
                </span>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --- Closing prompt, for visitors only --- */}
      {!isLoading && !isAuthenticated && (
        <section className="border-t border-slate-200 py-12 sm:py-16 dark:border-slate-700">
          <div
            className={`${CONTAINER} flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center`}
          >
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Ready to start your CV?
              </h2>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Start with a template or drop in the CV you have. You can finish it later.
              </p>
            </div>
            <Link to="/register">
              <Button size="lg">Create a free account</Button>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
