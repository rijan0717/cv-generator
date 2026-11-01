import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal.jsx';

/**
 * The home page's pitch for the job-tailored rewrite.
 *
 * It sits below the browsing block because it is the one thing on the site
 * a visitor cannot understand by looking at it. Templates explain
 * themselves as pictures and the board explains itself as a list; "your CV
 * is rewritten against an advert" needs sentences and a picture of what
 * comes back.
 *
 * The picture on the right is a diagram, not a screenshot: three stacked
 * rows standing for the three bullets of an experience entry, with the
 * changed words shown as struck-through old text beside new. A screenshot
 * would be out of date the first time the review screen changed; this
 * cannot be, because it is not claiming to be the screen.
 */

/** What the rewrite does, in the order it does it. */
const POINTS = [
  'Paste the advert — the whole thing, as it was posted',
  'Your CV comes back rewritten in the words that advert uses',
  'Approve each change line by line, or keep the original',
  'Save it as a new CV; the one you started from is never touched',
];

/** One row of the diagram: an old phrase struck through, the new one after. */
function DiffRow({ before, after, width }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600"
          style={{ width }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-snug">
        <span className="text-slate-400 line-through dark:text-slate-500">{before}</span>{' '}
        <span className="font-semibold text-brand-fuchsia dark:text-fuchsia-400">{after}</span>
      </p>
    </div>
  );
}

export default function RewritePreview() {
  return (
    <section className="border-t border-slate-200 py-14 sm:py-20 dark:border-slate-800">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal>
          {/* The same spark as the logo, outlined rather than filled, so it
              reads as a section mark and not as a second brand. */}
          <span
            aria-hidden="true"
            className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-brand-fuchsia/40 text-brand-fuchsia dark:border-fuchsia-400/40 dark:text-fuchsia-400"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5Z" />
              <path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
            </svg>
          </span>

          <h2 className="mt-6 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
            A simpler, smarter way to rewrite the CV you already have
          </h2>

          <ul className="mt-7 space-y-3.5">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3">
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
                <span className="text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-300">
                  {point}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to="/rewrite"
              className="rounded-full bg-brand-gradient px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia"
            >
              Rewrite my CV
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
            >
              I&apos;ll write it myself
            </Link>
          </div>

          <p className="mt-7 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <Link
              to="/blog"
              className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
            >
              How the rewrite works
            </Link>
            <span aria-hidden="true">|</span>
            <span>Nothing is sent anywhere — the rewrite runs on our own server</span>
          </p>
        </Reveal>

        {/* --- The diagram --- */}
        <Reveal delay={120}>
          <div className="rounded-2xl bg-slate-100 p-3 ring-1 ring-slate-900/5 dark:bg-slate-800/60 dark:ring-white/10">
            {/* A window chrome, so the panel reads as a screen rather than
                as a floating box. */}
            <div className="flex gap-1.5 px-2 py-2" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-[7rem_1fr] dark:bg-slate-900">
              {/* The advert, pasted. */}
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-brand-fuchsia dark:text-fuchsia-400"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5Z" />
                </svg>
                <p className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  The advert
                </p>
                <div className="mt-2 space-y-1.5" aria-hidden="true">
                  {['100%', '85%', '92%', '60%', '78%'].map((width, index) => (
                    <span
                      key={index}
                      className="block h-1.5 rounded-full bg-slate-200 dark:bg-slate-600"
                      style={{ width }}
                    />
                  ))}
                </div>
              </div>

              {/* What comes back. */}
              <div className="space-y-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Your CV, rewritten
                </p>
                <DiffRow before="Worked on" after="Led delivery of" width="45%" />
                <DiffRow before="Helped with testing" after="Owned the release gate" width="62%" />
                <DiffRow before="Used some tools" after="Automated in Playwright" width="38%" />
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Every change is shown before it is kept.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
