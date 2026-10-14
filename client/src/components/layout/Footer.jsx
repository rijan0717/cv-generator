import { Link } from 'react-router-dom';

/**
 * Page footer: a short description on the left, link columns in the middle
 * and contact details on the right. Stacks into one column on phones.
 */

/** Contact details shown in the "Contact us" column. Replace with real ones. */
const CONTACT = {
  email: 'rijanxshishir@gmail.com',
  location: 'Kathmandu, Nepal',
};

/** The link columns, in display order. */
const LINK_GROUPS = [
  {
    heading: 'Explore',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'Match my CV', to: '/match-cv' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Blogs', to: '/blog' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
];

const linkClass = 'hover:text-slate-900 dark:hover:text-slate-100';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="grid gap-8 px-4 py-12 sm:px-8 lg:px-20 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-400">
        {/* About the site */}
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">Smart CV Generator</p>
          <p className="mt-3">
            Build a professional CV, check its strength and find the jobs that match you.
          </p>
        </div>

        {/* Link columns */}
        {LINK_GROUPS.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{group.heading}</p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Contact, on the right from large screens up */}
        <div className="lg:text-right">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Contact us</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                {CONTACT.email}
              </a>
            </li>
            <li>{CONTACT.phone}</li>
            <li>{CONTACT.location}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700">
        <p className="px-4 py-4 text-xs sm:px-8 lg:px-20 text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Smart CV Generator &mdash; Rijan Pariyar & Shishir Thapa
        </p>
      </div>
    </footer>
  );
}
