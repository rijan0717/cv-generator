import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as applicationApi from '../../api/applications.js';
import { useToast } from '../../context/useToast.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import StatusBadge from '../../components/jobs/StatusBadge.jsx';

/**
 * The applications this user has submitted.
 *
 * Withdrawing is the only status change an applicant may make; every
 * other transition belongs to the employer, and the server enforces it.
 */
export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    applicationApi
      .listMyApplications({ page })
      .then((data) => {
        if (cancelled) return;
        setApplications(data.applications);
        setPagination(data.pagination);
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
  }, [page]);

  /**
   * Withdraws an application after confirming, since it cannot be undone.
   * @param {object} application - The application to withdraw.
   */
  async function withdraw(application) {
    if (!window.confirm('Withdraw this application? The employer will see it as withdrawn.')) {
      return;
    }

    setBusyId(application._id);

    try {
      await applicationApi.updateApplicationStatus(application._id, { status: 'withdrawn' });
      setApplications((current) =>
        current.map((row) => (row._id === application._id ? { ...row, status: 'withdrawn' } : row)),
      );
      toast.success('Your application has been withdrawn.');
    } catch (err) {
      toast.error(err.message);
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

              {/*
                The CV is what the employer is actually judging, and until
                now the applicant had no way to see which one they sent.
                It matters most here: a user who tailors a CV per advert
                has several near-identical documents, and "which one did
                they get?" is not a question they can answer from memory.

                It opens in a new tab so this list keeps its page and
                scroll position, and so two applications can be compared
                side by side. A plain anchor rather than a router link,
                because `target` only does this on a real navigation.
              */}
              <Button
                as="a"
                href={`/applications/${application._id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                variant="secondary"
              >
                View CV
              </Button>

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

      {!isLoading && applications.length > 0 && (
        <Pagination pagination={pagination} onChange={setPage} label="applications" />
      )}
    </div>
  );
}
