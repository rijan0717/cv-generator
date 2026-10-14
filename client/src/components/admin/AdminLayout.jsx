import { Outlet } from 'react-router-dom';

/**
 * Shared frame for the admin area: a heading, with each page rendered
 * below. The sections (Overview, Users, Companies, All CVs, Activity) are
 * chosen in the sidebar, so they are not repeated here as tabs.
 */
export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Administration
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage accounts, approve companies and review the CVs created in the system.
        </p>
      </header>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
