import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as applicationApi from '../../api/applications.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import StatusBadge from '../../components/jobs/StatusBadge.jsx';
import CVPreview from '../../components/cv/CVPreview.jsx';
import { readBlobError } from '../../utils/blobError.js';

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
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Which row has its CV open. One at a time: two full CV previews on
  // screen at once is more than the page can usefully show, and the
  // comparison a user wants is with the advert, not with another CV.
  const [openCvId, setOpenCvId] = useState(null);

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

              {/*
                The CV is what the employer is actually judging, and until
                now the applicant had no way to see which one they sent.
                It matters most here: a user who tailors a CV per advert
                has several near-identical documents, and "which one did
                they get?" is not a question they can answer from memory.
              */}
              <Button
                size="sm"
                variant="secondary"
                aria-expanded={openCvId === application._id}
                onClick={() =>
                  setOpenCvId((current) => (current === application._id ? null : application._id))
                }
              >
                {openCvId === application._id ? 'Hide CV' : 'View CV'}
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

              {openCvId === application._id && (
                <div className="w-full">
                  <SubmittedCV applicationId={application._id} />
                </div>
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
/**
 * The CV exactly as it was submitted, with the downloads for it.
 *
 * Loaded only when the row is opened. A snapshot is a whole CV document,
 * and fetching one for every row of the list up front would make the page
 * slow for a panel most users never open.
 *
 * It renders through the same `CVPreview` as the builder and the
 * employer's screen, so all three show the identical document. A second
 * rendering path would drift, and the one thing this panel has to be is
 * faithful: it is the record of what was sent, not a fresh render of the
 * CV as it stands today. Editing the CV afterwards does not change it.
 *
 * @param {{applicationId: string}} props
 */
function SubmittedCV({ applicationId }) {
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    applicationApi
      .getApplication(applicationId)
      .then((result) => {
        if (!cancelled) setApplication(result);
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
   * Downloads the submitted snapshot.
   * @param {'pdf'|'docx'} format - Which file to produce.
   */
  async function download(format) {
    setDownloading(format);
    setError('');

    try {
      await applicationApi.downloadApplicationCV(applicationId, format);
    } catch (err) {
      setError(await readBlobError(err));
    } finally {
      setDownloading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-4 border-t border-slate-200 pt-4 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <Spinner label="Loading the CV you sent" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            CV as submitted
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A frozen copy. Editing “{application.cv?.title ?? 'this CV'}” since you applied has not
            changed what this employer sees.
          </p>
        </div>

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

      {application.coverLetter && (
        <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your cover letter
          </h4>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
            {application.coverLetter}
          </p>
        </section>
      )}

      <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-slate-200/60 p-4 dark:bg-slate-800/60">
        <CVPreview cv={application.cv} />
      </div>
    </div>
  );
}
