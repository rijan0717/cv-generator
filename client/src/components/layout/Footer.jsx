import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/useNavigation.js';
import BrandMark from '../ui/BrandMark.jsx';

/**
 * Page footer: the logo and one row of destinations, then a thin legal
 * line underneath.
 *
 * It is deliberately horizontal rather than four stacked columns. The site
 * has about a dozen public pages, which is too few to fill columns without
 * padding them out, and a single row reads as a site map at a glance.
 * Below `md` the row becomes a wrapped list, which is the same thing with
 * line breaks rather than a different layout to maintain.
 *
 * The admin's published pages are appended to the main row rather than
 * given a column of their own, so a footer with nothing published in it
 * still looks finished.
 */

/** Contact details shown beside the copyright. Replace with real ones. */
const CONTACT = {
  email: 'rijanxshishir@gmail.com',
  location: 'Kathmandu, Nepal',
};

/**
 * The main row: the parts of the application itself.
 *
 * Written here rather than being links an admin could delete, because the
 * footer going half empty is not a content decision.
 */
const MAIN = [
  { label: 'Build a CV', to: '/features/cv-builder' },
  { label: 'Templates', to: '/features/templates' },
  { label: 'Rewrite for a job', to: '/features/rewrite' },
  { label: 'Score my CV', to: '/features/cv-score' },
  { label: 'Interview prep', to: '/features/interview-prep' },
  { label: 'Jobs', to: '/jobs' },
  { label: 'Post a job', to: '/features/post-a-job' },
  { label: 'Find candidates', to: '/features/find-candidates' },
  { label: 'Blog', to: '/blog' },
];

/** The quieter row on the right of the legal line. */
const SECONDARY = [
  { label: 'Log in', to: '/login' },
  { label: 'Sign up', to: '/register' },
  { label: 'Status', to: '/health' },
];

/**
 * The social accounts.
 *
 * `href` is the project's own GitHub; the rest have no account yet, so
 * they are left out entirely rather than linked to a profile that does not
 * exist. An icon that goes nowhere is worse than no icon.
 */
const SOCIAL = [
  {
    label: 'GitHub',
    href: 'https://github.com/rijan0717/cv-generator-MERN',
    path: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2z',
  },
];

const linkClass =
  'text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';

const quietClass =
  'text-xs text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';

export default function Footer() {
  const { footer: pages } = useNavigation();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" aria-label="SmartCV, home" className="shrink-0">
            <BrandMark size="md" />
          </Link>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-7 gap-y-3">
              {MAIN.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}

              {/* Whatever the admin has published for the footer. */}
              {pages.map((link) => (
                <li key={link.id}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="flex shrink-0 gap-4">
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
                    fill="currentColor"
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
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} SmartCV &mdash; Rijan Pariyar &amp; Shishir Thapa ·{' '}
            <a
              href={`mailto:${CONTACT.email}`}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {CONTACT.email}
            </a>{' '}
            · {CONTACT.location}
          </p>

          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {SECONDARY.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className={quietClass}>
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
