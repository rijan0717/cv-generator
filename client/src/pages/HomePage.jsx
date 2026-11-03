import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/useAuth.js';
import { Reveal, Stagger, Floating } from '../components/ui/motion.jsx';
import { scaleIn } from '../components/ui/motionVariants.js';
import ReviewSlider from '../components/home/ReviewSlider.jsx';
import HeroDemo from '../components/home/HeroDemo.jsx';
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
    key: 'create-cv',
    label: 'Create CV',
    kicker: 'No CV yet?',
    heading: 'Create a résumé that',
    // The phrase that takes the brand gradient, so the eye lands on the
    // promise rather than on the verb.
    highlight: 'gets you shortlisted',
    points: [
      'Pick one of forty templates, from strictly ATS-friendly to boldly creative',
      'It opens already filled with sample content — replace it with yours, section by section',
      'Download it as a PDF, a Word file or a spreadsheet — free, with no watermark',
    ],
    // Goes to the public builder rather than straight to registration.
    // Asking someone to create an account before they have seen the tool
    // do anything is the thing this hero is trying to talk them out of.
    primary: { to: '/build-cv', label: 'Create my CV' },
    secondary: { to: '/templates', label: 'or browse the templates' },
  },
  {
    key: 'get-hired',
    label: 'Get hired',
    kicker: 'Already have a CV?',
    heading: 'Rewrite it for the job',
    highlight: 'you actually want',
    points: [
      'Drop the CV you already have and see which open jobs it fits, no account needed',
      'Pick a job and it is rewritten to use the words that advert uses',
      'Every fact stays yours — only the phrasing changes, and you approve each line',
    ],
    // Goes to the public funnel rather than `/rewrite`, which needs a
    // session and a primary CV. A visitor reading this hero has neither,
    // and being asked to register before seeing anything work is the
    // thing this page exists to avoid.
    primary: { to: '/rewrite-cv', label: 'Rewrite your CV' },
    secondary: { to: '/jobs', label: 'or just browse the jobs' },
  },
];

/** The steps in the "How it works" list. */
const STEPS = [
  { title: 'Create an account', detail: 'Free, with no limit on how many CVs you keep.' },
  { title: 'Fill in your CV', detail: 'Pick a template, or drop in the CV you already have.' },
  { title: 'Check and improve', detail: 'Fix what the strength score points out.' },
  { title: 'Match and apply', detail: 'Rewrite it for a job, download it, or apply here.' },
];

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
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgb(var(--c-glow)/0.14),transparent_70%)]"
        />

        <div className={`${CONTAINER} grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-2`}>
          {/* The hero is the one block that animates on load rather than on
              scroll — it is already on screen, so waiting for a scroll that
              never comes would mean it never arrived. */}
          <Stagger>
            {/* The pill switch. A tablist rather than two buttons, because
                that is what it is: one choice with two options. */}
            <Stagger.Item>
              <div
                role="tablist"
                aria-label="What would you like to do?"
                className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-navy-700 dark:bg-navy-800"
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
                        'relative rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia',
                        isActive
                          ? 'text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-50',
                      ].join(' ')}
                    >
                      {/* `layoutId` is what slides the pill from one tab to
                          the other instead of redrawing it in place.

                          It is painted before the label in DOM order and
                          the label is given `relative`, which is what puts
                          the label on top. A negative z-index was tried
                          and is wrong: the button is `relative` with an
                          automatic z-index, so it is not a stacking
                          context, and `-z-10` sent the pill behind the
                          container's own background instead of behind the
                          label — leaving cream text on a cream page. */}
                      {isActive && (
                        <motion.span
                          layoutId="hero-pill"
                          aria-hidden="true"
                          className="cvg-gradient-bg absolute inset-0 rounded-full"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </Stagger.Item>

            {/* `AnimatePresence` with `mode="wait"` lets the outgoing panel
                finish before the incoming one starts, so the two never
                overlap mid-switch. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={hero.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <p className="mt-7 text-sm font-semibold text-brand-fuchsia dark:text-fuchsia-400">
                  {hero.kicker}
                </p>

                <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-slate-50">
                  {hero.heading}{' '}
                  <span className={`${BRAND_TEXT_GRADIENT} cvg-shimmer`}>{hero.highlight}</span>
                </h1>

                <ul className="mt-7 space-y-3">
                  {hero.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <Tick />
                      <span className="text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-100">
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
                      className="cvg-gradient-bg cvg-glow cvg-glow-hover rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia"
                    >
                      {isAuthenticated
                        ? user?.accountType === 'employer'
                          ? 'Go to my company'
                          : 'Go to my account'
                        : hero.primary.label}
                    </Link>

                    <Link
                      to={hero.secondary.to}
                      className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-100 dark:hover:text-slate-50"
                    >
                      {hero.secondary.label}
                    </Link>
                  </div>
                )}

                <p className="mt-6 text-xs text-slate-500 dark:text-slate-100">
                  Free to use · ATS-friendly templates · PDF, Word and Excel export
                </p>
              </motion.div>
            </AnimatePresence>
          </Stagger>

          {/* An animated picture of the tool behind the open tab: the editor
              filling itself in for "Create CV", the rewrite ticking through
              its steps for "Get hired". It changes with the pill switch, so
              the two halves of the hero always talk about the same thing.
              Hidden on phones, where it would push everything else down.

              It drifts: eight pixels over six seconds, which reads as alive
              without making the text inside it hard to follow. A soft aura
              sits behind it so the card has something to float above. */}
          <figure className="relative isolate hidden sm:block">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgb(var(--c-glow)/0.22),transparent_70%)] blur-2xl"
            />

            <Floating>
              <HeroDemo tab={heroTab} />
            </Floating>

            <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-100">
              {heroTab === 'get-hired'
                ? 'Rewriting a CV for one job advert.'
                : 'The builder: type on the left, the CV updates on the right.'}
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
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20 dark:border-navy-700 dark:bg-navy-900/50">
        <div className={CONTAINER}>
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
              How it works
            </h2>
          </Reveal>

          {/* The four steps arrive left to right, which is the order they
              are meant to be read in. */}
          <Stagger as="ol" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Stagger.Item as="li" key={step.title}>
                <span
                  aria-hidden="true"
                  className="cvg-gradient-bg grid h-10 w-10 place-items-center rounded-xl font-display text-base font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-50">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-100">
                  {step.detail}
                </p>
              </Stagger.Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* --- Closing prompt, for visitors only --- */}
      {!isLoading && !isAuthenticated && (
        <section className="border-t border-slate-200 py-14 sm:py-20 dark:border-navy-700">
          <div className={CONTAINER}>
            <Reveal variants={scaleIn}>
              <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-slate-900 px-8 py-10 sm:flex-row sm:items-center sm:px-12">
                {/* A brand aura bleeding in from the right, so the panel is
                    not a flat black rectangle. Clipped by the rounded
                    corner above it. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgb(var(--c-glow)/0.4),transparent_70%)] blur-2xl"
                />

                <div className="relative">
                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    Ready to start your CV?
                  </h2>
                  <p className="mt-2 max-w-lg text-sm text-slate-300">
                    Start with a template or drop in the CV you already have. You can finish it
                    later — nothing is lost.
                  </p>
                </div>

                <Link
                  to="/register"
                  className="cvg-gradient-bg cvg-glow cvg-glow-hover relative shrink-0 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-95"
                >
                  Create a free account
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
