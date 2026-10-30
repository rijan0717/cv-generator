import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import { useToast } from '../../context/useToast.js';
import { useAuth } from '../../context/useAuth.js';
import { useJobMatchScores } from '../../utils/useJobMatchScores.js';
import JobCard from '../../components/jobs/JobCard.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useDocumentMeta } from '../../utils/useDocumentMeta.js';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

/**
 * How many jobs are fetched per request when filtering by match.
 *
 * The largest page the jobs route accepts (its `limit` validator allows
 * 1–50). Asking for more is rejected with "Invalid input", which is what
 * this used to do. The match filter has to see every job to give an honest
 * answer, so it fetches page after page of this size.
 */
const MATCH_PAGE_SIZE = 50;

/**
 * A ceiling on those pages, so a very large board cannot turn one filter
 * change into an unbounded run of requests. 20 × 50 = 1,000 jobs.
 */
const MAX_MATCH_PAGES = 20;

/**
 * The match filter's options.
 *
 * One threshold, two directions. The four-band version this replaced read
 * like a precision the score does not have: the difference between a 64%
 * and a 66% match is noise in an estimate, and offering it as a choice
 * invited the user to believe otherwise. Half is the one cut that means
 * something plain — worth applying for, or not yet.
 */
const MATCH_FILTERS = [
  { value: '', label: 'Any match' },
  { value: 'above', label: 'Above 50%' },
  { value: 'below', label: 'Below 50%' },
];

/** The cut the two filters are either side of. */
const MATCH_THRESHOLD = 50;

/**
 * The score a filter should judge a job by.
 *
 * Where the user has tailored a CV for the advert, that CV's score is the
 * honest answer: it is the best they can currently send, and filtering it
 * out of the strong matches because their primary CV scores badly would
 * hide the very job they have done the most work on.
 *
 * @param {{matchScore: number|null, tailored: object|null}|null} match
 * @returns {number|null} The score to filter on, or null if unscored.
 */
function effectiveScore(match) {
  if (!match) return null;
  if (Number.isFinite(match.tailored?.matchScore)) return match.tailored.matchScore;
  return Number.isFinite(match.matchScore) ? match.matchScore : null;
}

/**
 * Whether one job passes the match filter.
 *
 * An unscored job fails both filters. That is deliberate: a user asking
 * which jobs score above half is asking a question the system cannot
 * answer for an unscored job, and showing it anyway would be answering
 * "yes" by default.
 *
 * @param {object|null} match - The job's score, if it has one.
 * @param {string} filter - A value from `MATCH_FILTERS`.
 * @returns {boolean} True to keep the job.
 */
function passesMatchFilter(match, filter) {
  if (!filter) return true;

  const score = effectiveScore(match);
  if (score === null) return false;

  return filter === 'above' ? score >= MATCH_THRESHOLD : score < MATCH_THRESHOLD;
}

/**
 * The public job board.
 *
 * Every job posted by any company is listed here and is visible to every
 * user, signed in or not. Signing in adds the saved and applied flags;
 * it is not required to browse.
 */
