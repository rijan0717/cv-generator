import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import SummaryTiles from '../../components/ui/SummaryTiles.jsx';
import RecentList from '../../components/ui/RecentList.jsx';

/** A date as the rest of the application writes it. */
const asDate = (value) => new Date(value).toLocaleDateString('en-GB');

/**
 * The admin overview.
 *
 * A summary, not an analysis: how big the system is, what is waiting to
 * be reviewed, and what has arrived lately. Everything with a trend or a
 * distribution in it lives in Reports, where it can be filtered by date
 * and exported — a dashboard that tries to do both ends up doing
 * neither, and nobody reads a chart to find out that one company is
 * waiting for approval.
 */
export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
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
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading the dashboard" />
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  const totalDownloads = Object.values(stats.downloads).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <SummaryTiles
        items={[
          {
            label: 'Users',
            value: stats.users.total,
            hint: `${stats.users.active} active · ${stats.users.blocked} blocked`,
            to: '/admin/users',
          },
          {
            label: 'CVs',
            value: stats.cvs.total,
            hint: `average strength ${stats.cvs.averageScore} / 100`,
            to: '/admin/cvs',
          },
          {
            // The one tile that is a job rather than a fact, so it says
            // so instead of printing a bare zero.
            label: 'Awaiting review',
            value: stats.companies.pending,
            hint:
              stats.companies.pending === 0
                ? 'no companies waiting'
                : 'companies need approving',
            to: '/admin/companies',
          },
          {
            label: 'Downloads',
            value: totalDownloads,
            hint: `${stats.jobs.open} jobs open on the board`,
            to: '/admin/reports',
          },
        ]}
      />

      {/* `items-start` so each panel is as tall as its own contents. A
          stretched grid would pad a one-row list out to the height of a
          five-row one, which reads as a panel that failed to load. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <RecentList
          title="Companies to review"
          items={stats.latest.companiesToReview.map((company) => ({
            id: company.id,
            primary: company.name,
            secondary: company.detail,
            meta: asDate(company.submittedAt),
            to: '/admin/companies',
          }))}
          emptyMessage="Nothing is waiting for approval."
          viewAll={{ label: 'All companies', to: '/admin/companies' }}
        />

        <RecentList
          title="Newest accounts"
          items={stats.latest.users.map((user) => ({
            id: user.id,
            primary: user.name,
            secondary: `${user.email} · ${user.role}`,
            meta: asDate(user.createdAt),
            to: `/admin/users/${user.id}`,
          }))}
          emptyMessage="Nobody has registered yet."
          viewAll={{ label: 'All users', to: '/admin/users' }}
        />

        <RecentList
          title="Newest CVs"
          items={stats.latest.cvs.map((cv) => ({
            id: cv.id,
            primary: cv.title,
            secondary: `${cv.owner} · strength ${cv.strengthScore}/100`,
            meta: asDate(cv.createdAt),
            to: `/admin/cvs/${cv.id}`,
          }))}
          emptyMessage="No CVs have been created yet."
          viewAll={{ label: 'All CVs', to: '/admin/cvs' }}
        />

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Go to</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { to: '/admin/users', label: 'Manage users' },
              { to: '/admin/companies', label: 'Review companies' },
              { to: '/admin/cvs', label: 'Browse all CVs' },
              { to: '/admin/reports', label: 'Reports and exports' },
              { to: '/admin/activity', label: 'Activity log' },
            ].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="font-medium text-slate-900 underline dark:text-slate-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
