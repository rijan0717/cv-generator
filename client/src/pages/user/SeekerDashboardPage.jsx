import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import * as applicationApi from '../../api/applications.js';
import * as jobApi from '../../api/jobs.js';
import { useAuth } from '../../context/useAuth.js';
import { getTemplate } from '../../templates/index.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import SummaryTiles from '../../components/ui/SummaryTiles.jsx';
import RecentList from '../../components/ui/RecentList.jsx';
import QuickLinks from '../../components/ui/QuickLinks.jsx';

/** A date as the rest of the application writes it. */
const asDate = (value) => new Date(value).toLocaleDateString('en-GB');

/**
 * The job seeker's dashboard.
 *
 * A summary of their own work: how many CVs they have, what they have
 * applied for, what they have saved, and how strong the CV employers
 * actually see is. The full lists each live on their own page; this one
 * answers "where am I" in a glance and says plainly when the answer is
 * "you have not started yet".
 *
 * Everything is fetched in one parallel round. A section whose request
 * fails shows as empty rather than taking the whole page down with it:
 * a saved-jobs outage is no reason to hide somebody's CVs.
 */
export default function SeekerDashboardPage() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      cvApi.listCVs({ page: 1, limit: 100 }).catch(() => null),
      applicationApi.listMyApplications({ page: 1, limit: 5 }).catch(() => null),
      jobApi.listSavedJobs().catch(() => null),
    ])
      .then(([cvs, applications, saved]) => {
        if (cancelled) return;

        const savedJobs = Array.isArray(saved) ? saved : (saved?.jobs ?? []);

        setData({
          cvs: cvs?.cvs ?? [],
          cvTotal: cvs?.pagination?.total ?? 0,
          applications: applications?.applications ?? [],
          applicationTotal: applications?.pagination?.total ?? 0,
          savedJobs,
        });

        if (!cvs) setError('Some of your details could not be loaded. Try refreshing the page.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your dashboard" />
      </div>
    );
  }

  const primary = data.cvs.find((cv) => cv.isPrimary);

  // Newest first. The list endpoint already sorts this way, but the
  // dashboard should not depend on that to stay true.
  const recentCvs = [...data.cvs]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {/* The first name only: the full one is already in the bar above. */}
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your CVs, applications and saved jobs at a glance.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-6">
        <SummaryTiles
          items={[
            {
              label: 'My CVs',
              value: data.cvTotal,
              hint: data.cvTotal === 0 ? 'none yet' : 'in your account',
              to: '/cvs',
            },
            {
              label: 'Applications',
              value: data.applicationTotal,
              hint: data.applicationTotal === 0 ? 'none sent yet' : 'sent to employers',
              to: '/applications',
            },
            {
              label: 'Saved jobs',
              value: data.savedJobs.length,
              hint: data.savedJobs.length === 0 ? 'nothing saved yet' : 'kept for later',
              to: '/saved-jobs',
            },
            {
              label: 'Primary CV',
              value: primary ? `${primary.strengthScore ?? 0}/100` : '—',
              hint: primary ? 'the CV employers see' : 'none chosen yet',
              to: '/cvs',
            },
          ]}
        />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <RecentList
          title="Your CVs"
          items={recentCvs.map((cv) => ({
            id: cv.id ?? cv._id,
            primary: cv.title,
            secondary: `${getTemplate(cv.templateKey).name} · strength ${cv.strengthScore ?? 0}/100${
              cv.isPrimary ? ' · primary' : ''
            }`,
            meta: asDate(cv.updatedAt),
            to: `/cvs/${cv.id ?? cv._id}`,
          }))}
          emptyMessage="You have not created a CV yet."
          emptyAction={{ label: 'Create your first CV', to: '/cvs' }}
          viewAll={{ label: 'All CVs', to: '/cvs' }}
        />

        <RecentList
          title="Recent applications"
          items={data.applications.map((application) => ({
            id: application._id,
            primary: application.job?.title ?? 'A job',
            secondary: `${application.job?.company?.name ?? 'A company'} · ${application.status}`,
            meta: asDate(application.createdAt),
            to: '/applications',
          }))}
          emptyMessage="You have not applied for anything yet."
          emptyAction={{ label: 'Browse jobs', to: '/jobs' }}
          viewAll={{ label: 'All applications', to: '/applications' }}
        />

        <RecentList
          title="Saved jobs"
          items={data.savedJobs.slice(0, 5).map((job) => ({
            id: job.id ?? job._id,
            primary: job.title,
            secondary: [job.company?.name, job.location].filter(Boolean).join(' · '),
            meta: job.jobType,
            to: `/jobs/${job.id ?? job._id}`,
          }))}
          emptyMessage="You have not saved any jobs."
          emptyAction={{ label: 'Browse jobs', to: '/jobs' }}
          viewAll={{ label: 'All saved jobs', to: '/saved-jobs' }}
        />

        <QuickLinks
          title="Next steps"
          links={[
            { to: '/cvs', label: 'Create or edit a CV' },
            { to: '/match-cv', label: 'Check a CV against a job' },
            { to: '/rewrite', label: 'Rewrite your CV for an advert' },
            { to: '/profile', label: 'Update your candidate profile' },
          ]}
        >
          {/* The one piece of advice worth putting on the page: an
              employer browsing the directory only ever sees the primary
              CV, and a candidate with none shows up with nothing. */}
          {!primary && data.cvTotal > 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              No CV is marked as primary, so employers browsing candidates see none of your work.
              Set one on the{' '}
              <Link to="/cvs" className="underline">
                My CVs
              </Link>{' '}
              page.
            </p>
          )}
        </QuickLinks>
      </div>
    </div>
  );
}
