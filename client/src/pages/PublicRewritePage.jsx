import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as publicRewriteApi from '../api/publicRewrite.js';
import { useAuth } from '../context/useAuth.js';
import { useToast } from '../context/useToast.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';
import JobCard from '../components/jobs/JobCard.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * What the server will accept. Repeated here so an obvious mistake is
 * caught before a 10 MB upload, exactly as on the signed-in page — the
 * server checks again and is the real gate.
 */
const ACCEPTED = {
  mediaTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  extensions: ['.pdf', '.docx', '.txt'],
};

const ACCEPT_ATTRIBUTE = [...ACCEPTED.extensions, ...ACCEPTED.mediaTypes].join(',');

/** Matches the multer limit on the server. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * True when a file looks like something the server will read.
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
 * Readable English for one kind of change the rewrite made.
 *
 * The visitor is shown what the rewrite *did* without being shown what
 * it wrote, so each change has to describe itself from its section and
 * its kind alone. Anything unrecognised falls back to the two words
 * themselves rather than being dropped — a change the page cannot name
 * is still a change that happened.
 *
 * @param {{section: string, kind: string, count: number}} change - One group.
 * @returns {string} A phrase for the list.
 */
function describeChange({ section, kind, count }) {
  const plural = count === 1 ? '' : 's';

  const phrases = {
    'personal:replaced': 'Headline matched to the advertised job title',
    'summary:replaced': 'Professional summary rebuilt around this advert',
    'summary:aligned': "Summary aligned to the advert's own wording",
    'skills:reordered': "Skills reordered so the advert's come first",
    'skills:added': `${count} skill${plural} your CV describes but never listed`,
    'skills:assumed': `${count} skill${plural} assumed to reach the target match`,
    'experience:reworded': `${count} line${plural} reworded to open with what you did`,
    'experience:reordered': 'Achievements reordered, strongest against this advert first',
    'projects:reordered': 'Projects reordered by relevance to this advert',
    'projects:reworded': `${count} project description${plural} reworded`,
    'settings:reordered': 'Sections reordered so the relevant ones are read first',
    'settings:replaced': 'Layout adjusted so the CV fills the page',
  };

  return phrases[`${section}:${kind}`] ?? `${count} change${plural} to your ${section}`;
}

/**
 * "Rewrite your CV": the public funnel.
 *
 * A visitor who has never used the site drops the CV they already have,
 * sees which of the open jobs it fits best, picks one, and is shown what
 * a rewrite did to it — the match before and after, and the list of
 * changes by kind. What they are not shown is the rewritten CV itself.
 * That is held on the server and released when they have an account to
 * put it in.
 *
 * The gate is deliberate and it is real: the draft is never sent to the
 * browser, so there is nothing on this page to uncover. Hiding it with
 * CSS would have been less work and would not have been true.
 *
 * Someone who is already signed in skips the wall entirely — the rewrite
 * is claimed into their account as soon as it is run, because there is
 * nothing left to ask them for.
 */
