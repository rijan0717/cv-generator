import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import ReviewSlider from '../components/home/ReviewSlider.jsx';
import ScrollingCV from '../components/home/ScrollingCV.jsx';
import { homePathFor } from '../utils/homePath.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';

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
 * The CV shown in the hero: the author's own CV, with permission, laid
 * out in the Classic template. The phone number and email address are
 * left out on purpose, because this page is public and anything on it
 * can be scraped.
 */
const EXAMPLE_CV = {
  templateKey: 'classic',
  settings: { primaryColor: '#1f3a6e', fontFamily: 'Inter', fontSize: 'medium' },
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

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  useDocumentMeta({
    // No title passed: the hook appends the site name on its own, and
    // "Smart CV Generator | Smart CV Generator" is how a home page
    // announces that nobody checked.
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
      name: 'Smart CV Generator',
      applicationCategory: 'BusinessApplication',
      description: 'A CV builder that scores your CV and matches it against job adverts.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NPR' },
    },
  });

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
            what the builder produces. The box keeps its size and the CV
            scrolls slowly inside it, so the whole page can be seen; hidden
            on phones, where it would push everything else down. */}
        <figure className="hidden sm:block">
          <ScrollingCV cv={EXAMPLE_CV} height={460} />
          <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            A real CV in the Classic template.
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
