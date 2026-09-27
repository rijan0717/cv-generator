import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as applicationApi from '../../api/applications.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatusBadge from '../../components/jobs/StatusBadge.jsx';

/**
 * The applications this user has submitted.
 *
 * Withdrawing is the only status change an applicant may make; every
 * other transition belongs to the employer, and the server enforces it.
 */
export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    applicationApi
      .listMyApplications()
      .then((list) => {
        if (!cancelled) setApplications(list);
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

  /**
   * Withdraws an application after confirming, since it cannot be undone.
   * @param {object} application - The application to withdraw.
   */
  async function withdraw(application) {
    if (!window.confirm('Withdraw this application? The employer will see it as withdrawn.')) {
      return;
    }

    setBusyId(application._id);
    setError('');

    try {
      await applicationApi.updateApplicationStatus(application._id, { status: 'withdrawn' });
      setApplications((current) =>
        current.map((row) => (row._id === application._id ? { ...row, status: 'withdrawn' } : row)),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          My applications
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Jobs you have applied for, and where each one stands.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading applications" />
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            You have not applied for anything yet
          </h2>
          <Link to="/jobs" className="mt-6 inline-block">
            <Button>Browse jobs</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {applications.map((application) => (
            <li
              key={application._id}
              className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-slate-900 dark:text-slate-100">
                  {application.job?.isDeleted ? (
                    application.job.title
                  ) : (
                    <Link to={`/jobs/${application.job?._id}`} className="hover:underline">
                      {application.job?.title ?? 'A job'}
                    </Link>
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {application.job?.company?.name}
                  {' · applied '}
                  {new Date(application.createdAt).toLocaleDateString('en-GB')}
                  {application.job?.isDeleted && ' · this posting has been removed'}
                </p>
              </div>

              <StatusBadge status={application.status} />

              {application.status !== 'withdrawn' && (
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={busyId === application._id}
                  onClick={() => withdraw(application)}
                >
                  Withdraw
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
