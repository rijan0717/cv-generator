import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import ReviewSlider from '../components/home/ReviewSlider.jsx';
import { homePathFor } from '../utils/homePath.js';

/**
 * The landing page.
 *
 * Kept plain on purpose: a short introduction, real user reviews, what the
 * system does and how to use it. No gradients, glows or badges, and no
 * invented figures. The only motion is a gentle fade-in as sections scroll
 * into view (skipped for reduced-motion users) and the review strip.
 */

/** The features, one card each. */
const FEATURES = [
  {
    title: 'CV builder',
    description:
      'Fill in your details section by section and watch the A4 preview update as you type. Your work saves automatically.',
  },
  {
    title: 'Templates',
    description:
      'Five layouts to choose from. Change the colours, font, spacing and the order of the sections.',
  },
  {
    title: 'CV strength checker',
    description: 'Each CV gets a score out of 100 and a list of things to improve.',
  },
  {
    title: 'Rewrite with AI',
    description: 'Pick a job and your CV is rewritten to use its keywords and skills.',
  },
  {
    title: 'Drop your CV, see matched jobs',
    description: 'Drop in your CV and every job on the board is ranked by how well you fit it.',
  },
  {
    title: 'Job board',
    description: 'Browse jobs, save the ones you like and apply with your CV.',
  },
  {
    title: 'Export',
    description: 'Download your CV as a PDF, Word or Excel file.',
  },
];

/** The steps in the "How it works" list. */
const STEPS = [
  'Create a free account.',
  'Pick a template and fill in your details.',
  'Check your CV strength and fix what it suggests.',
  'Drop your CV, or match it against a job, to see how well you fit.',
  'Rewrite your CV for the job you want.',
  'Download your CV or apply on the job board.',
];

/** The centred column every section's content sits in. Wide, so the page
 *  fills a large screen, with side padding that grows with the screen. */
const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* --- Hero --- */}
      <section className={`${CONTAINER} py-16 text-center sm:py-20`}>
        <Reveal>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Build a CV that gets you shortlisted
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Make a professional CV, see how strong it is, and find out how well it matches the job
            you want.
          </p>
        </Reveal>

        {/* Nothing renders until the session check finishes, so a button
            never flips from one label to the other. */}
        {!isLoading && (
          <Reveal delay={150} className="mt-8 flex flex-wrap justify-center gap-3">
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
          </Reveal>
        )}

        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          Free to use · ATS-friendly templates · PDF, Word and Excel export · AI rewrite
        </p>
      </section>

      {/* --- Reviews: full width, outside the centred column --- */}
      <ReviewSlider />

      {/* --- Features ---
          The section (and its top border) spans the whole screen; the
          content inside is held to the wide centred column. */}
      <section className="border-t border-slate-200 py-12 sm:py-16 dark:border-slate-700">
        <div className={CONTAINER}>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            What you can do
          </h2>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --- How it works --- */}
      <section className="border-t border-slate-200 py-12 sm:py-16 dark:border-slate-700">
        <div className={CONTAINER}>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            How it works
          </h2>

          <ol className="mt-6 grid list-inside list-decimal gap-x-8 gap-y-3 text-slate-700 sm:grid-cols-2 lg:grid-cols-3 dark:text-slate-300">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
