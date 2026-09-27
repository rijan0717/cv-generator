import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import * as cvApi from '../../api/cvs.js';
import { useAuth } from '../../context/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * One job in full, with the apply flow.
 *
 * The page is public. A visitor sees everything and is asked to sign in
 * only when they try to apply — the same principle as the template
 * chooser: let people see what is on offer before asking for anything.
 */
export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    jobApi
      .getJob(id)
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

  /** Saves or unsaves, sending a visitor to log in first. */
  async function toggleSave() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } });
      return;
    }

    setIsSaving(true);
    try {
      if (data.isSaved) await jobApi.unsaveJob(id);
      else await jobApi.saveJob(id);
      setData((current) => ({ ...current, isSaved: !current.isSaved }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading job" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{error}</Alert>
        <Link to="/jobs" className="mt-6 inline-block">
          <Button variant="secondary">Back to jobs</Button>
        </Link>
      </div>
    );
  }

  const { job, isSaved, hasApplied } = data;
  const isOwnPosting = user && job.postedBy === user.id;
  const isClosed =
    job.status !== 'open' || (job.closingDate && new Date(job.closingDate) < new Date());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/jobs"
        className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        &larr; All jobs
      </Link>

      <header className="mt-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {job.title}
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {job.company?.name}
              {job.location && <> &middot; {job.location}</>}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Tag>{job.jobType}</Tag>
              <Tag>{job.workMode}</Tag>
              {job.salaryRange && <Tag>{job.salaryRange}</Tag>}
              {isClosed && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                  Closed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" isLoading={isSaving} onClick={toggleSave}>
              {isSaved ? 'Saved' : 'Save'}
            </Button>

            {isOwnPosting ? (
              <Link to="/company">
                <Button size="sm" variant="secondary">
                  Manage this posting
                </Button>
              </Link>
            ) : hasApplied ? (
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                You have applied
              </span>
            ) : (
              <Button
                size="sm"
                disabled={isClosed}
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } });
                    return;
                  }
                  setIsApplyOpen(true);
                }}
              >
                {isClosed ? 'Applications closed' : 'Apply'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isApplyOpen && (
        <div className="mt-4">
          <ApplyPanel
            jobId={id}
            onClose={() => setIsApplyOpen(false)}
            onApplied={() => {
              setIsApplyOpen(false);
              setData((current) => ({ ...current, hasApplied: true }));
            }}
          />
        </div>
      )}

      <section className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">About the role</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {job.description}
        </p>

        {job.skills?.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold text-slate-900 dark:text-slate-100">Skills</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {job.company?.description && (
        <section className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            About {job.company.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {job.company.description}
          </p>
          {job.company.website && (
            <p className="mt-2 text-sm">
              <a
                href={
                  /^https?:\/\//i.test(job.company.website)
                    ? job.company.website
                    : `https://${job.company.website}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-900 underline dark:text-slate-100"
              >
                {job.company.website}
              </a>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * The apply form: pick a CV, optionally write a cover letter.
 *
 * The CV is copied into the application when it is submitted, so the
 * panel says so — a candidate should know that later edits will not
 * reach this employer.
 *
 * @param {{jobId: string, onClose: () => void, onApplied: () => void}} props
 */
function ApplyPanel({ jobId, onClose, onApplied }) {
  const [cvs, setCvs] = useState([]);
  const [cvId, setCvId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    cvApi
      .listCVs()
      .then((list) => {
        if (cancelled) return;
        setCvs(list);

        // Default to the primary CV when there is one; otherwise the
        // most recently updated, which is what the list is sorted by.
        const primary = list.find((cv) => cv.isPrimary);
        if (primary) setCvId(primary._id);
        else if (list.length > 0) setCvId(list[0]._id);
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!cvId) {
      setError('Choose a CV to apply with');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await jobApi.applyToJob(jobId, { cvId, coverLetter: coverLetter.trim() });
      onApplied();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Apply for this job</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="sr-only">Close</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 text-slate-500 dark:text-slate-400">
          <Spinner label="Loading your CVs" />
        </div>
      ) : cvs.length === 0 ? (
        <div className="mt-4">
          <Alert variant="info">
            You need a CV before you can apply. Create one first, then come back.
          </Alert>
          <Link to="/dashboard" className="mt-4 inline-block">
            <Button size="sm">Create a CV</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Alert variant="error">{error}</Alert>

          <div>
            <label
              htmlFor="apply-cv"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Apply with
            </label>
            <select
              id="apply-cv"
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
              className="mt-1 block w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            >
              {cvs.map((cv) => (
                <option key={cv._id} value={cv._id}>
                  {cv.title}
                  {cv.isPrimary ? ' (primary)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A copy of this CV is sent as it is now. Editing it later will not change what this
              employer sees.
            </p>
          </div>

          <div>
            <label
              htmlFor="cover-letter"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cover letter <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={5}
              maxLength={4000}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {coverLetter.length}/4000
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" isLoading={isSubmitting}>
              Submit application
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * A small neutral tag.
 * @param {{children: React.ReactNode}} props
 */
function Tag({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}
