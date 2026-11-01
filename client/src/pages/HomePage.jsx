import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Reveal from '../components/ui/Reveal.jsx';
import ReviewSlider from '../components/home/ReviewSlider.jsx';
import ScrollingCV from '../components/home/ScrollingCV.jsx';
import DiscoverTabs from '../components/home/DiscoverTabs.jsx';
import RewritePreview from '../components/home/RewritePreview.jsx';
import { BRAND_TEXT_GRADIENT } from '../components/ui/BrandMark.jsx';
import { homePathFor } from '../utils/homePath.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';

/**
 * The landing page.
 *
 * It is built around one question — "what do you want to do?" — rather than
 * around a list of features. A visitor arrives either with no CV or with a
 * CV that is not getting replies, and those are two different pages. The
 * hero is a two-way switch between them, and everything below it is the
 * site's actual contents rather than a description of them: real templates,
 * the real board, the real tools.
 */

/**
 * The two hero panels the pill switch moves between.
 *
 * Keeping them as data rather than as two blocks of markup is what makes
 * the switch one line of state instead of a duplicated hero, and it is why
 * adding a third way in later costs an object rather than a rewrite.
 */
const HERO_TABS = [
  {
    key: 'hire-talent',
    label: 'Hire talent',
    kicker: 'Start from nothing',
    heading: 'Create a résumé that',
    // The phrase that takes the brand gradient, so the eye lands on the
    // promise rather than on the verb.
    highlight: 'gets you shortlisted',
    points: [
      'Build a CV section by section, with an A4 preview that updates as you type',
      'Choose from forty templates, from strictly ATS-friendly to boldly creative',
      'Download it as a PDF, a Word file or a spreadsheet — free, with no watermark',
    ],
    primary: { to: '/register', label: 'Create my CV' },
    secondary: { to: '/templates', label: 'or browse the templates' },
  },
  {
    key: 'get-hired',
    label: 'Get hired',
    kicker: 'Already have a CV?',
    heading: 'Rewrite it for the job',
    highlight: 'you actually want',
    points: [
      'Paste the advert and your CV is rewritten to use the words it uses',
      'Every fact stays yours — only the phrasing changes, and you approve each line',
      'See the keywords you match, the ones you are missing, and a score out of 100',
    ],
    primary: { to: '/rewrite', label: 'Rewrite my CV' },
    secondary: { to: '/match-cv', label: 'or score the CV I have' },
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
 * The CV shown in the hero: the author's own CV, with permission, laid
 * out in the Classic template. The phone number and email address are
 * left out on purpose, because this page is public and anything on it
 * can be scraped.
 */
const EXAMPLE_CV = {
  templateKey: 'classic',
  settings: { primaryColor: '#7c3aed', fontFamily: 'Inter', fontSize: 'medium' },
  personal: {
    fullName: 'Rijan Pariyar',
    headline: 'Quality Assurance Specialist',
    address: 'Baneshwor, Kathmandu, Nepal',
    linkedin: 'linkedin.com/in/rijan-pariyar',
    github: 'github.com/rijan0717',
  },
  summary:
    "Quality Assurance Specialist with over 3 years' experience across fintech SaaS and " +
    'e-commerce platforms, covering the full test cycle from test design to release sign-off. ' +
    'Builds and maintains automated regression suites in Playwright (TypeScript, JavaScript, ' +
    'Python) and Cypress, and tests REST APIs end to end from Swagger/OpenAPI and Scalar ' +
    'specifications. Strong on defect documentation and traceability.',
  experience: [
    {
      position: 'Quality Assurance Specialist (Mid-level)',
      company: 'Sterling Wells',
      location: 'Kathmandu, Nepal',
      startDate: '2025-11',
      isCurrent: true,
      achievements: [
        'Test fintech SaaS products (RentalBux, TMS and CRM), running functional, regression, smoke and UAT cycles for every sprint release',
        'Build and maintain automated regression and end-to-end suites in Playwright with TypeScript and Python',
        'Test and validate REST APIs using Postman, Swagger/OpenAPI and Scalar, logging defects with reproducible request and response evidence',
        'Act as the release gate: maintain test cases and traceability in Azure Boards and Jira, and run smoke and regression checks before each deployment',
      ],
    },
    {
      position: 'Associate QA Engineer',
      company: 'Matat Nepal',
      location: 'Kathmandu, Nepal',
      startDate: '2023-08',
      endDate: '2025-11',
      achievements: [
        'Led QA on WordPress and Shopify e-commerce builds, covering themes, plugins, checkout, forms and UI/UX',
        'Built and maintained Cypress (JavaScript) automation for login, checkout and regression flows',
        'Validated bulk product data imports, catching mapping, pricing and variant errors before go-live',
      ],
    },
  ],
  projects: [
    {
      name: 'Manual QA Bug Reports',
      description:
        '4 projects, 59 defects: Azure Boards reports with steps, expected and actual results, severity and priority.',
    },
    {
      name: 'Amazon Playwright Automation',
      description:
        'Automated Amazon e-commerce flows in Playwright with TypeScript, using the Page Object Model.',
      technologies: ['Playwright', 'TypeScript'],
    },
  ],
  education: [
    {
      institution: 'G. P. Koirala Memorial College, Tribhuvan University',
      degree: 'Bachelor of Computer Applications (BCA)',
    },
  ],
  skills: [
    'Playwright',
    'Cypress',
    'Postman',
    'REST API testing',
    'Azure Boards',
    'Jira',
    'BrowserStack',
    'TypeScript',
    'JavaScript',
    'Python',
  ].map((name) => ({ name, level: 'Advanced' })),
  certifications: [],
  languages: [
    { language: 'English', proficiency: 'Professional working' },
    { language: 'Nepali', proficiency: 'Native' },
  ],
  references: [],
};

/** The centred column every section's content sits in. */
const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

/** The pink tick beside each hero point. */
function Tick() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20"
    >
      <svg
        className="h-3 w-3 text-brand-pink dark:text-fuchsia-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [heroTab, setHeroTab] = useState(HERO_TABS[0].key);
  const hero = HERO_TABS.find((tab) => tab.key === heroTab) ?? HERO_TABS[0];

  useDocumentMeta({
    // No title passed: the hook appends the site name on its own, and
    // "SmartCV | SmartCV" is how a home page announces that nobody checked.
    description:
      'Build a professional CV, score its strength and check how well it matches a job advert before you apply. ATS-friendly templates, a strength score and a job board.',
    keywords: [
      'cv builder',
      'resume builder',
      'ats friendly cv',
      'cv checker',
      'job matching',
      'cv templates',
    ],
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SmartCV',
      applicationCategory: 'BusinessApplication',
      description: 'A CV builder that scores your CV and matches it against job adverts.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NPR' },
    },
  });

  return (
    <>
      {/* --- Hero --- */}
      <section className="relative overflow-hidden">
        {/* A soft brand wash behind the hero. Decorative only, so it is
            hidden from assistive technology and sits behind everything. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgba(168,85,247,0.16),transparent_70%)]"
        />

        <div className={`${CONTAINER} grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-2`}>
          <Reveal>
            {/* The pill switch. A radio group rather than two buttons,
                because that is what it is: one choice with two options,
                and arrow keys should move between them. */}
            <div
              role="tablist"
              aria-label="What would you like to do?"
              className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
            >
              {HERO_TABS.map((tab) => {
                const isActive = tab.key === heroTab;

                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setHeroTab(tab.key)}
                    className={[
                      'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia',
                      isActive
                        ? 'cvg-gradient-bg text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Keyed on the tab, so React replaces the block rather than
                patching it — which is what lets the fade run on a switch. */}
            <div key={hero.key} className="motion-safe:animate-[cvg-menu-in_220ms_ease-out]">
              <p className="mt-7 text-sm font-semibold text-brand-fuchsia dark:text-fuchsia-400">
                {hero.kicker}
              </p>

              <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-slate-100">
                {hero.heading} <span className={BRAND_TEXT_GRADIENT}>{hero.highlight}</span>
              </h1>

              <ul className="mt-7 space-y-3">
                {hero.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <Tick />
                    <span className="text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-300">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Nothing renders until the session check finishes, so a
                  button never flips from one label to the other. */}
              {!isLoading && (
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    to={isAuthenticated ? homePathFor(user) : hero.primary.to}
                    className="rounded-full cvg-gradient-bg px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia"
                  >
                    {isAuthenticated
                      ? user?.accountType === 'employer'
                        ? 'Go to my company'
                        : 'Go to my account'
                      : hero.primary.label}
                  </Link>

                  <Link
                    to={hero.secondary.to}
                    className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
                  >
                    {hero.secondary.label}
                  </Link>
                </div>
              )}

              <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Free to use · ATS-friendly templates · PDF, Word and Excel export
              </p>
            </div>
          </Reveal>

          {/* The real template component, so the picture cannot drift from
              what the builder produces. The box keeps its size and the CV
              scrolls slowly inside it, so the whole page can be seen;
              hidden on phones, where it would push everything else down. */}
          <figure className="hidden sm:block">
            <ScrollingCV cv={EXAMPLE_CV} height={480} />
            <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              A real CV in the Classic template.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* --- Browse what is actually here --- */}
      <DiscoverTabs />

      {/* --- The rewrite, explained with the screen it produces --- */}
      <RewritePreview />

      {/* --- Reviews: full width, outside the centred column --- */}
      <ReviewSlider />

      {/* --- How it works --- */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20 dark:border-slate-800 dark:bg-slate-900/50">
        <div className={CONTAINER}>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
            How it works
          </h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-xl cvg-gradient-bg font-display text-base font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --- Closing prompt, for visitors only --- */}
      {!isLoading && !isAuthenticated && (
        <section className="border-t border-slate-200 py-14 sm:py-20 dark:border-slate-800">
          <div className={CONTAINER}>
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-slate-900 px-8 py-10 sm:flex-row sm:items-center sm:px-12 dark:bg-slate-800">
              <div>
                <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Ready to start your CV?
                </h2>
                <p className="mt-2 max-w-lg text-sm text-slate-300">
                  Start with a template or drop in the CV you already have. You can finish it later
                  — nothing is lost.
                </p>
              </div>

              <Link
                to="/register"
                className="shrink-0 rounded-full cvg-gradient-bg px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
