/**
 * The parts every feature-page demo is drawn from.
 *
 * Each demo is a *drawing* of a screen, not the screen itself: nothing
 * is fetched, nothing can be typed into, and no component from the real
 * application is imported. That is deliberate. These run on public pages
 * seen by people with no account, they must not depend on a signed-in
 * session, and a mistake in one of them must not be able to break the
 * tool it illustrates.
 *
 * They follow the home page's hero demos, which already work this way,
 * so a visitor who scrolls from the home page to a feature page sees one
 * idiom rather than two.
 *
 * The timing lives in `demoHooks.js`.
 */

/**
 * The window the demos sit in.
 *
 * Styled as a small application window rather than as one of our own
 * cards, so it reads as "this is the product" and not as another panel
 * of the marketing page it sits on.
 *
 * `aria-hidden`, because a screen reader gains nothing from a moving
 * picture — which is why every demo is captioned in real text outside
 * the frame.
 *
 * @param {{title: string, children: React.ReactNode, className?: string}} props
 */
export function DemoFrame({ title, children, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-violet/10 dark:border-navy-700 dark:bg-navy-800 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-navy-700">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-xs font-medium text-slate-500 dark:text-slate-300">
          {title}
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/**
 * A grey bar standing in for a line of text that is not the point.
 *
 * Each demo makes one point; everything else on the screen it is drawing
 * becomes these, so the eye goes to the part that moves.
 *
 * @param {{width: string|number, className?: string}} props
 */
export function Line({ width, className = '' }) {
  return (
    <span
      className={`block h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 ${className}`}
      style={{ width }}
    />
  );
}

/**
 * A small tick, for anything a demo marks as done.
 * @param {{className?: string}} props
 */
export function Tick({ className = '' }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
