/**
 * One feature explained, with an illustration beside it.
 *
 * Rows alternate sides down the page. The reversal is done with a CSS
 * order change rather than by swapping the children, so the heading
 * always comes before the illustration in the document — a screen reader
 * gets a consistent reading order however the page is laid out.
 *
 * @param {{eyebrow?: string, title: string, children: React.ReactNode,
 *          points?: string[], reverse?: boolean,
 *          illustration: React.ReactNode}} props
 */
export default function FeatureRow({
  eyebrow,
  title,
  children,
  points = [],
  reverse = false,
  illustration,
}) {
  return (
    <div className="grid items-center gap-8 py-10 sm:gap-10 sm:py-14 lg:grid-cols-2 lg:gap-16">
      <div className={`min-w-0 ${reverse ? 'lg:order-2' : ''}`}>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {eyebrow}
          </p>
        )}

        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h3>

        <div className="mt-3 text-slate-600 dark:text-slate-400">{children}</div>

        {points.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`min-w-0 ${reverse ? 'lg:order-1' : ''}`}>{illustration}</div>
    </div>
  );
}
