import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';

/**
 * The application navigation, as a left sidebar.
 *
 * Modules live here rather than in the header because the list grows: CVs,
 * saved jobs, applications, settings and the admin sections do not fit
 * across the top, and a sidebar can show which area you are in at a glance.
 *
 * @param {{onNavigate?: () => void}} props - Called after a link is
 *   followed, so the mobile drawer can close itself.
 */

/** Small inline icons, so no icon library is needed. */
const ICONS = {
  cvs: 'M6 2h7l5 5v15H6z M13 2v5h5',
  create: 'M12 5v14M5 12h14',
  jobs: 'M3 7h18v13H3z M8 7V4h8v3',
  saved: 'M6 3h12v18l-6-4-6 4z',
  match: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5 M8 11l2 2 4-4',
  rewrite: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  applications: 'M4 4h16v16H4z M8 9h8M8 13h8M8 17h4',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z',
  overview: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z',
  users:
    'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 20a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M18 20a6 6 0 0 0-1-3',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  reports: 'M6 2h9l4 4v16H6z M8 12h8M8 16h5M8 8h4',
  companies: 'M3 21h18 M5 21V7l7-4 7 4v14 M10 12h4M10 16h4',
};

/**
 * One navigation entry.
 * @param {{to: string, icon: string, label: string, end?: boolean,
 *          onNavigate?: () => void}} props
 */
function Item({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        ].join(' ')
      }
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICONS[icon]} />
      </svg>
      {label}
    </NavLink>
  );
}

/**
 * A labelled group of links.
 * @param {{title: string, children: React.ReactNode}} props
 */
function Group({ title, children }) {
  return (
    <div className="mt-6 first:mt-0">
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, isAdmin } = useAuth();

  // What each account sees:
  //   job seeker - CVs, matching, the board, saved jobs, applications
  //   employer   - their company and posts, plus the board (read-only)
  //   admin      - everything a job seeker sees, plus administration,
  //                where companies are reviewed instead of created
  const isJobSeeker = isAdmin || user?.accountType === 'jobseeker';
  const isEmployer = !isAdmin && user?.accountType === 'employer';

  return (
    <nav aria-label="Sections" className="p-4">
      {isJobSeeker && (
        <Group title="My work">
          <Item to="/dashboard" icon="overview" label="Dashboard" end onNavigate={onNavigate} />
          <Item to="/cvs" icon="cvs" label="My CVs" end onNavigate={onNavigate} />
          <Item to="/rewrite" icon="rewrite" label="Rewrite with JD" onNavigate={onNavigate} />
          <Item to="/match-cv" icon="match" label="Match my CV" onNavigate={onNavigate} />
          <Item to="/jobs" icon="jobs" label="Browse jobs" onNavigate={onNavigate} />
          <Item to="/saved-jobs" icon="saved" label="Saved jobs" onNavigate={onNavigate} />
          <Item
            to="/applications"
            icon="applications"
            label="My applications"
            onNavigate={onNavigate}
          />
        </Group>
      )}

      {/* My company is a module of its own rather than an account
          setting: it has sections beneath it, and a post belongs to the
          company that made it. */}
      {isEmployer && (
        <Group title="My company">
          <Item to="/company" icon="overview" label="Dashboard" end onNavigate={onNavigate} />
          <Item
            to="/company/profile"
            icon="companies"
            label="Company profile"
            onNavigate={onNavigate}
          />
          <Item to="/company/posts" icon="jobs" label="My posts" onNavigate={onNavigate} />
          {/* Shown even while the company is waiting for approval. The
              page explains the wait, which is more use to the employer
              than a link that is simply missing with no reason given. */}
          <Item to="/talent" icon="users" label="Find candidates" onNavigate={onNavigate} />
          <Item to="/jobs" icon="jobs" label="Browse jobs" onNavigate={onNavigate} />
        </Group>
      )}

      {isAdmin && (
        <Group title="Administration">
          <Item to="/admin" icon="overview" label="Overview" end onNavigate={onNavigate} />
          <Item to="/admin/users" icon="users" label="Users" onNavigate={onNavigate} />
          <Item to="/talent" icon="profile" label="People directory" onNavigate={onNavigate} />
          <Item to="/admin/companies" icon="companies" label="Companies" onNavigate={onNavigate} />
          <Item to="/admin/cvs" icon="cvs" label="All CVs" onNavigate={onNavigate} />
          <Item to="/admin/reports" icon="reports" label="Reports" onNavigate={onNavigate} />
          <Item to="/admin/activity" icon="activity" label="Activity" onNavigate={onNavigate} />
        </Group>
      )}

      {/* Account sits last for every kind of account. The work a person
          came to do belongs at the top; their own settings are the thing
          they reach for least, and keeping them in the same place for
          everybody means they are never hunted for. */}
      <Group title="Account">
        <Item to="/profile" icon="profile" label="Profile" onNavigate={onNavigate} />
        <Item to="/settings" icon="settings" label="Settings" onNavigate={onNavigate} />
      </Group>
    </nav>
  );
}
