import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import * as tailorApi from '../../api/tailor.js';
import TailorReview from '../../components/cv/TailorReview.jsx';
import ExportMenu from '../../components/cv/ExportMenu.jsx';
import RewriteButton from '../../components/cv/RewriteButton.jsx';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/** The server refuses shorter descriptions; there is too little to weight. */
const MIN_DESCRIPTION = 50;

/**
 * "Rewrite with JD": paste a job title and description, and the user's
 * primary CV is rewritten for it.
 *
 * Three steps on one page:
 *   1. **Paste** the job title and description. The Rewrite button stays
 *      disabled until there is enough text to work with.
 *   2. **Review** the draft — the same review screen as every other
 *      rewrite, so the user sees and edits each change before keeping it.
 *   3. **Keep it** — save it as a new CV, optionally make it primary, and
 *      download it.
 *
 * It uses the same server routes as the job page's rewrite: the primary
 * CV is chosen by the server, and the original CV is never changed.
 */
export default function RewriteWithJDPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');

  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(null);
  const [isPrimary, setIsPrimary] = useState(false);

  // Which action is running: 'rewrite', 'save', 'primary' or ''.
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const canRewrite = description.trim().length >= MIN_DESCRIPTION;

  /** Rewrites the primary CV for the pasted advert. Nothing is saved. */
  async function handleRewrite(event) {
    event.preventDefault();
    setError('');
    setBusy('rewrite');

    try {
      const preview = await tailorApi.previewTailoredPrimaryCV({
        jobTitle: jobTitle.trim(),
        jobDescription: description.trim(),
      });
      setResult(preview);
      setDraft(preview.draft);
      setTitle(preview.suggestedTitle);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  /**
   * Saves the reviewed draft as a new CV, and makes it primary if asked.
   * @param {{makePrimary?: boolean}} [options]
   */
  async function handleSave({ makePrimary = false } = {}) {
    setError('');
    setBusy(makePrimary ? 'primary' : 'save');

    try {
      const created = await tailorApi.saveTailoredCV(result.sourceCv._id, {
        draft,
        title: title.trim(),
        // Sent again so the server can score the draft that is actually
        // being kept against the same advert.
        jobDescription: description.trim(),
        jobTitle: result.jobTitle,
      });

      if (makePrimary) {
        await cvApi.setPrimaryCV(created._id);
        setIsPrimary(true);
      }

      setSaved(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  /** Makes the already-saved CV the primary one. */
  async function handleSetPrimary() {
    setError('');
    setBusy('primary');

    try {
      await cvApi.setPrimaryCV(saved._id);
      setIsPrimary(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  /** Back to an empty form for another advert. */
  function startAgain() {
    setResult(null);
    setDraft(null);
    setTitle('');
    setSaved(null);
    setIsPrimary(false);
    setJobTitle('');
    setDescription('');
    setError('');
  }

  return (
    <div className={`mx-auto px-4 py-10 ${result && !saved ? 'max-w-[1600px]' : 'max-w-3xl'}`}>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Rewrite with JD
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste a job title and description, and your primary CV is rewritten for it. Your original
          CV is not changed, and nothing is saved until you say so.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-5">
          {error}{' '}
          {/primary cv/i.test(error) && (
            <Link to="/cvs" className="font-medium underline">
              Go to My CVs
            </Link>
          )}
        </Alert>
      )}

      {/* Step 1: paste */}
      {!result && (
        <form
          onSubmit={handleRewrite}
          className="mt-6 space-y-4 rounded-lg bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        >
          <TextField
            label="Job title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="e.g. QA Automation Engineer"
            maxLength={140}
          />

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Job description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={12}
              maxLength={8000}
              placeholder="Paste the whole advert, including the requirements."
              className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            />
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {canRewrite
                ? `${description.trim().length} characters`
                : `Paste at least ${MIN_DESCRIPTION} characters (${description.trim().length} so far).`}
            </span>
          </label>

          <RewriteButton
            type="submit"
            disabled={!canRewrite}
            isLoading={busy === 'rewrite'}
            title="Rewrite your primary CV for this job description"
          />
        </form>
      )}

      {/* Step 2: review */}
      {result && !saved && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rewritten from your primary CV,{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              “{result.sourceCv.title}”
            </span>
            .
          </p>

          <TailorReview
            result={result}
            draft={draft}
            onChange={setDraft}
            title={title}
            onTitleChange={setTitle}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => handleSave()} isLoading={busy === 'save'} disabled={!!busy}>
              Save CV
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave({ makePrimary: true })}
              isLoading={busy === 'primary'}
              disabled={!!busy}
            >
              Save &amp; set as primary
            </Button>
            <Button variant="ghost" onClick={startAgain} disabled={!!busy}>
              Start again
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: saved — set primary, download, open */}
      {saved && (
        <section className="mt-6 rounded-lg bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Your CV is saved</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            “{saved.title}” is in{' '}
            <Link to="/cvs" className="font-medium underline">
              My CVs
            </Link>
            {isPrimary ? ' and is now your primary CV.' : '.'}
            {Number.isFinite(saved.tailoredFor?.matchScore) &&
              ` Match with this job: ${saved.tailoredFor.baselineMatchScore}% before, ${saved.tailoredFor.matchScore}% after.`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!isPrimary && (
              <Button size="sm" onClick={handleSetPrimary} isLoading={busy === 'primary'}>
                Set as primary
              </Button>
            )}
            <Link to={`/cvs/${saved._id}`}>
              <Button size="sm" variant="secondary">
                Open in the builder
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={startAgain}>
              Rewrite for another job
            </Button>
          </div>

          <div className="mt-4">
            <ExportMenu cvId={saved._id} />
          </div>
        </section>
      )}
    </div>
  );
}
