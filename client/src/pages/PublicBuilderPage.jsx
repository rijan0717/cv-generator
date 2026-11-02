import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  startDraft,
  withTemplate,
  rememberDraft,
  rememberedDraft,
  forgetDraft,
  saveDraftToAccount,
} from '../utils/publicDraft.js';
import { useAuth } from '../context/useAuth.js';
import { useToast } from '../context/useToast.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';
import TemplateGallery from '../components/templates/TemplateGallery.jsx';
import useOfferedTemplates from '../components/templates/useOfferedTemplates.js';
import CVContentForm from '../components/cv/CVContentForm.jsx';
import CVPreview from '../components/cv/CVPreview.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * How long after the last keystroke the draft is written to the browser.
 *
 * The same 1.5 seconds the signed-in builder autosaves on, so the two
 * feel like one tool. Writing on every keystroke would serialise the
 * whole CV a few hundred times a minute for no benefit.
 */
const SAVE_DEBOUNCE_MS = 1500;

/**
 * "Create your CV": the builder, before there is an account to put it in.
 *
 * A visitor picks a design, types their details into the same form the
 * signed-in builder uses, and watches the same live A4 preview. What
 * they cannot do is take the file away — the export is where the account
 * is asked for, because that is the first moment the site is being asked
 * to produce something rather than to show something.
 *
 * The gate sits there for an honest reason rather than an arbitrary one.
 * The PDF is rendered by Puppeteer against a saved CV the server can
 * check the owner of, so there is no anonymous export to withhold: the
 * CV has to belong to somebody before it can be printed. Asking at that
 * point is the truth about how the feature works.
 *
 * **Nothing is sent anywhere until they sign up.** The draft lives in
 * `localStorage`, so a visitor who never creates an account leaves no
 * record of their CV on the server at all. That is a stronger promise
 * than the rewrite funnel can make, and it is worth making — this page
 * collects a real person's name, phone number and address.
 */
