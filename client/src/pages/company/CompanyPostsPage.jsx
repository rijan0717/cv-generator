import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import JobForm from './JobForm.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * My posts: every job this company has advertised, and the form for
 * adding another.
 *
 * A section of the company module rather than a page of its own — a post
 * only exists because a company posted it, and the applicant list hangs
 * off a post in turn.
 */
export default function CompanyPostsPage() {
  const { setCounts } = useOutletContext();

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const myJobs = await jobApi.listMyJobs();
        if (!cancelled) setJobs(myJobs);
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
      <div className="grid min-h-[20vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your posts" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Your postings <span className="text-slate-500">({jobs.length})</span>
        </h2>
        <Button size="sm" onClick={() => setIsPosting((open) => !open)}>
          {isPosting ? 'Cancel' : 'Post a job'}
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isPosting && (
        <div className="mt-4">
          <JobForm
            onPosted={(job) => {
              setJobs((current) => [job, ...current]);
              // The header above counts posts, so it has to hear about this.
              setCounts((current) => ({ ...current, jobCount: current.jobCount + 1 }));
              setIsPosting(false);
            }}
          />
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You have not posted any jobs yet.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {jobs.map((job) => (
            <li
              key={job._id}
              className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/jobs/${job._id}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  {job.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {job.jobType}
                  {job.location && <> &middot; {job.location}</>} &middot; posted{' '}
                  {new Date(job.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>

              <span
                className={
                  job.status === 'open'
                    ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }
              >
                {job.status}
              </span>

              <Link to={`/company/posts/${job._id}/applicants`}>
                <Button size="sm" variant="secondary">
                  {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
