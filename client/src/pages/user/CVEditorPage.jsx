import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { useToast } from '../../context/useToast.js';
import { useAutosave } from '../../utils/useAutosave.js';
import CVContentForm from '../../components/cv/CVContentForm.jsx';
import CustomisePanel from '../../components/cv/CustomisePanel.jsx';
import CVPreview from '../../components/cv/CVPreview.jsx';
import ExportMenu from '../../components/cv/ExportMenu.jsx';
import ImportDialog from '../../components/cv/ImportDialog.jsx';
import ReviewPrompt from '../../components/cv/ReviewPrompt.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The fields that are sent on a save. Server-managed fields are excluded. */
const SAVED_FIELDS = [
  'title',
  'templateKey',
  'settings',
  'personal',
  'summary',
  'education',
  'experience',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
  'referencesOnRequest',
];

/**
 * The CV editor: content on the left, live preview on the right.
 *
 * One piece of state, `cv`, feeds both the form and the preview, so the
 * preview cannot drift out of step with what has been typed. Saving is
 * debounced by `useAutosave`.
 */
export default function CVEditorPage() {
  const { id } = useParams();
  const toast = useToast();

  const [cv, setCv] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('content');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    cvApi
      .getCV(id)
      .then((loaded) => {
        if (!cancelled) setCv(loaded);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Sends only the editable fields to the server. */
  const save = useCallback(
    async (current) => {
      if (!current) return;

      const patch = Object.fromEntries(SAVED_FIELDS.map((field) => [field, current[field]]));
      await cvApi.updateCV(id, patch);
    },
    [id],
  );

  const { status, error: saveError, saveNow } = useAutosave(cv, save);

  // A failed save is the one thing here the user must be told about. A
  // successful one is not: the status beside the title already says
  // "Saved", and a toast every time typing pauses would be unbearable.
  useEffect(() => {
    if (saveError) toast.error(`Could not save: ${saveError}`);
  }, [saveError, toast]);

  /**
   * Opens the review section after a download.
   *
   * It is shown every time, for every format and every template. There is
   * deliberately no "ask once" rule: the prompt is part of the download
   * flow rather than a one-off survey, and it can always be dismissed
   * without answering.
   *
   * The prompt loads any review the user has already left, so rating again
   * updates that one instead of being refused as a duplicate.
   */
  function askForReview() {
    setIsReviewOpen(true);
  }

  /**
   * Merges a change from the form or the customisation panel.
   * @param {object} patch - The fields that changed.
   */
  function handleChange(patch) {
    setCv((current) => ({ ...current, ...patch }));
  }

  /**
   * Uploads a new CV photo. This is a separate endpoint, so it saves
   * immediately rather than waiting for autosave.
   * @param {File} file - The chosen image.
   */
  async function handlePhotoChange(file) {
    try {
      const updated = await cvApi.uploadCVPhoto(id, file);
      setCv((current) => ({ ...current, personal: updated.personal }));
      toast.success('Your photo has been added to this CV.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your CV" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{loadError}</Alert>
        <Link to="/cvs" className="mt-6 inline-block">
          <Button variant="secondary">Back to my CVs</Button>
        </Link>
      </div>
    );
  }

  return (
    // From large screens up the editor is a workspace exactly the height
    // of the content pane: the header stays put and the form and the
    // preview each scroll on their own, side by side. Letting the whole
    // pane scroll as well put one scrollbar inside another.
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:flex lg:h-full lg:flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/cvs"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            &larr; My CVs
          </Link>
          <input
            value={cv.title}
            onChange={(e) => handleChange({ title: e.target.value })}
            aria-label="CV title"
            className="mt-1 block w-full truncate rounded-lg border-0 bg-transparent px-0 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus status={status} />
          <Button variant="secondary" size="sm" onClick={saveNow}>
            Save now
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen((open) => !open)}>
            Import
          </Button>

          <span className="hidden h-5 w-px bg-slate-300 sm:block" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Download</span>
          <ExportMenu cvId={id} onDownloaded={askForReview} />
        </div>
      </div>

      {isReviewOpen && (
        <div className="mt-4">
          <ReviewPrompt context={'Downloaded ' + cv.title} onClose={() => setIsReviewOpen(false)} />
        </div>
      )}

      {isImportOpen && (
        <div className="mt-4">
          <ImportDialog
            cvId={id}
            onClose={() => setIsImportOpen(false)}
            onApply={(patch) => {
              handleChange(patch);
              setIsImportOpen(false);
              setTab('content');
            }}
          />
        </div>
      )}

      {/* `minmax(0,1fr)` rows let the panes shrink to the space left and
          scroll, instead of growing to their content. The minimum height
          keeps them usable when an open import dialog takes the room
          above — the pane as a whole scrolls in that case. */}
      <div className="mt-6 grid gap-6 lg:min-h-[24rem] lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        {/* Left: content or customisation. The tabs stay in view; only
            the form below them scrolls. */}
        <div className="min-w-0 lg:flex lg:flex-col">
          <div className="mb-4 flex gap-2" role="tablist">
            {[
              { key: 'content', label: 'Content' },
              { key: 'design', label: 'Design' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition',
                  tab === item.key
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* `relative` for the same reason as on the content pane: it keeps
              the `sr-only` button labels inside this scroller. `pr-2`
              keeps the cards' edge off the scrollbar. */}
          <div className="relative lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            {tab === 'content' ? (
              <CVContentForm cv={cv} onChange={handleChange} onPhotoChange={handlePhotoChange} />
            ) : (
              <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <CustomisePanel cv={cv} onChange={handleChange} />
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview. It no longer needs to be sticky — its
            pane does not move when the form scrolls, and a multi-page CV
            scrolls within its own grey box. */}
        <div className="min-w-0 lg:flex lg:flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              A4 &middot; 210 &times; 297 mm
            </span>
          </div>

          <div className="rounded-xl lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain bg-slate-200/60 dark:bg-slate-800/60 p-4">
            <CVPreview cv={cv} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The "Saving… / Saved" indicator.
 * @param {{status: 'idle'|'saving'|'saved'|'error'}} props
 */
function SaveStatus({ status }) {
  const labels = {
    idle: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Not saved',
  };

  const colours = {
    idle: 'text-slate-500 dark:text-slate-400',
    saving: 'text-slate-500 dark:text-slate-400',
    saved: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <span className={`text-sm ${colours[status]}`} role="status">
      {labels[status]}
    </span>
  );
}
