import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import * as companyApi from '../../api/companies.js';
import CompanyLogo from '../../components/company/CompanyLogo.jsx';
import CompanyForm from './CompanyForm.jsx';
import CompanyStatusBanner from '../../components/company/CompanyStatusBanner.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * The frame around the employer side.
 *
 * My company is the module; the profile and the job posts are sections
 * within it. The company itself is loaded once here and handed down
 * through the router's outlet context, so moving between the two tabs does
 * not refetch it and the header never flickers.
 *
 * Only employer accounts (and the admin) reach this page. With no company
 * it shows the registration form and no tabs, because neither section
 * means anything yet. A company must be approved by the admin before it
 * can post jobs; the banner under the header says where it stands.
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
              : 'Register your company. An admin approves it, then you can post jobs.'}
          </p>
        </div>
      </header>

      <CompanyStatusBanner company={company} />

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!company ? (
        <CompanyForm onSaved={setCompany} />
      ) : (
        <>
          <div className="mt-6">
            {/* The company and a setter go down to both sections (chosen in
                the sidebar): editing the profile must update the header. */}
            <Outlet context={{ company, setCompany, counts, setCounts }} />
          </div>
        </>
      )}
    </div>
  );
}
