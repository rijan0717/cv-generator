import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import { useAuth } from '../../context/useAuth.js';
import JobCard from '../../components/jobs/JobCard.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

/**
 * The public job board.
 *
 * Every job posted by any company is listed here and is visible to every
 * user, signed in or not. Signing in adds the saved and applied flags;
 * it is not required to browse.
 */
export default function JobsPage() {
  const { isAuthenticated } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    workMode: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await jobApi.listJobs({
        page,
        search: filters.search || undefined,
        location: filters.location || undefined,
        jobType: filters.jobType || undefined,
        workMode: filters.workMode || undefined,
      });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Changes a filter and returns to page one, since the current page may
   * not exist in the narrowed results.
   * @param {string} field
   * @param {string} value
   */
  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  /**
   * Saves or unsaves a job, updating the row optimistically so the
   * bookmark responds immediately.
   * @param {object} job
   */
  async function toggleSave(job) {
    setSavingId(job._id);
    const wasSaved = job.isSaved;

    setJobs((current) =>
      current.map((row) => (row._id === job._id ? { ...row, isSaved: !wasSaved } : row)),
    );

    try {
      if (wasSaved) await jobApi.unsaveJob(job._id);
      else await jobApi.saveJob(job._id);
    } catch (err) {
      // Put it back if the server disagreed.
      setJobs((current) =>
        current.map((row) => (row._id === job._id ? { ...row, isSaved: wasSaved } : row)),
      );
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Jobs
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every job posted on the platform. Apply with one of your CVs.
          </p>
        </div>

        {isAuthenticated && (
          <Link to="/company">
            <Button variant="secondary" size="sm">
              Post a job
            </Button>
          </Link>
        )}
      </header>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:bg-slate-900 dark:ring-slate-700">
        <div className="sm:col-span-2">
          <label
            htmlFor="job-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Search
          </label>
          <input
            id="job-search"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Title, description or skill"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="job-location"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Location
          </label>
          <input
            id="job-location"
            value={filters.location}
            onChange={(e) => setFilter('location', e.target.value)}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="job-type"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Type
            </label>
            <select
              id="job-type"
              value={filters.jobType}
              onChange={(e) => setFilter('jobType', e.target.value)}
              className="mt-1 w-full rounded-lg border-0 py-2 pl-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            >
              <option value="">Any</option>
              {JOB_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="work-mode"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Mode
            </label>
            <select
              id="work-mode"
              value={filters.workMode}
              onChange={(e) => setFilter('workMode', e.target.value)}
              className="mt-1 w-full rounded-lg border-0 py-2 pl-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            >
              <option value="">Any</option>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading jobs" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">No jobs found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Nothing matches those filters yet. Clear them, or check back later.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              showSave={isAuthenticated}
              isSaving={savingId === job._id}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onChange={setPage} />
    </div>
  );
}
