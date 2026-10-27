import { Link } from 'react-router-dom';

/**
 * A panel of shortcuts on a dashboard: "Next steps" or "Go to".
 *
 * Each shortcut is a full-width row with an arrow rather than an
 * underlined sentence, so it reads as something to click and has a large
 * target on a phone. Anything passed as `children` (a tip or a warning)
 * is shown under the links.
 *
 * @param {{title: string, links: Array<{to: string, label: string}>,
 *          children?: React.ReactNode}} props
 */
export default function QuickLinks({ title, links, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <h2 className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
        {title}
      </h2>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group flex items-center justify-between gap-3 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
            >
              {link.label}
              <span
                aria-hidden="true"
                className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400"
              >
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {children && <div className="px-5 pb-4 pt-1">{children}</div>}
    </section>
  );
}
