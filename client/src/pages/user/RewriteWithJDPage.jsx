import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { useToast } from '../../context/useToast.js';
import * as tailorApi from '../../api/tailor.js';
import TailorReview from '../../components/cv/TailorReview.jsx';
import ExportMenu from '../../components/cv/ExportMenu.jsx';
import RewriteButton from '../../components/cv/RewriteButton.jsx';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { BRAND_TEXT_GRADIENT } from '../../components/ui/BrandMark.jsx';

/** The server refuses shorter descriptions; there is too little to weight. */
const MIN_DESCRIPTION = 50;

/**
 * "Rewrite for a job": paste a job title and description, and the user's
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
 *
 * The first step is laid out as two columns rather than as a bare form.
 * This is the page the home page sends people to, so for many it is the
 * first screen of the application they see, and a textarea on its own
 * does not say what is about to happen to their CV. The right-hand column
 * is that explanation, and it drops below the form on a narrow screen.
 */

/** What the rewrite will do, shown beside the form on the first step. */
const PROMISES = [
  {
    title: 'Your facts stay yours',
    detail:
      'Dates, employers, job titles and numbers are never changed. Only the phrasing around them is.',
  },
  {
    title: 'You approve every line',
    detail: 'The next screen shows each change beside the original. Keep it or reject it.',
  },
  {
    title: 'Your CV is not touched',
    detail: 'The rewrite is saved as a new CV. The one it started from stays exactly as it was.',
  },
  {
    title: 'It runs on our own server',
    detail:
      'The matching is our own code — TF-IDF and cosine similarity. Nothing is sent to a third party.',
  },
];

/** The spark, used as the page mark and beside the heading. */
function Spark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </svg>
  );
}

export default function RewriteWithJDPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');

  const [result, setResult] = useState(null);
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(null);
  const [isPrimary, setIsPrimary] = useState(false);

  // Which action is running: 'rewrite', 'save', 'primary' or ''.
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const typed = description.trim().length;
  const canRewrite = typed >= MIN_DESCRIPTION;

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
      toast.success('Your CV has been rewritten for this advert. Review it before saving.');
    } catch (err) {
      // Having no primary CV is a setup problem with something to do
      // about it, so that one stays on the page with its link. Anything
      // else is a passing failure and goes to a toast.
      if (/primary cv/i.test(err.message)) setError(err.message);
      else toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  /**
   * Saves the reviewed draft as a new CV, and makes it primary if asked.
   * @param {{makePrimary?: boolean}} [options]
   */
  async function handleSave({ makePrimary = false } = {}) {
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
      toast.success(
        makePrimary
          ? `"${created.title}" saved and set as your primary CV.`
          : `"${created.title}" has been saved to My CVs.`,
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  /** Makes the already-saved CV the primary one. */
  async function handleSetPrimary() {
    setBusy('primary');

    try {
      await cvApi.setPrimaryCV(saved._id);
      setIsPrimary(true);
      toast.success(`"${saved.title}" is now the CV employers see.`);
    } catch (err) {
      toast.error(err.message);
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

  // The review step needs the width; the other two read better narrow.
  const isReviewing = result && !saved;

  return (
    <div className={`mx-auto px-4 py-10 sm:px-6 ${isReviewing ? 'max-w-[1600px]' : 'max-w-6xl'}`}>
      <header className="max-w-2xl">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-fuchsia-500/25"
        >
          <Spark />
        </span>

        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
          Rewrite your CV for <span className={BRAND_TEXT_GRADIENT}>one particular job</span>
        </h1>

        <p className="mt-3 text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-400">
          Paste the advert and your primary CV comes back speaking its language. Your original is
          not changed, and nothing is saved until you say so.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-6 max-w-2xl">
          {error}{' '}
          {/primary cv/i.test(error) && (
            <Link to="/cvs" className="font-medium underline">
              Go to My CVs
            </Link>
          )}
        </Alert>
      )}

      {/* --- Step 1: paste --- */}
      {!result && (
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            onSubmit={handleRewrite}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900"
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
                rows={14}
                maxLength={8000}
                placeholder="Paste the whole advert, including the requirements. The more of it you paste, the better the rewrite."
                className="mt-1.5 block w-full rounded-xl border-0 bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-fuchsia dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-fuchsia-400"
              />

              {/* A bar rather than a sentence: "how much more do I need?"
                  is a quantity, and a quantity is read faster as a length
                  than as a number. The sentence stays for a screen reader
                  and for anyone who wants the figure. */}
              <span className="mt-2 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                >
                  <span
                    className={`block h-full rounded-full transition-all ${
                      canRewrite ? 'bg-brand-gradient' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                    style={{ width: `${Math.min(100, (typed / MIN_DESCRIPTION) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {canRewrite
                    ? `${typed} characters — ready`
                    : `${typed} of ${MIN_DESCRIPTION} characters`}
                </span>
              </span>
            </label>

            <RewriteButton
              type="submit"
              disabled={!canRewrite}
              isLoading={busy === 'rewrite'}
              title="Rewrite your primary CV for this job description"
            />
          </form>

          {/* What is about to happen. */}
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              What happens next
            </h2>

            <ul className="mt-5 space-y-5">
              {PROMISES.map((promise) => (
                <li key={promise.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20"
                  >
                    <svg
                      className="h-3 w-3 text-brand-pink dark:text-fuchsia-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>

                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {promise.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {promise.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No primary CV yet?{' '}
              <Link
                to="/cvs"
                className="font-semibold text-brand-fuchsia hover:underline dark:text-fuchsia-400"
              >
                Choose one in My CVs
              </Link>
              .
            </p>
          </aside>
        </div>
      )}

      {/* --- Step 2: review --- */}
      {isReviewing && (
        <div className="mt-8 space-y-6">
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

          {/* The actions stay reachable on a long review: a user who has
              scrolled through forty changes should not have to scroll back
              up to keep them. */}
          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-700 dark:bg-slate-900/90">
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

      {/* --- Step 3: saved — set primary, download, open --- */}
      {saved && (
        <section className="mt-10 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-1.5 bg-brand-gradient" aria-hidden="true" />

          <div className="p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Your CV is saved
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              “{saved.title}” is in{' '}
              <Link to="/cvs" className="font-medium underline">
                My CVs
              </Link>
              {isPrimary ? ' and is now your primary CV.' : '.'}
            </p>

            {/* The before-and-after score, when the server returned one.
                It is the answer to "did that actually help?", so it gets
                its own panel rather than a clause in a sentence. */}
            {Number.isFinite(saved.tailoredFor?.matchScore) && (
              <div className="mt-5 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <span className="text-center">
                  <span className="block text-2xl font-bold text-slate-400 dark:text-slate-500">
                    {saved.tailoredFor.baselineMatchScore}%
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">before</span>
                </span>

                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  →
                </span>

                <span className="text-center">
                  <span className={`block text-2xl font-bold ${BRAND_TEXT_GRADIENT}`}>
                    {saved.tailoredFor.matchScore}%
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">after</span>
                </span>

                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                  Match with this job
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
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

            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
              <ExportMenu cvId={saved._id} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
