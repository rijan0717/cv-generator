import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import * as cvApi from '../../api/cvs.js';
import * as tailorApi from '../../api/tailor.js';
import { useAuth } from '../../context/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import CompanyLogo from '../../components/company/CompanyLogo.jsx';
import RewriteProgress from '../../components/cv/RewriteProgress.jsx';
import TailorReview from '../../components/cv/TailorReview.jsx';
import RewriteButton from '../../components/cv/RewriteButton.jsx';

/**
 * How long the rewrite progress panel stays up at minimum, in
 * milliseconds. Long enough to read the steps it lists; short enough
 * not to feel like padding.
 */
const MIN_REWRITE_MS = 2200;

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

  // The rewrite: in flight, then the draft being reviewed.
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrite, setRewrite] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  /*
    The tailored CV for this advert, once there is one.

    It outlives the review step on purpose. Saving the draft replaces the
    whole review panel with a one-line summary of it — the user has
    finished with the editor and what they want from the page now is the
    result and a way to apply — and the same summary is what the page
    shows on a later visit, because the server sends the CV back with the
    job. Without that, the growth the rewrite delivered would exist only
    for as long as the tab stayed open.
  */
  const [tailoredCv, setTailoredCv] = useState(null);

  // Which CV the apply form should open on. Set when applying straight
  // after a rewrite, so the user is not asked to find the CV they have
  // just created in a list of near-identical titles.
  const [applyWithCvId, setApplyWithCvId] = useState('');

  useEffect(() => {
    let cancelled = false;

    jobApi
      .getJob(id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setTailoredCv(result.tailoredCv ?? null);
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

  /**
   * Rewrites the user's primary CV for this advert.
   *
   * The server picks the CV, because which one is primary is its rule
   * and the page would otherwise have to load the whole CV list to find
   * out. Nothing is saved by this call — the draft comes back for review
   * and only becomes a CV when the user says so.
   */
  async function startRewrite() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } });
      return;
    }

    setError('');
    setRewrite(null);
    setIsRewriting(true);

    try {
      // The server often answers in a few hundred milliseconds, which is
      // fast enough that the progress panel appears and vanishes before
      // it can be read — leaving the user unsure anything happened. The
      // floor keeps it on screen long enough to see what was done, and
      // costs nothing when the request is genuinely slower.
      const [result] = await Promise.all([
        tailorApi.previewTailoredPrimaryCV({ jobId: id }),
        new Promise((resolve) => {
          setTimeout(resolve, MIN_REWRITE_MS);
        }),
      ]);

      setRewrite(result);
      setDraft(result.draft);
      setDraftTitle(result.suggestedTitle);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRewriting(false);
    }
  }

  /** Keeps the reviewed draft as a new CV, and optionally applies with it. */
  async function saveDraft({ thenApply = false } = {}) {
    setError('');
    setIsSavingDraft(true);

    try {
      const created = await tailorApi.saveTailoredCV(rewrite.sourceCv._id, {
        draft,
        title: draftTitle.trim(),
        jobId: id,
        jobTitle: rewrite.jobTitle,
      });

      // It is in My CVs from this moment — the page does not navigate
      // there, because the user came here to apply for a job and sending
      // them to the builder would lose the thread. The summary strip
      // below links to it instead.
      setTailoredCv({
        _id: created._id,
        title: created.title,
        baselineMatchScore: created.tailoredFor?.baselineMatchScore ?? null,
        matchScore: created.tailoredFor?.matchScore ?? null,
        tailoredAt: created.tailoredFor?.tailoredAt ?? new Date().toISOString(),
      });

      // Collapse the review. Everything in it has been saved, and leaving
      // a long editor on screen under a "saved" message invites the user
      // to carry on editing a draft that no longer goes anywhere.
      setRewrite(null);
      setDraft(null);

      if (thenApply) {
        setApplyWithCvId(created._id);
        setIsApplyOpen(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingDraft(false);
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
  // Rewriting, saving and applying are for job seekers. A visitor still
  // sees them (they lead to the login page); an employer does not.
  const canActAsSeeker = !user || user.role === 'admin' || user.accountType === 'jobseeker';
  const isClosed =
    job.status !== 'open' || (job.closingDate && new Date(job.closingDate) < new Date());

  return (
    // Widened while a draft is under review, for the same reason as the
    // tailor page: the review is a two-column layout and the advert alone
    // is not.
    <div className={`mx-auto px-4 py-8 ${rewrite ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <Link
        to="/jobs"
        className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        &larr; All jobs
      </Link>

      <header className="mt-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <CompanyLogo company={job.company} size="md" />

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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              Only offered to someone who could act on it. Your own
              posting is not something you apply to, and a closed advert
              is not worth writing a CV for.
            */}
            {canActAsSeeker && !isOwnPosting && !isClosed && (
              <RewriteButton isLoading={isRewriting} onClick={startRewrite} />
            )}

            {canActAsSeeker && (
              <Button variant="secondary" size="sm" isLoading={isSaving} onClick={toggleSave}>
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}

            {isOwnPosting ? (
              <Link to="/company/posts">
                <Button size="sm" variant="secondary">
                  Manage this posting
                </Button>
              </Link>
            ) : (
              // No Apply button here: applying happens from the rewritten
              // CV ("Save and apply with it" / "Apply with it" below).
              hasApplied && (
                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  You have applied
                </span>
              )
            )}
          </div>
        </div>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isRewriting && <RewriteProgress cvTitle={rewrite?.sourceCv?.title} />}

      {rewrite && !isRewriting && (
        <section className="mt-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Your CV, rewritten for this job
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  From “{rewrite.sourceCv.title}”. Nothing has been saved — review it below, edit
                  anything you want, then keep it as a new CV. Your original is untouched.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRewrite(null);
                  setDraft(null);
                }}
              >
                Discard
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <TailorReview
              result={rewrite}
              draft={draft}
              onChange={setDraft}
              title={draftTitle}
              onTitleChange={setDraftTitle}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/*
              Applying is the action the user came to this page for, so it
              leads. It saves first and then opens the apply form on the
              CV it has just created: a rewrite that was never saved could
              not be sent to the employer anyway, and asking the user to
              press Save and then Apply would be two presses for one
              intention.
            */}
            {!hasApplied && !isClosed && (
              <Button onClick={() => saveDraft({ thenApply: true })} isLoading={isSavingDraft}>
                Save and apply with it
              </Button>
            )}

            <Button
              variant={hasApplied || isClosed ? 'primary' : 'secondary'}
              onClick={() => saveDraft()}
              isLoading={isSavingDraft}
            >
              Save as a new CV
            </Button>

            <Button variant="ghost" onClick={startRewrite}>
              Rewrite again
            </Button>
          </div>
        </section>
      )}

      {/*
        The rewrite, minimised. What is left of it once the draft has been
        saved: the figures, and the two things the user might still want
        to do.
      */}
      {tailoredCv && !rewrite && !isRewriting && (
        <TailoredSummary
          cv={tailoredCv}
          canApply={!hasApplied && !isClosed && !isOwnPosting}
          onApply={() => {
            setApplyWithCvId(tailoredCv._id);
            setIsApplyOpen(true);
          }}
        />
      )}

      {isApplyOpen && (
        <div className="mt-4">
          <ApplyPanel
            jobId={id}
            preselectCvId={applyWithCvId}
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
 * The tailored CV for this advert, in one line.
 *
 * What the review panel collapses into once the draft has been saved,
 * and what the page shows on a later visit. It answers the only two
 * questions left — did the rewrite help, and where is the CV now —
 * without putting a long editor back on screen for a document the user
 * has already finished with.
 *
 * The growth is shown as the pair rather than as "+64 points" alone,
 * because the starting figure is what makes the jump mean anything: 18 to
 * 82 is a different story from 70 to 82, and the difference on its own
 * tells neither.
 *
 * "After" is the score recorded when the CV was saved. "Before" is how the
 * user's current primary CV scores on this job, worked out by the server
 * on each visit, so the growth follows whichever CV is primary. The job
 * board badge uses the same server rule, so the two never disagree.
 *
 * @param {{cv: object, canApply: boolean, onApply: () => void}} props
 */
function TailoredSummary({ cv, canApply, onApply }) {
  const hasFigures = Number.isFinite(cv.baselineMatchScore) && Number.isFinite(cv.matchScore);
  const difference = hasFigures ? cv.matchScore - cv.baselineMatchScore : 0;

  return (
    <section className="mt-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-200 dark:bg-slate-900 dark:ring-emerald-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Your tailored CV is saved
          </h2>
          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
            “{cv.title}” is in{' '}
            <Link to="/dashboard" className="font-medium underline">
              My CVs
            </Link>
            . Your original CV was not changed.
          </p>
        </div>

        {hasFigures && (
          <div className="flex items-center gap-3">
            <div
              className="text-right"
              title={cv.baselineCvTitle ? `Your primary CV: “${cv.baselineCvTitle}”` : undefined}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {cv.baselineCvTitle ? 'Primary CV' : 'Before'}
              </p>
              <p className="text-xl font-bold text-slate-500 dark:text-slate-400">
                {cv.baselineMatchScore}%
              </p>
            </div>

            <span aria-hidden="true" className="text-xl text-slate-300 dark:text-slate-600">
              &rarr;
            </span>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                After
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {cv.matchScore}%
              </p>
            </div>

            {/*
              A rewrite that lost ground says so. The feature is only
              worth having if its own report can be believed.
            */}
            <span
              className={[
                'rounded-full px-3 py-1 text-sm font-medium',
                difference > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : difference < 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              ].join(' ')}
            >
              {difference > 0 ? `+${difference}` : difference} points
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canApply && (
          <Button size="sm" onClick={onApply}>
            Apply with it
          </Button>
        )}
        <Link to={`/cvs/${cv._id}`}>
          <Button size="sm" variant="secondary">
            Open in the builder
          </Button>
        </Link>
      </div>
    </section>
  );
}

/**
 * The apply form: pick a CV, optionally write a cover letter.
 *
 * The CV is copied into the application when it is submitted, so the
 * panel says so — a candidate should know that later edits will not
 * reach this employer.
 *
 * @param {{jobId: string, preselectCvId?: string, onClose: () => void,
 *          onApplied: () => void}} props
 */
function ApplyPanel({ jobId, preselectCvId = '', onClose, onApplied }) {
  const [cvs, setCvs] = useState([]);
  const [cvId, setCvId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    cvApi
      // This is the CV picker on the apply form, not a browsable list, so
      // it asks for the largest page the server allows rather than paging.
      // Anyone with more than a hundred CVs is far outside what the picker
      // is for, and they can still apply with any of the first hundred.
      .listCVs({ limit: 100 })
      .then(({ cvs: list }) => {
        if (cancelled) return;
        setCvs(list);

        // A CV the caller named wins: it is the one just written for
        // this advert, and it would be perverse to open the form on
        // something else. Otherwise the primary CV, and failing that the
        // most recently updated, which is what the list is sorted by.
        const named = preselectCvId && list.find((cv) => cv._id === preselectCvId);
        const primary = list.find((cv) => cv.isPrimary);

        if (named) setCvId(named._id);
        else if (primary) setCvId(primary._id);
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
  }, [preselectCvId]);

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
