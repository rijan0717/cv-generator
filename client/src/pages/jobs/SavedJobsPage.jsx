import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import JobCard from '../../components/jobs/JobCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * The jobs this user has bookmarked.
 *
 * A job whose posting has since been removed is filtered out by the
 * server, so the list never shows a dead row.
 */
export default function SavedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    jobApi
      .listSavedJobs()
      .then((list) => {
        if (!cancelled) setJobs(list.map((job) => ({ ...job, isSaved: true })));
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
   * Unsaves a job and drops it from the list.
   * @param {object} job - The job to remove.
   */
  async function remove(job) {
    setRemovingId(job._id);
    setError('');

    try {
      await jobApi.unsaveJob(job._id);
      setJobs((current) => current.filter((row) => row._id !== job._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Saved jobs
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Jobs you have bookmarked to come back to.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading saved jobs" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Use the bookmark on a job to keep it here.
          </p>
          <Link to="/jobs" className="mt-6 inline-block">
            <Button>Browse jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              isSaving={removingId === job._id}
              onToggleSave={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
