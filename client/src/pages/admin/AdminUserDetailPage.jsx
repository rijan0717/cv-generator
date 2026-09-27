import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * One user, with the CVs they have created and their recent activity.
 *
 * This is the page that answers "what has this person actually done", which
 * is what an admin needs before blocking an account or removing a CV.
 */
export default function AdminUserDetailPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getUser(id)
      .then((result) => {
        if (!cancelled) setData(result);
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
  }, [id]);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading user" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert variant="error">{error}</Alert>
        <Link to="/admin/users" className="mt-4 inline-block">
          <Button variant="secondary">Back to users</Button>
        </Link>
      </div>
    );
  }

  const { user, cvs, recentActivity } = data;

  return (
    <div>
      <Link
        to="/admin/users"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      >
        &larr; All users
      </Link>

      {/* Account summary */}
      <section className="mt-3 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xl font-semibold text-slate-500 dark:text-slate-400"
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {user.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
              {user.role}
            </span>
            <span
              className={
                user.status === 'blocked'
                  ? 'rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700'
                  : 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700'
              }
            >
              {user.status}
            </span>
          </div>
        </div>
      </section>

      {/* Their CVs */}
      <section className="mt-5">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          CVs <span className="text-slate-500 dark:text-slate-400">({cvs.length})</span>
        </h3>

        {cvs.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            This user has not created any CVs.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cvs.map((cv) => (
              <li
                key={cv._id}
                className="flex flex-wrap items-center gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/cvs/${cv._id}`}
                    className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                  >
                    {cv.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {cv.templateKey} &middot; updated{' '}
                    {new Date(cv.updatedAt).toLocaleDateString('en-GB')}
                  </p>
                </div>

                <Link to={`/admin/cvs/${cv._id}`}>
                  <Button size="sm" variant="secondary">
                    View
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section className="mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent activity</h3>

        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
            {recentActivity.map((entry) => (
              <li key={entry._id} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {entry.action}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(entry.createdAt).toLocaleString('en-GB')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
