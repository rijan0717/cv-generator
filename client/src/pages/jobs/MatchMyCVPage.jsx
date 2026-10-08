import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as jobMatchApi from '../../api/jobMatch.js';
import CVPreview from '../../components/cv/CVPreview.jsx';
import JobCard from '../../components/jobs/JobCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * What the server will accept, repeated here so an obvious mistake is
 * caught before a 10 MB upload.
 *
 * Both the media type and the file extension are listed because neither
 * is reliable on its own. A file dragged from a file manager often
 * arrives with `type: ''`, and Windows reports a .docx as
 * `application/octet-stream` when Office is not installed — so checking
 * the media type alone would reject perfectly good Word files. The
 * extension covers those cases; the media type covers a file that has
 * been renamed. Either one matching is enough here, because the server
 * checks again and is the real gate.
 */
const ACCEPTED = {
  mediaTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  extensions: ['.pdf', '.docx', '.txt'],
};

/** The `accept` attribute: extensions and media types, for both dialogs. */
const ACCEPT_ATTRIBUTE = [...ACCEPTED.extensions, ...ACCEPTED.mediaTypes].join(',');

/** Matches the multer limit on the server. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * True when a file looks like something the server will read.
 *
 * @param {File} file - The dropped or chosen file.
 * @returns {boolean}
 */
function isAcceptedFile(file) {
  const name = (file.name ?? '').toLowerCase();

  return (
    ACCEPTED.mediaTypes.includes(file.type) ||
    ACCEPTED.extensions.some((extension) => name.endsWith(extension))
  );
}

/**
 * "Match my CV": drop a CV file and see every open job ranked against it.
 *
 * The page answers a different question from the rest of the job board.
 * The board asks "what jobs are there?" and the match analyser asks "how
 * well do I fit this one?"; this asks "out of everything on the board,
 * which should I apply for?" — which is the question someone actually
 * has when they arrive.
 *
 * Nothing is saved. The CV is read, scored against the board and shown
 * back; leaving the page discards it. That is deliberate: trying the
 * system out should not litter the account with CVs and analyses.
 *
 * The ranking is the project's own algorithm — TF-IDF weighting, cosine
 * similarity and skill coverage — not a third-party service.
 */
export default function MatchMyCVPage() {
  const inputRef = useRef(null);

  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Validates a chosen file and sends it for analysis.
   *
   * The checks here duplicate the server's on purpose: the server has to
   * have them because a client can be bypassed, and the client has them
   * so an obvious mistake is caught before a 10 MB upload.
   *
   * @param {File} file - The dropped or chosen file.
   */
  const analyse = useCallback(async (file) => {
    if (!file) return;

    if (!isAcceptedFile(file)) {
      setError(
        'Please upload a PDF, a Word (.docx) file or a plain text file. ' +
          'An old .doc file needs saving as .docx first.',
      );
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 10 MB. Please upload a smaller one.');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsLoading(true);

    try {
      setResult(await jobMatchApi.matchUploadedCV(file));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles a file dropped onto the zone.
   * @param {React.DragEvent} event - The drop event.
   */
  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    analyse(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Match my CV
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Drop your CV below. It is read on the spot and scored against every open job, best
            match first. Nothing is saved — this is just to show you where you stand.
          </p>
        </div>

        <Link to="/jobs">
          <Button variant="secondary">Back to all jobs</Button>
        </Link>
      </header>

      {/* The drop zone. A button rather than a bare div, so it is reachable
          by keyboard and announced as something that can be activated —
          drag and drop alone would leave keyboard users with no way in. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        disabled={isLoading}
        className={[
          'mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition',
          isDragging
            ? 'border-slate-900 bg-slate-50 dark:border-slate-200 dark:bg-slate-800'
            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-slate-500',
          isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer',
        ].join(' ')}
      >
        <svg
          className="h-9 w-9 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4l4 4M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1"
          />
        </svg>

        <span className="font-medium text-slate-900 dark:text-slate-100">
          {fileName || 'Drop your CV here, or click to choose a file'}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          PDF, Word (.docx) or plain text, up to 10 MB
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => analyse(event.target.files?.[0])}
      />

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading && (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Reading your CV and scoring every job" />
        </div>
      )}

      {result && !isLoading && <Results result={result} />}
    </div>
  );
}

/**
 * The preview and the ranked jobs.
 *
 * Two columns on a wide screen, stacked on a narrow one, with the CV
 * sticky so it stays visible while the job list is scrolled — the whole
 * point is comparing the two, which does not work if one scrolls away.
 *
 * @param {{result: {cv: object, strength: object, results: Array<object>,
 *          stats: object}}} props
 */
function Results({ result }) {
  const { cv, strength, results, stats } = result;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* Live preview of what was read */}
      <section className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Your CV, as we read it</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            strength {strength?.totalScore ?? 0}/100
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {stats?.linesRead ?? 0} lines read &middot; {cv.skills?.length ?? 0} skills &middot;{' '}
          {cv.experience?.length ?? 0} roles found
        </p>

        <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <CVPreview cv={cv} />
        </div>

        {/* Reading a CV out of a PDF is never perfect, and the user is the
            only one who can tell. Saying so is more useful than pretending
            the parse is authoritative. */}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Anything missing here was not found in the file, and the scores below reflect only what
          was read. You can build a full CV in the editor for a more accurate result.
        </p>

        <Link to="/dashboard" className="mt-3 inline-block">
          <Button size="sm" variant="secondary">
            Build a CV in the editor
          </Button>
        </Link>
      </section>

      {/* The ranked board */}
      <section>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          {results.length} open {results.length === 1 ? 'job' : 'jobs'}, best match first
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Scored with cosine similarity over TF-IDF weighted terms, combined with how many of the
          skills each advert names appear in your CV.
        </p>

        {results.length === 0 ? (
          <p className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
            There are no open jobs on the board at the moment.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {results.map(({ job, match }) => (
              <li key={job._id}>
                <JobCard job={job} match={match} showSave={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
