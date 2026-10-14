import { useState, useEffect } from 'react';
import * as applicationApi from '../../api/applications.js';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';
import Spinner from '../ui/Spinner.jsx';
import CVPreview from '../cv/CVPreview.jsx';
import { readBlobError } from '../../utils/blobError.js';

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
export default function SubmittedCV({ applicationId }) {
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
