import { Link, useParams } from 'react-router-dom';
import { getFeature, FEATURES } from '../data/features.js';
import { MENU_ICONS } from '../components/layout/menus.js';
import { BRAND_TEXT_GRADIENT, BrandSpark } from '../components/ui/BrandMark.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import useCountUp from '../utils/useCountUp.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';

/**
 * The public page behind one header-menu entry.
 *
 * One component for all eight, driven by `src/data/features.js`. Each one
 * is the same shape — headline, three figures, four points, four steps,
 * a closing prompt — because they answer the same question about
 * different tools, and a visitor who reads two of them should not have to
 * learn a new page the second time.
 *
 * The movement on the page is deliberately small and all of it is
 * one-shot: sections rise in as they arrive, the figures count up once,
 * and the cards lift under the pointer. Nothing loops, nothing moves
 * while being read, and every piece of it is dropped for a reader whose
 * system asks for reduced motion.
 */

/** The centred column every section sits in. */
const CONTAINER = 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8';

/**
 * One figure, counting up the first time it is seen.
 * @param {{value: number, suffix?: string, label: string}} props
 */
function Stat({ value, suffix = '', label }) {
  const { ref, value: shown } = useCountUp(value);

  return (
    <div ref={ref}>
      <p className={`font-display text-4xl font-extrabold sm:text-5xl ${BRAND_TEXT_GRADIENT}`}>
        {shown}
        {suffix}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
}

/** One of the four points, as a card. */
function Point({ point, index }) {
  return (
    <Reveal delay={index * 80}>
      <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-fuchsia/40 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-violet to-brand-pink text-white"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={MENU_ICONS[point.icon]} />
          </svg>
        </span>

        <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          {point.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {point.detail}
        </p>
      </div>
    </Reveal>
  );
}

export default function FeaturePage() {
  const { slug } = useParams();
  const feature = getFeature(slug);

  // Hooks must run before any early return, so the meta call is given
  // safe values rather than being skipped for an unknown slug.
  useDocumentMeta({
    title: feature ? `${feature.title} ${feature.highlight}` : undefined,
    description: feature?.intro,
    canonicalPath: feature ? `/features/${feature.slug}` : undefined,
  });

  // An unknown slug is a 404, not an empty page with a working header.
  if (!feature) return <NotFoundPage />;

  /** The other pages from the same menu, for the row at the bottom. */
  const siblings = FEATURES.filter(
    (other) => other.menu === feature.menu && other.slug !== feature.slug,
  );

  return (
    <>
      {/* --- Hero --- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[30rem] bg-[radial-gradient(55%_55%_at_50%_30%,rgba(168,85,247,0.15),transparent_70%)]"
        />

        <div className={`${CONTAINER} py-14 text-center sm:py-20`}>
          <Reveal>
            <div className="flex justify-center">
              <BrandSpark className="h-14 w-14 rounded-2xl" />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-fuchsia dark:text-fuchsia-400">
              {feature.eyebrow}
            </p>

            <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-100">
              {feature.title} <span className={BRAND_TEXT_GRADIENT}>{feature.highlight}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {feature.intro}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <Link
                to={feature.primary.to}
                className="rounded-full cvg-gradient-bg px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia"
              >
                {feature.primary.label}
              </Link>
              <Link
                to={feature.secondary.to}
                className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
              >
                {feature.secondary.label}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --- The three figures --- */}
      <section className="border-y border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className={`${CONTAINER} grid gap-8 text-center sm:grid-cols-3`}>
          {feature.stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* --- What it does --- */}
      <section className={`${CONTAINER} py-14 sm:py-20`}>
        <Reveal>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
            What it does
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {feature.points.map((point, index) => (
            <Point key={point.title} point={point} index={index} />
          ))}
        </div>
      </section>

      {/* --- How it works --- */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20 dark:border-slate-800 dark:bg-slate-900/50">
        <div className={CONTAINER}>
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
              How it works
            </h2>
          </Reveal>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {feature.steps.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 90}>
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
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* --- The rest of this menu --- */}
      {siblings.length > 0 && (
        <section className={`${CONTAINER} py-14 sm:py-20`}>
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              More under {feature.menu}
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((other, index) => (
              <Reveal key={other.slug} delay={index * 80}>
                <Link
                  to={`/features/${other.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-fuchsia/40 hover:shadow-xl hover:shadow-slate-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-fuchsia dark:text-fuchsia-400">
                    {other.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {other.title} {other.highlight}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {other.intro}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Read more <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* --- Closing prompt --- */}
      <section className={`${CONTAINER} pb-16`}>
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-slate-900 px-8 py-10 sm:flex-row sm:items-center sm:px-12 dark:bg-slate-800">
            <p className="max-w-xl font-display text-2xl font-bold text-white sm:text-3xl">
              {feature.closing}
            </p>
            <Link
              to={feature.primary.to}
              className="shrink-0 rounded-full cvg-gradient-bg px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90"
            >
              {feature.primary.label}
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