export default function PublicBuilderPage() {
  useDocumentMeta({
    title: 'Create your CV',
    description:
      'Pick a design, fill in your details and watch your CV build itself. Free, no account ' +
      'needed until you want to download it.',
  });

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isCheckingSession } = useAuth();
  const { templates, isLoading: isLoadingTemplates } = useOfferedTemplates();

  const [draft, setDraft] = useState(() => rememberedDraft());
  const [step, setStep] = useState(() => (rememberedDraft() ? 'write' : 'design'));
  const [isSaving, setIsSaving] = useState(false);
  const [showWall, setShowWall] = useState(false);
  const saveTimer = useRef(null);

  // Keep the browser's copy in step with what is on screen, debounced.
  // The draft is the only copy there is until an account claims it, so
  // losing it to a closed tab would mean losing the work.
  useEffect(() => {
    if (!draft) return undefined;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => rememberDraft(draft), SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimer.current);
  }, [draft]);

  /**
   * Saves the draft to the account and opens it in the real builder.
   *
   * Shared by the two ways of getting here: pressing the button while
   * already signed in, and coming back from registering with a draft
   * still in the browser.
   */
  const keep = useCallback(
    async (toKeep) => {
      setIsSaving(true);

      try {
        const saved = await saveDraftToAccount(toKeep);
        forgetDraft();
        toast.success('Your CV is saved. Download it from the Export menu.');
        navigate(`/cvs/${saved._id}`);
      } catch (err) {
        toast.error(err.message);
        setIsSaving(false);
      }
    },
    [navigate, toast],
  );

  // Coming back from registering or logging in. The draft was left in
  // the browser, so it can be put on the new account without the visitor
  // having to find it again.
  useEffect(() => {
    if (isCheckingSession || !isAuthenticated) return;

    const waiting = rememberedDraft();
    if (waiting) keep(waiting);
  }, [isAuthenticated, isCheckingSession, keep]);

  /**
   * Merges a patch from the content form into the draft.
   * @param {object} patch - The changed fields.
   */
  function update(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  /**
   * Chooses a design. The first choice starts the draft; a later one
   * re-skins what has already been written.
   *
   * @param {object} template - The chosen template.
   */
  function chooseTemplate(template) {
    setDraft((current) =>
      current ? withTemplate(current, template.key) : startDraft(template.key),
    );
    setStep('write');
  }

  if (isSaving) {
    return (
      <div className="mx-auto grid max-w-6xl place-items-center px-4 py-24">
        <Spinner label="Saving your CV to your account" />
      </div>
    );
  }

  // --- Step one: pick a design ------------------------------------------
  if (step === 'design' || !draft) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Create your CV
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-100">
            Start by choosing a design. It opens already filled in with sample content, so you
            replace what is there rather than facing an empty form — and you can change the design
            later without losing a word. No account needed until you download it.
          </p>
        </header>

        {isLoadingTemplates ? (
          <div className="mt-12 grid place-items-center">
            <Spinner label="Loading the templates" />
          </div>
        ) : (
          <div className="mt-8">
            <TemplateGallery templates={templates} onChoose={chooseTemplate} />
          </div>
        )}
      </div>
    );
  }

  // --- Step two: write it ------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Create your CV
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-100">
            Type over the sample content. Nothing is sent anywhere — your CV stays in this browser
            until you choose to keep it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('design')}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:text-slate-100 dark:ring-navy-700 dark:hover:bg-navy-800"
          >
            Change design
          </button>

          <Button onClick={() => (isAuthenticated ? keep(draft) : setShowWall(true))}>
            Download my CV
          </Button>
        </div>
      </header>

      {showWall && !isAuthenticated && (
        <SignUpWall from={location.pathname} onDismiss={() => setShowWall(false)} />
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <CVContentForm
            cv={draft}
            onChange={update}
            onPhotoChange={() =>
              toast.error(
                'A photo can be added once your CV is saved to an account — it has to be ' +
                  'uploaded somewhere, and nothing on this page is uploaded yet.',
              )
            }
          />
        </div>

        {/* Sticky, so the document stays in view while the form below it
            is scrolled. Watching it fill in is the point of the page. */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
            <CVPreview cv={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The prompt shown when a visitor asks for the file.
 *
 * It says what is about to happen to their draft, because a wall that
 * appears without explanation reads as a trick — and in this case the
 * explanation is reassuring: the CV they have written is kept and put on
 * the account, not thrown away and started again.
 *
 * @param {{from: string, onDismiss: () => void}} props - Where to return
 *   to after signing in, and how to close the prompt.
 */
function SignUpWall({ from, onDismiss }) {
  // The same mechanism every guarded route uses, so the visitor lands
  // back here and the draft in the browser is picked up automatically.
  const returnTo = { from: { pathname: from } };

  return (
    <section className="mt-6 overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 sm:px-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            Create a free account to download it
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Your CV is rendered to PDF on our side so the file matches what you see exactly, and
            that needs somewhere to keep it. Creating an account takes a moment and the CV you have
            just written comes with you — nothing is retyped.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-slate-300">
            {[
              'PDF, Word and Excel export, free and without a watermark',
              'As many CVs as you want, kept and editable',
              'A strength score out of 100, and job matching',
            ].map((point) => (
              <li key={point} className="flex gap-2.5">
                <span aria-hidden="true" className="text-fuchsia-400">
                  •
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <Link
            to="/register"
            state={returnTo}
            className="cvg-gradient-bg cvg-glow cvg-glow-hover block rounded-full px-6 py-3 text-center text-sm font-bold text-white transition hover:opacity-95"
          >
            Create account and download
          </Link>

          <Link
            to="/login"
            state={returnTo}
            className="mt-3 block text-center text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
          >
            I already have an account
          </Link>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 block w-full text-center text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            Not yet — keep editing
          </button>
        </div>
      </div>
    </section>
  );
}