export default function PublicRewritePage() {
  useDocumentMeta({
    title: 'Rewrite your CV for a job',
    description:
      'Drop the CV you already have, see which open jobs it fits, and have it rewritten for ' +
      'the one you want. Free, and your CV is not stored unless you ask for it.',
  });

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isCheckingSession } = useAuth();
  const inputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [rewritingJobId, setRewritingJobId] = useState(null);
  const [teaser, setTeaser] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);

  /**
   * Claims a finished rewrite into the signed-in account and opens it.
   *
   * Shared by the two ways of arriving at a claim: running the rewrite
   * while already signed in, and coming back from the login page with a
   * remembered token.
   */
  const claim = useCallback(
    async (token) => {
      setIsClaiming(true);

      try {
        const saved = await publicRewriteApi.claimRewrite(token);
        publicRewriteApi.forgetSession();
        toast.success('Your rewritten CV has been saved to your account');
        navigate(`/cvs/${saved.cv._id}`);
      } catch (err) {
        publicRewriteApi.forgetSession();
        toast.error(err.message);
        setIsClaiming(false);
      }
    },
    [navigate, toast],
  );

  // Coming back from registering or logging in: the token was left in
  // session storage before the trip, so the rewrite can be collected
  // without the visitor doing anything.
  useEffect(() => {
    if (isCheckingSession || !isAuthenticated) return;

    const remembered = publicRewriteApi.rememberedSession();
    if (remembered?.token) claim(remembered.token);
  }, [isAuthenticated, isCheckingSession, claim]);

  /**
   * Validates a chosen file and sends it to be read and ranked.
   * @param {File} file - The dropped or chosen file.
   */
  const read = useCallback(
    async (file) => {
      if (!file) return;

      if (!isAcceptedFile(file)) {
        toast.error(
          'Please upload a PDF, a Word (.docx) file or a plain text file. ' +
            'An old .doc file needs saving as .docx first.',
        );
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        toast.error('That file is larger than 10 MB. Please upload a smaller one.');
        return;
      }

      setFileName(file.name);
      setIsReading(true);
      setTeaser(null);

      try {
        setSession(await publicRewriteApi.uploadForRewrite(file));
      } catch (err) {
        toast.error(err.message);
        setSession(null);
      } finally {
        setIsReading(false);
      }
    },
    [toast],
  );

  /**
   * Runs the rewrite against one advert.
   *
   * A signed-in visitor has nothing left to prove, so their rewrite is
   * claimed straight away rather than being held behind a wall they are
   * already past.
   *
   * @param {string} jobId - The advert to rewrite against.
   */
  async function rewrite(jobId) {
    setRewritingJobId(jobId);

    try {
      const result = await publicRewriteApi.rewriteForJob(session.token, jobId);

      if (isAuthenticated) {
        await claim(session.token);
        return;
      }

      publicRewriteApi.rememberSession({ token: session.token, jobTitle: result.jobTitle });
      setTeaser(result);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRewritingJobId(null);
    }
  }

  /**
   * Handles a file dropped onto the zone.
   * @param {React.DragEvent} event - The drop event.
   */
  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    read(event.dataTransfer.files?.[0]);
  }

  if (isClaiming) {
    return (
      <div className="mx-auto grid max-w-6xl place-items-center px-4 py-24">
        <Spinner label="Saving your rewritten CV" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Rewrite your CV for the job you want
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-100">
          Drop the CV you already have. It is read on the spot and scored against every open job,
          best match first. Pick one and it is rewritten to use the words that advert uses — every
          fact stays yours, only the phrasing changes.
        </p>
      </header>

      {/* --- The dropzone ------------------------------------------- */}
      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Drop your existing CV here, or press Enter to choose a file"
        className={[
          'mt-8 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition',
          isDragging
            ? 'border-brand-fuchsia bg-fuchsia-50 dark:bg-fuchsia-500/10'
            : 'border-slate-300 hover:border-slate-400 dark:border-navy-700 dark:hover:border-slate-600',
        ].join(' ')}
      >
        <Sparkle className="h-7 w-7 text-brand-pink" />
        <p className="mt-3 font-medium text-slate-900 dark:text-slate-50">
          {fileName || 'Drop your existing CV here, or click to choose a file'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-100">
          PDF, Word (.docx) or plain text, up to 10 MB. No account needed to see your matches.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => read(event.target.files?.[0])}
      />

      {isReading && (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-100">
          <Spinner label="Reading your CV and scoring every job" />
        </div>
      )}

      {/* --- What the rewrite did, for a visitor with no account ----- */}
      {teaser && <TeaserPanel teaser={teaser} from={location.pathname} />}

      {/* --- The ranked jobs ---------------------------------------- */}
      {session && !isReading && !teaser && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">
              {session.readAs ? `${session.readAs}, here are your matches` : 'Your matches'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-100">
              CV strength {session.strengthScore}/100 · best match first
            </p>
          </div>

          {session.results.length === 0 && (
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-100">
              There are no open jobs to match against just yet. Try again shortly.
            </p>
          )}

          <ul className="mt-5 space-y-4">
            {session.results.map(({ job, match }) => (
              <li key={job._id} className="relative">
                <JobCard job={job} match={match} showSave={false} />

                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={() => rewrite(job._id)}
                    isLoading={rewritingJobId === job._id}
                    disabled={Boolean(rewritingJobId)}
                  >
                    <Sparkle className="mr-2 h-4 w-4" />
                    Rewrite my CV for this job
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * What the rewrite did, and the prompt to sign up and read it.
 *
 * Everything here comes from counts and scores. There is no prop on this
 * component that could hold a line of the rewritten CV, which is the
 * design: the wall cannot be leaked past by a careless render because
 * the thing behind it was never sent.
 *
 * @param {{teaser: object, from: string}} props - The summary, and where
 *   to come back to after signing in.
 */
function TeaserPanel({ teaser, from }) {
  const lift = teaser.matchScore - teaser.beforeScore;

  // Carried through the auth pages by the same mechanism every other
  // guarded route uses, so the visitor lands back here and the token in
  // session storage is collected automatically.
  const returnTo = { from: { pathname: from } };

  return (
    <section className="mt-10 overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 sm:px-10 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
            Rewrite ready
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Your CV now matches {teaser.jobTitle} at {teaser.matchScore}%
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-white">
            <span className="text-2xl font-bold text-slate-400">{teaser.beforeScore}%</span>
            <span aria-hidden="true" className="text-slate-500">
              ────▶
            </span>
            <span className="text-3xl font-bold text-fuchsia-300">{teaser.matchScore}%</span>
            {lift > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
                +{lift} points
              </span>
            )}
          </div>

          <p className="mt-4 text-sm text-slate-300">
            {teaser.changeCount} change{teaser.changeCount === 1 ? '' : 's'} were made:
          </p>

          <ul className="mt-3 space-y-2">
            {teaser.changeSummary.map((change) => (
              <li
                key={`${change.section}-${change.kind}`}
                className="flex gap-2.5 text-sm text-slate-200"
              >
                <span aria-hidden="true" className="text-fuchsia-400">
                  •
                </span>
                {describeChange(change)}
              </li>
            ))}
          </ul>

          {teaser.assumedCount > 0 && (
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-400">
              {teaser.assumedCount} of those are skills your CV never mentions, assumed to reach the
              target match. They are labelled as assumptions when you open the CV, and{' '}
              {teaser.honestScore}% of the match above comes from your own experience alone.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="text-sm font-medium text-white">
            Create a free account to read and edit it
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            Your rewritten CV is saved on our side and waiting. It is kept for{' '}
            {teaser.expiresInHours} hours.
          </p>

          <Link
            to="/register"
            state={returnTo}
            className="cvg-gradient-bg cvg-glow cvg-glow-hover mt-5 block rounded-full px-6 py-3 text-center text-sm font-bold text-white transition hover:opacity-95"
          >
            Create account and open it
          </Link>

          <Link
            to="/login"
            state={returnTo}
            className="mt-3 block text-center text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * The four-point sparkle used on the rewrite actions.
 * @param {{className?: string}} props - Styling for the icon.
 */
function Sparkle({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2l1.9 5.6a3 3 0 001.9 1.9L21.4 11.4a.6.6 0 010 1.1l-5.6 1.9a3 3 0 00-1.9 1.9L12 22l-1.9-5.6a3 3 0 00-1.9-1.9L2.6 12.5a.6.6 0 010-1.1l5.6-1.9a3 3 0 001.9-1.9z" />
      <path d="M19 2l.7 2.1a1.2 1.2 0 00.7.7L22.5 5.5a.3.3 0 010 .5l-2.1.7a1.2 1.2 0 00-.7.7L19 9.5l-.7-2.1a1.2 1.2 0 00-.7-.7L15.5 6a.3.3 0 010-.5l2.1-.7a1.2 1.2 0 00.7-.7z" />
    </svg>
  );
}
