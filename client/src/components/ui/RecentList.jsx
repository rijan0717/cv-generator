import { Link } from 'react-router-dom';

/**
 * A short list of recent items on a dashboard, with a link to the full
 * list.
 *
 * Each row is a title, a line of detail and a small piece of metadata on
 * the right (usually a date). A row with a `to` is clickable across its
 * whole width, not only on the title, and highlights on hover. When there
 * is nothing to show, the panel says so and offers the next step rather
 * than sitting empty.
 *
 * @param {{title: string,
 *          items: Array<{id: string, primary: string, secondary?: string,
 *                        meta?: string, to?: string}>,
 *          emptyMessage: string,
 *          emptyAction?: {label: string, to: string},
 *          viewAll?: {label: string, to: string}}} props
 */
export default function RecentList({ title, items, emptyMessage, emptyAction, viewAll }) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {viewAll && items.length > 0 && (
          <Link
            to={viewAll.to}
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            {viewAll.label}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">{emptyMessage}</p>
          {emptyAction && (
            <Link
              to={emptyAction.to}
              className="mt-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const row = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {item.primary}
                  </p>
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
              </>
            );

            return (
              <li key={item.id}>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
