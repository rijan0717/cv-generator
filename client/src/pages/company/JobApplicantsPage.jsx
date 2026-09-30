import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import * as applicationApi from '../../api/applications.js';
import CVPreview from '../../components/cv/CVPreview.jsx';
import StatusBadge from '../../components/jobs/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The statuses an employer may set. Withdrawal belongs to the applicant. */
const EMPLOYER_STATUSES = ['submitted', 'reviewed', 'shortlisted', 'rejected'];

/**
 * The people who have applied to one of your jobs.
 *
 * The list shows a summary per person; opening one loads the CV exactly
 * as it was submitted and renders it through the same preview component
 * the candidate used, so an employer sees what the candidate saw.
 */
export default function JobApplicantsPage() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    jobApi
      .listJobApplications(id)
      .then((data) => {
        if (cancelled) return;
        setJob(data.job);
        setApplications(data.applications);
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
        <Spinner label="Loading applicants" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{error}</Alert>
        <Link to="/company/posts" className="mt-6 inline-block">
          <Button variant="secondary">Back to your posts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/company/posts"
        className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        &larr; My posts
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Applicants
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {job?.title} &middot; {applications.length} application
          {applications.length === 1 ? '' : 's'}
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {applications.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">No applications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            When someone applies, they will appear here with the CV they sent.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-slate-900 dark:text-slate-100">
                    {application.applicant?.name ?? 'An applicant'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {application.applicant?.email}
                    {application.headline && <> &middot; {application.headline}</>} &middot; applied{' '}
                    {new Date(application.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>

                <StatusBadge status={application.status} />

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setSelectedId((current) => (current === application.id ? null : application.id))
                  }
                >
                  {selectedId === application.id ? 'Hide CV' : 'View CV'}
                </Button>
              </div>

              {selectedId === application.id && (
                <ApplicationDetail
                  applicationId={application.id}
                  onStatusChange={(status) =>
                    setApplications((current) =>
                      current.map((row) => (row.id === application.id ? { ...row, status } : row)),
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One application in full: the cover letter, the submitted CV, the
 * status controls and the download buttons.
 *
 * Loaded only when opened, because a CV snapshot is a large object and
 * fetching every one up front would make the list slow for no reason.
 *
 * @param {{applicationId: string, onStatusChange: (status: string) => void}} props
 */
function ApplicationDetail({ applicationId, onStatusChange }) {
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;

    applicationApi
      .getApplication(applicationId)
      .then((result) => {
        if (cancelled) return;
        setApplication(result);
        setNote(result.employerNote ?? '');
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
  }, [applicationId]);

  /**
   * Sets the status, and saves the private note along with it.
   * @param {string} status - The new status.
   */
  async function setStatus(status) {
    setIsSaving(true);
    setError('');

    try {
      await applicationApi.updateApplicationStatus(applicationId, {
        status,
        employerNote: note,
      });
      onStatusChange(status);
      setApplication((current) => ({ ...current, status }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Downloads the submitted CV.
   * @param {'pdf'|'docx'} format
   */
  async function download(format) {
    setDownloading(format);
    setError('');

    try {
      await applicationApi.downloadApplicationCV(applicationId, format);
    } catch (err) {
      // The error arrives as a Blob because of responseType, so the JSON
      // message has to be read back out of it.
      let message = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          message = JSON.parse(await err.response.data.text()).message ?? message;
        } catch {
          // Not JSON; keep the original message.
        }
      }
      setError(message);
    } finally {
      setDownloading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="border-t border-slate-200 p-4 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <Spinner label="Loading the application" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="border-t border-slate-200 p-4 dark:border-slate-700">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
      {error && <Alert variant="error">{error}</Alert>}

      {application.coverLetter && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cover letter</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
            {application.coverLetter}
          </p>
        </section>
      )}

      {/* Status and the private note */}
      <section className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Move this application
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          {EMPLOYER_STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={application.status === status ? 'primary' : 'secondary'}
              isLoading={isSaving}
              onClick={() => setStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        <label
          htmlFor={`note-${applicationId}`}
          className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Private note
        </label>
        <textarea
          id={`note-${applicationId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Only your company sees this. It is saved when you set a status.
        </p>
      </section>

      {/* The submitted CV */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            CV as submitted
          </h3>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              isLoading={downloading === 'pdf'}
              onClick={() => download('pdf')}
            >
              PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isLoading={downloading === 'docx'}
              onClick={() => download('docx')}
            >
              Word
            </Button>
          </div>
        </div>

        <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-xl bg-slate-200/60 p-4 dark:bg-slate-800/60">
          <CVPreview cv={application.cv} />
        </div>
      </section>
    </div>
  );
}
