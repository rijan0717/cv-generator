import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import * as jobsApi from '../../api/jobs.js';
import * as tailorApi from '../../api/tailor.js';
import TailorReview from '../../components/cv/TailorReview.jsx';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * "Tailor this CV for a job".
 *
 * Two steps, and they are separate on purpose:
 *
 *   1. **Choose the advert** — either one from the job board or one
 *      pasted in from somewhere else. Most adverts a student applies to
 *      are not on this board, so pasting has to be a first-class option
 *      rather than an afterthought.
 *   2. **Review and save** — the draft comes back unsaved, the user
 *      edits it, and only then does a new CV exist.
 *
 * The CV being tailored is never modified. The result is always a new
 * record, so a user can tailor the same CV for ten jobs and still have
 * the original to go back to.
 */
export default function TailorCVPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cv, setCv] = useState(null);
  const [isLoadingCV, setIsLoadingCV] = useState(true);

  const [source, setSource] = useState('board');
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');

  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedDescription, setPastedDescription] = useState('');

  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    cvApi
      .getCV(id)
      .then((loaded) => {
        if (!cancelled) setCv(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCV(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Loads a page of open jobs to choose from. */
  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const data = await jobsApi.listJobs({ search: search.trim(), limit: 20 });
      setJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [search]);

  useEffect(() => {
    if (source === 'board') loadJobs();
    // `loadJobs` changes with the search box, so this also runs the
    // search. There is no debounce because the search only runs when the
    // user submits the form, not as they type.
  }, [source, loadJobs]);

  /** Runs the rewrite and moves to the review step. */
  async function handleGenerate(event) {
    event.preventDefault();
    setError('');
    setIsGenerating(true);

    try {
      const payload =
        source === 'board'
          ? { jobId: selectedJobId }
          : { jobDescription: pastedDescription.trim(), jobTitle: pastedTitle.trim() };

      const preview = await tailorApi.previewTailoredCV(id, payload);

      setResult(preview);
      setDraft(preview.draft);
      setTitle(preview.suggestedTitle);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  /** Saves the reviewed draft as a new CV and opens it in the builder. */
  async function handleSave() {
    setError('');
    setIsSaving(true);

    try {
      const created = await tailorApi.saveTailoredCV(id, {
        draft,
        title: title.trim(),
        jobId: result.job?._id,
        jobTitle: result.jobTitle,
      });
      navigate(`/cvs/${created._id}`);
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  }

  const canGenerate =
    source === 'board' ? Boolean(selectedJobId) : pastedDescription.trim().length >= 50;

  if (isLoadingCV) {
    return (
      <div className="grid place-items-center py-24 text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your CV" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <Link
          to="/dashboard"
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← Back to My CVs
        </Link>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Tailor “{cv?.title}” for a job
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your content is re-ordered and re-worded against one advert. Nothing is invented, your
          original CV is not touched, and nothing is saved until you say so.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-5">
          {error}
        </Alert>
      )}

      {result === null ? (
        <form onSubmit={handleGenerate} className="mt-6 space-y-5">
          <div
            role="tablist"
            aria-label="Where the job advert comes from"
            className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            <SourceTab
              id="board"
              current={source}
              onSelect={setSource}
              label="From the job board"
            />
            <SourceTab
              id="paste"
              current={source}
              onSelect={setSource}
              label="Paste a description"
            />
          </div>

          {source === 'board' ? (
            <section className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex flex-wrap items-end gap-3">
                <TextField
                  label="Search jobs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="e.g. backend developer"
                  className="min-w-[220px] flex-1"
                />
                <Button type="button" variant="secondary" onClick={loadJobs}>
                  Search
                </Button>
              </div>

              {isLoadingJobs ? (
                <div className="mt-6 grid place-items-center text-slate-500 dark:text-slate-400">
                  <Spinner label="Loading jobs" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                  No open jobs matched that search. You can paste a description instead.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {jobs.map((job) => (
                    <li key={job._id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800">
                        <input
                          type="radio"
                          name="job"
                          value={job._id}
                          checked={selectedJobId === job._id}
                          onChange={() => setSelectedJobId(job._id)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900 dark:text-slate-100">
                            {job.title}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {[job.company?.name, job.location, job.workMode]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="space-y-4 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <TextField
                label="Job title"
                value={pastedTitle}
                onChange={(event) => setPastedTitle(event.target.value)}
                placeholder="e.g. Backend Developer"
                hint="Used as your headline on the tailored CV."
                maxLength={140}
              />

              <label className="block">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Job description
                </span>
                <textarea
                  value={pastedDescription}
                  onChange={(event) => setPastedDescription(event.target.value)}
                  rows={10}
                  maxLength={8000}
                  placeholder="Paste the whole advert, including the requirements."
                  className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
                />
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {pastedDescription.trim().length} characters. At least 50 are needed for the
                  weighting to mean anything.
                </span>
              </label>
            </section>
          )}

          <Button type="submit" disabled={!canGenerate} isLoading={isGenerating}>
            Generate tailored CV
          </Button>
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          <TailorReview
            result={result}
            draft={draft}
            onChange={setDraft}
            title={title}
            onTitleChange={setTitle}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} isLoading={isSaving}>
              Save as a new CV
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // Back to the chooser with everything cleared, so a second
                // attempt cannot quietly reuse the first draft.
                setResult(null);
                setDraft(null);
                setTitle('');
              }}
            >
              Choose a different job
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One tab of the advert chooser.
 * @param {{id: string, current: string, label: string,
 *          onSelect: (id: string) => void}} props
 */
function SourceTab({ id, current, label, onSelect }) {
  const isActive = current === id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(id)}
      className={[
        'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
        isActive
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
