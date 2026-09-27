import { NavLink, Outlet } from 'react-router-dom';

/** The admin sections. Reports and templates arrive later in Phase 6. */
const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/cvs', label: 'CVs' },
  { to: '/admin/activity', label: 'Activity' },
];

/**
 * Shared frame for the admin area: a heading and the section tabs, with each
 * page rendered below.
 */
export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Administration
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage accounts and review the CVs created in the system.
        </p>
      </header>

      <nav
        className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3"
        aria-label="Admin"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              [
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
