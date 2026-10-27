import { Link } from 'react-router-dom';

/**
 * A row of headline figures at the top of a dashboard.
 *
 * Each tile is a label, a large number and a short hint. A tile with a `to`
 * is a link to the page behind the figure, and shows a small arrow on
 * hover so it is clear it can be clicked. Numbers use tabular figures, so
 * a row of tiles lines up however many digits each one has.
 *
 * @param {{items: Array<{label: string, value: string|number, hint?: string,
 *          to?: string}>}} props
 */
export default function SummaryTiles({ items }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {item.label}
              </dt>
              {item.to && (
                <span
                  aria-hidden="true"
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400"
                >
                  &rarr;
                </span>
              )}
            </div>
            <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
              {item.value}
            </dd>
            {item.hint && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>
            )}
          </>
        );

        const className =
          'group block rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900';

        return item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className={`${className} transition hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-600`}
          >
            {body}
          </Link>
        ) : (
          <div key={item.label} className={className}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
