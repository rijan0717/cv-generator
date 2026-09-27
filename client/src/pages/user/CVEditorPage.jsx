import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { useAutosave } from '../../utils/useAutosave.js';
import CVContentForm from '../../components/cv/CVContentForm.jsx';
import CustomisePanel from '../../components/cv/CustomisePanel.jsx';
import CVPreview from '../../components/cv/CVPreview.jsx';
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

  const [cv, setCv] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('content');
  const [photoError, setPhotoError] = useState('');

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
    setPhotoError('');
    try {
      const updated = await cvApi.uploadCVPhoto(id, file);
      setCv((current) => ({ ...current, personal: updated.personal }));
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-500">
        <Spinner label="Loading your CV" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{loadError}</Alert>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button variant="secondary">Back to my CVs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
            &larr; My CVs
          </Link>
          <input
            value={cv.title}
            onChange={(e) => handleChange({ title: e.target.value })}
            aria-label="CV title"
            className="mt-1 block w-full truncate rounded-lg border-0 bg-transparent px-0 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-3">
          <SaveStatus status={status} />
          <Button variant="secondary" size="sm" onClick={saveNow}>
            Save now
          </Button>
        </div>
      </div>

      {saveError && (
        <Alert variant="error" className="mt-3">
          Could not save: {saveError}
        </Alert>
      )}
      {photoError && (
        <Alert variant="error" className="mt-3">
          {photoError}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: content or customisation */}
        <div>
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
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'content' ? (
            <CVContentForm cv={cv} onChange={handleChange} onPhotoChange={handlePhotoChange} />
          ) : (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <CustomisePanel cv={cv} onChange={handleChange} />
            </div>
          )}
        </div>

        {/* Right: live preview, kept in view while the form scrolls */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
            <span className="text-xs text-slate-500">A4 &middot; 210 &times; 297 mm</span>
          </div>

          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl bg-slate-200/60 p-4">
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
    idle: 'text-slate-500',
    saving: 'text-slate-500',
    saved: 'text-emerald-600',
    error: 'text-red-600',
  };

  return (
    <span className={`text-sm ${colours[status]}`} role="status">
      {labels[status]}
    </span>
  );
}
