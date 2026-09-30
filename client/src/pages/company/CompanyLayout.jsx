import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import * as companyApi from '../../api/companies.js';
import CompanyLogo from '../../components/company/CompanyLogo.jsx';
import CompanyForm from './CompanyForm.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The sections inside the company module. */
const TABS = [
  { to: '/company', label: 'Company profile', end: true },
  { to: '/company/posts', label: 'My posts' },
];

/**
 * The frame around the employer side.
 *
 * My company is the module; the profile and the job posts are sections
 * within it. The company itself is loaded once here and handed down
 * through the router's outlet context, so moving between the two tabs does
 * not refetch it and the header never flickers.
 *
 * Creating a company is what lets a user post, so anyone can reach this
 * page: with no company it shows the set-up form and no tabs, because
 * neither section means anything yet.
 */
export default function CompanyLayout() {
  const [company, setCompany] = useState(null);
  const [counts, setCounts] = useState({ jobCount: 0, applicationCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await companyApi.getMyCompany();
        if (cancelled) return;

        setCompany(data.company);
        setCounts({
          jobCount: data.jobCount ?? 0,
          applicationCount: data.applicationCount ?? 0,
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your company" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-center gap-4">
        {company && <CompanyLogo company={company} size="lg" />}

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {company ? company.name : 'Set up your company'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {company
              ? [
                  company.industry,
                  company.location,
                  `${counts.jobCount} post${counts.jobCount === 1 ? '' : 's'}`,
                  `${counts.applicationCount} applicant${counts.applicationCount === 1 ? '' : 's'}`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Create a company profile, then you can post jobs for others to apply to.'}
          </p>
        </div>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!company ? (
        <CompanyForm onSaved={setCompany} />
      ) : (
        <>
          <nav
            className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700"
            aria-label="My company"
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
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6">
            {/* The company and a setter go down to both tabs: editing the
                profile in one must update the header rendered here. */}
            <Outlet context={{ company, setCompany, counts, setCounts }} />
          </div>
        </>
      )}
    </div>
  );
}
