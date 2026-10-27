import { Link } from 'react-router-dom';

/**
 * "What has arrived lately": a short list of the newest few of
 * something, with a link to the full list.
 *
 * Every dashboard on the system uses this, so the three roles read the
 * same way, and — the part that matters — an empty one says plainly
 * that there is nothing rather than collapsing to a blank panel. "No
 * posts yet" is information; an empty box is a page that looks broken.
 *
 * @param {{title: string, items: Array<{id: string, primary: string,
 *          secondary?: string, meta?: string, to?: string}>,
 *          emptyMessage: string, emptyAction?: {label: string, to: string},
 *          viewAll?: {label: string, to: string}}} props
 */
export default function RecentList({ title, items, emptyMessage, emptyAction, viewAll }) {
  return (
    <section className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {viewAll && items.length > 0 && (
          <Link
            to={viewAll.to}
            className="text-sm text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {viewAll.label}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">{emptyMessage}</p>
          {emptyAction && (
            <Link
              to={emptyAction.to}
              className="mt-2 text-sm font-medium text-slate-900 underline dark:text-slate-100"
            >
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                {item.to ? (
                  <Link
                    to={item.to}
                    className="truncate font-medium text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {item.primary}
                  </Link>
                ) : (
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {item.primary}
                  </p>
                )}
                {item.secondary && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.secondary}
                  </p>
                )}
              </div>
              {item.meta && (
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {item.meta}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
