import { useEffect, useRef } from 'react';
import { CATEGORIES } from '../../templates/index.js';
import { sampleFor } from '../../templates/sampleCV.js';
import TemplateThumbnail from './TemplateThumbnail.jsx';
import Button from '../ui/Button.jsx';

/**
 * A large preview of one template, with the button that starts a CV in it.
 *
 * Built on the native `<dialog>` element opened with `showModal()`, which
 * gives the behaviour a modal needs without writing it by hand: focus
 * moves into the dialog and is held there, Escape closes it, and the rest
 * of the page cannot be clicked or tabbed to underneath.
 *
 * @param {{template: object|null, onClose: () => void, onUse: (template: object) => void,
 *          isBusy?: boolean, error?: string}} props
 *   Rendered closed while `template` is null.
 */
export default function TemplatePreviewDialog({ template, onClose, onUse, isBusy = false, error }) {
  const dialogRef = useRef(null);

  // Open and close the native dialog in step with the `template` prop.
  // `showModal` is missing in the test environment, where the dialog is
  // simply left open as ordinary markup.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (template && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!template && dialog.open) {
      dialog.close?.();
    }
  }, [template]);

  const category = CATEGORIES.find((entry) => entry.key === template?.category);

  return (
    <dialog
      ref={dialogRef}
      // Escape and the browser's own close both arrive here, so the parent
      // hears about every way the dialog can be dismissed.
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself, not on
      // anything inside it.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="template-preview-title"
      className="w-[min(960px,calc(100vw-2rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      {template && (
        <div className="grid max-h-[calc(100vh-4rem)] md:grid-cols-[minmax(0,1fr)_18rem]">
          {/* The page itself, scrolling on its own if the window is short. */}
          <div className="overflow-y-auto bg-slate-100 p-4 sm:p-6 dark:bg-slate-800">
            <div className="mx-auto max-w-[520px] shadow-lg">
              <TemplateThumbnail cv={sampleFor(template.key)} eager />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {category?.label ?? 'Template'}
              </p>
              <h2 id="template-preview-title" className="mt-1 text-xl font-bold">
                {template.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {template.description}
              </p>
            </div>

            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li>{template.usesPhoto ? 'Shows your photo' : 'No photo'}</li>
              <li>{template.isTwoColumn ? 'Two-column layout' : 'Single-column layout'}</li>
              {category && <li>{category.hint}</li>}
            </ul>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shown with sample content. Colours, fonts and sections can all be changed after you
              start.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => onUse(template)} isLoading={isBusy}>
                Use this template
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