export default function JobsPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();

  useDocumentMeta({
    title: 'Jobs',
    description:
      'Browse open vacancies from approved employers, see how well each one matches your CV, and apply with the CV you choose.',
    keywords: ['jobs', 'vacancies', 'job board', 'apply for jobs'],
    canonicalPath: '/jobs',
  });

  // Match scores, the match filter and saving are job-seeker features; an
  // employer's view of the board is read-only, and only an employer posts.
  const isJobSeeker = isAuthenticated && (isAdmin || user?.accountType === 'jobseeker');
  const isEmployer = isAuthenticated && !isAdmin && user?.accountType === 'employer';

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
  const toast = useToast();
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  /*
    Kept apart from `filters` because it is not a server filter: the
    scores come from a second request, after the jobs themselves have been
    fetched, so the database cannot narrow the query by them.

    It is still applied to the whole board rather than to one page. While
    it is on, the list is fetched unpaginated and the pager comes off the
    bottom of the page — a filter that narrowed page 1 of 6 while the
    pager still offered six pages would be reporting a number of results
    it had not actually counted.
  */
  const [matchFilter, setMatchFilter] = useState('');

  /**
   * Changes the match filter and returns to page one.
   *
   * Turning it off drops back to a paginated board, and the page the user
   * was on before they filtered is not a page they have seen since.
   *
   * @param {string} value - A value from `MATCH_FILTERS`.
   */
  function setMatch(value) {
    setMatchFilter(value);
    setPage(1);
  }

  // Match badges, scored against the user's primary CV.
  const { scores, primaryCv, isScoring } = useJobMatchScores(jobs, isJobSeeker);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const query = {
        search: filters.search || undefined,
        location: filters.location || undefined,
        jobType: filters.jobType || undefined,
        workMode: filters.workMode || undefined,
      };

      if (!matchFilter) {
        const data = await jobApi.listJobs({ ...query, page });
        setJobs(data.jobs);
        setPagination(data.pagination);
        return;
      }

      // Filtering by match: fetch every page, so the filter sees the whole
      // board rather than only its first page.
      const first = await jobApi.listJobs({ ...query, page: 1, limit: MATCH_PAGE_SIZE });
      const lastPage = Math.min(Math.max(1, first.pagination?.pages ?? 1), MAX_MATCH_PAGES);
      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          jobApi.listJobs({ ...query, page: index + 2, limit: MATCH_PAGE_SIZE }),
        ),
      );

      setJobs([first, ...rest].flatMap((data) => data.jobs));
      setPagination(first.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, matchFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // While the scores are still arriving nothing is filtered out, or the
  // list would empty itself for a moment on every page change and look
  // like a failed search.
  const visibleJobs =
    !matchFilter || isScoring
      ? jobs
      : jobs.filter((job) => passesMatchFilter(scores[job._id] ?? null, matchFilter));

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
      toast.success(wasSaved ? 'Removed from your saved jobs.' : 'Saved to your jobs.');
    } catch (err) {
      // Put it back if the server disagreed.
      setJobs((current) =>
        current.map((row) => (row._id === job._id ? { ...row, isSaved: wasSaved } : row)),
      );
      toast.error(err.message);
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

        {isEmployer && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Match my CV is a main module in the sidebar, so it is not
                repeated here. */}
            <Link to="/company">
              <Button variant="secondary" size="sm">
                Post a job
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-6 dark:bg-slate-900 dark:ring-slate-700">
        <div className="sm:col-span-2 lg:col-span-2">
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

        <div className="grid grid-cols-2 gap-2 lg:col-span-2">
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

        {/*
          Only offered to someone who has scores to filter by. For a
          visitor every job is unscored, so the control could only ever
          empty the list.
        */}
        {isJobSeeker && (
          <div>
            <label
              htmlFor="job-match"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Match
            </label>
            <select
              id="job-match"
              value={matchFilter}
              onChange={(e) => setMatch(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 py-2 pl-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            >
              {MATCH_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
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
          {/*
            Says what the percentages are measured against. Without this
            line a number on a card is unexplained, and the first question
            anyone asks is "matched against what?".
          */}
          {isJobSeeker && matchFilter && !isScoring && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {visibleJobs.length} of {jobs.length} job{jobs.length === 1 ? '' : 's'} match
              {visibleJobs.length === 1 ? 'es' : ''} {matchFilter === 'above' ? 'above' : 'below'}{' '}
              50%.{' '}
              <button
                type="button"
                onClick={() => setMatch('')}
                className="font-medium underline hover:text-slate-900 dark:hover:text-slate-100"
              >
                Clear the match filter
              </button>{' '}
              to see the rest.
            </p>
          )}

          {isJobSeeker && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isScoring ? (
                'Scoring these jobs against your primary CV…'
              ) : primaryCv ? (
                <>
                  AI match scores are against your primary CV,{' '}
                  <Link to={`/cvs/${primaryCv._id}`} className="font-medium hover:underline">
                    {primaryCv.title}
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link to="/cvs" className="font-medium hover:underline">
                    Choose a primary CV
                  </Link>{' '}
                  to see how well you match each job.
                </>
              )}
            </p>
          )}

          {visibleJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              showSave={isJobSeeker}
              isSaving={savingId === job._id}
              onToggleSave={toggleSave}
              match={scores[job._id] ?? null}
            />
          ))}

          {visibleJobs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                No jobs match that filter
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                {matchFilter === 'above'
                  ? 'Nothing on the board scores above 50% against your primary CV yet. Tailoring a CV for a job is the quickest way to change that.'
                  : 'Everything on the board scores above 50% against your primary CV.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/*
        No pager while filtering by match. The filtered list is the whole
        board already, so a pager could only offer pages of results that
        do not exist.
      */}
      {!matchFilter && <Pagination pagination={pagination} onChange={setPage} label="jobs" />}
    </div>
  );
}
