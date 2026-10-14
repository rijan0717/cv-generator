import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { homePathFor } from '../utils/homePath.js';

/**
 * The landing page.
 *
 * Kept clean on purpose: a short introduction, what the system does, how to
 * use it, and a way in. The only motion is a gentle fade-in as sections
 * scroll into view (skipped for reduced-motion users), and there are no
 * invented figures.
 */

/**
 * The features, one card each. The key ones are marked `highlight` and
 * placed between the others, so they stand out by colour alone while every
 * card stays the same size. Words wrapped in **double asterisks** are
 * shown in bold.
 */
const FEATURES = [
  {
    title: 'Rewrite with AI',
    description: 'Pick a job and your CV is **rewritten to match** its **keywords and skills**.',
    highlight: true,
  },
  {
    title: 'Templates',
    description:
      'Choose a template and change the **colours, font, spacing** and **section order** to suit you.',
  },
  {
    title: 'CV builder',
    description:
      'Fill in your details section by section with a **live A4 preview**. Your work **saves automatically**.',
    highlight: true,
  },
  {
    title: 'Job board',
    description: 'Browse posted jobs, **save** the ones you like and **apply with your CV**.',
  },
  {
    title: 'CV strength checker',
    description: 'Every CV is **scored out of 100**, with **suggestions** on what to improve.',
    highlight: true,
  },
  {
    title: 'Export',
    description: 'Download your CV as **PDF, Word or Excel**.',
  },
  {
    title: 'Drop your CV, see matched jobs',
    description: 'Drop in your CV and see **every job on the board ranked** by how well you match.',
    highlight: true,
  },
];

/** The steps in the "How it works" list, with their key words in bold. */
const STEPS = [
  '**Create** a free account.',
  'Pick a **template** and fill in your details.',
  'Check your **CV strength** and fix what it suggests.',
  '**Drop your CV** or match it against a job to see how well you fit.',
  '**Rewrite** your CV for the job that matches your interests and skills.',
  '**Download** your CV or **apply** on the job board.',
];

/** Short, true facts shown under the hero buttons. */
const HERO_FACTS = ['Free to use', 'ATS-friendly templates', 'PDF, Word & Excel export'];

/**
 * Renders text with **double-asterisk** parts in bold.
 * @param {{text: string}} props
 */
function Emphasised({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* --- Hero --- */}
      <section className="relative py-16 text-center sm:py-24">
        {/* A soft colour wash behind the heading. Decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-6 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-gradient-to-r from-indigo-200/50 via-sky-200/40 to-fuchsia-200/50 blur-3xl dark:from-indigo-900/30 dark:via-sky-900/20 dark:to-fuchsia-900/30"
        />

        <Reveal>
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-900">
            CV builder · ATS job matching
          </span>

          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-100">
            Build a CV that{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400">
              gets you shortlisted
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Create a professional CV, see{' '}
            <strong className="text-slate-900 dark:text-slate-100">how strong it is</strong>, and
            find out{' '}
            <strong className="text-slate-900 dark:text-slate-100">how well it matches</strong> the
            job you want.
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

        <Reveal delay={250}>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
            {HERO_FACTS.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* --- Features --- */}
      <section className="border-t border-slate-200 py-12 dark:border-slate-700">
        <Reveal>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            What you can do
          </h2>
        </Reveal>

        {/* auto-rows-fr + h-full: every card in the grid is the same height,
            whatever the length of its text. */}
        <ul className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal as="li" key={feature.title} delay={(index % 3) * 100} className="h-full">
              <div
                className={[
                  'flex h-full flex-col rounded-lg border p-5 transition-shadow hover:shadow-md',
                  feature.highlight
                    ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
                ].join(' ')}
              >
                <h3
                  className={
                    feature.highlight
                      ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                      : 'font-semibold text-slate-900 dark:text-slate-100'
                  }
                >
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <Emphasised text={feature.description} />
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* --- How it works --- */}
      <section className="border-t border-slate-200 py-12 dark:border-slate-700">
        <Reveal>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            How it works
          </h2>
        </Reveal>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step} delay={index * 60}>
              <Emphasised text={step} />
            </Reveal>
          ))}
        </ol>
      </section>
    </div>
  );
}
