import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/useNavigation.js';
import BrandMark from '../ui/BrandMark.jsx';

/**
 * Page footer.
 *
 * The logo, a sentence saying what the site is and the social accounts on
 * the left; three columns of destinations on the right; then a rule, and a
 * thin line carrying the copyright and the legal links.
 *
 * Columns rather than the single wrapped row it was before, because the
 * site now has three distinct audiences — somebody looking for work,
 * somebody hiring, and somebody reading — and a flat row of fourteen links
 * makes the reader sort them into those groups themselves.
 *
 * On a phone the columns stack and the two halves of the legal line sit
 * one above the other, which is the same layout with the flex direction
 * flipped rather than a second design to keep in step.
 */

/**
 * The three columns.
 *
 * Written here rather than being links an admin could delete, because the
 * footer going half empty is not a content decision. Anything the admin
 * publishes for the footer is appended to "Explore", which is where an
 * About or a Privacy page belongs.
 */
const COLUMNS = [
  {
    heading: 'Get hired',
    links: [
      { label: 'Build a CV', to: '/features/cv-builder' },
      { label: 'Templates', to: '/features/templates' },
      { label: 'Rewrite for a job', to: '/features/rewrite' },
      { label: 'Browse jobs', to: '/jobs' },
    ],
  },
  {
    heading: 'Hire talent',
    links: [
      { label: 'Post a job', to: '/features/post-a-job' },
      { label: 'Find candidates', to: '/features/find-candidates' },
      { label: 'Track applicants', to: '/features/applicant-tracking' },
    ],
  },
  {
    heading: 'Explore',
    links: [
      { label: 'Score my CV', to: '/features/cv-score' },
      { label: 'Interview prep', to: '/features/interview-prep' },
      { label: 'Blog', to: '/blog' },
    ],
  },
];

/** The links on the right of the legal line. */
const LEGAL = [
  { label: 'Log in', to: '/login' },
  { label: 'Sign up', to: '/register' },
  { label: 'Status', to: '/health' },
];

/**
 * The social accounts.
 *
 * Only the ones that exist. The project's GitHub is real; an icon linking
 * to a profile nobody has created is worse than no icon, so the rest of
 * the usual row is left out rather than stubbed.
 */
const SOCIAL = [
  {
    label: 'GitHub',
    href: 'https://github.com/rijan0717/cv-generator-MERN',
    path: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2z',
  },
  {
    label: 'The author’s site',
    href: 'https://rijan-pariyar.com.np/',
    path: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
    outline: true,
  },
];

const linkClass =
  'text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';

export default function Footer() {
  const { footer: pages } = useNavigation();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[22rem_1fr]">
          {/* --- Who we are --- */}
          <div>
            <Link to="/" aria-label="SmartCV, home" className="inline-block">
              <BrandMark size="md" />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              SmartCV helps you write a CV worth reading, score it against the job you want, and
              apply with the version that fits — free, and without a watermark.
            </p>

            <ul className="mt-6 flex gap-4">
              {SOCIAL.map((account) => (
                <li key={account.label}>
                  <a
                    href={account.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill={account.outline ? 'none' : 'currentColor'}
                      stroke={account.outline ? 'currentColor' : undefined}
                      strokeWidth={account.outline ? 1.7 : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={account.path} />
                    </svg>
                    <span className="sr-only">{account.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* --- Where to go --- */}
          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{column.heading}</p>

                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  {/* The admin's published pages join the last column, so a
                      footer with nothing published still looks finished. */}
                  {column.heading === 'Explore' &&
                    pages.map((link) => (
                      <li key={link.id}>
                        <Link to={link.to} className={linkClass}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* --- The legal line --- */}
        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} SmartCV &mdash;{' '}
            <a
              href="https://rijan-pariyar.com.np/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Rijan Pariyar
            </a>
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-sm text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
