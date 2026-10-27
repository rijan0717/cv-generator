import { Link } from 'react-router-dom';

/**
 * A row of plain numbers at the top of a dashboard.
 *
 * Deliberately not charts. The question each of these answers is "how
 * many", and a number answers it faster than any drawing of a number
 * can. Anything that needs a trend or a distribution belongs in Reports,
 * where it can be filtered by date and exported.
 *
 * A tile with a `to` becomes a link, so a count that is really a job to
 * do — companies waiting for review — can be acted on where it is read.
 *
 * @param {{items: Array<{label: string, value: number|string,
 *          hint?: string, to?: string}>}} props
 */
export default function SummaryTiles({ items }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const body = (
          <>
            <dt className="text-sm text-slate-500 dark:text-slate-400">{item.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {item.value}
            </dd>
            {item.hint && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>
            )}
          </>
        );

        const className =
          'block rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700';

        return item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className={`${className} transition hover:ring-slate-400 dark:hover:ring-slate-500`}
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
