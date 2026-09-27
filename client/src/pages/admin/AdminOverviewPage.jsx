import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import { getTemplate } from '../../templates/index.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * The admin overview.
 *
 * This is the KPI half of the business-intelligence dashboard. The charts
 * (registrations per month, score distribution, skill gaps) come later in
 * Phase 6 with Recharts; the numbers here already come from MongoDB
 * aggregation pipelines.
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
      <div className="grid min-h-[30vh] place-items-center text-slate-500">
        <Spinner label="Loading statistics" />
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  const totalDownloads = Object.values(stats.downloads).reduce((sum, n) => sum + n, 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users.total} hint={`${stats.users.active} active`} />
        <StatCard label="Blocked" value={stats.users.blocked} hint="accounts" />
        <StatCard label="CVs" value={stats.cvs.total} hint={`${stats.cvs.deleted} deleted`} />
        <StatCard label="Downloads" value={totalDownloads} hint="all formats" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Template popularity</h2>

          {stats.templateUsage.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No CVs have been created yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.templateUsage.map((row) => {
                const highest = stats.templateUsage[0].count;
                const percent = Math.round((row.count / highest) * 100);

                return (
                  <li key={row.templateKey}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">{getTemplate(row.templateKey).name}</span>
                      <span className="text-slate-500">{row.count}</span>
                    </div>
                    {/* A simple bar. Recharts arrives with the full dashboard. */}
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Downloads by format</h2>

          {totalDownloads === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing has been downloaded yet.</p>
          ) : (
            <dl className="mt-4 space-y-2 text-sm">
              {Object.entries(stats.downloads).map(([action, count]) => (
                <div key={action} className="flex justify-between">
                  <dt className="text-slate-600">{action.replace('DOWNLOAD_', '')}</dt>
                  <dd className="font-medium text-slate-900">{count}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-5 flex gap-3 border-t border-slate-200 pt-4 text-sm">
            <Link to="/admin/users" className="font-medium text-slate-900 underline">
              Manage users
            </Link>
            <Link to="/admin/cvs" className="font-medium text-slate-900 underline">
              Browse all CVs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * One KPI tile.
 * @param {{label: string, value: number, hint: string}} props
 */
function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
