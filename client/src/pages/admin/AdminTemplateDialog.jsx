import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../../templates/index.js';
import { sampleFor } from '../../templates/sampleCV.js';
import TemplateThumbnail from '../../components/templates/TemplateThumbnail.jsx';
import Button from '../../components/ui/Button.jsx';

/**
 * A large preview of one template with the admin's controls beside it.
 *
 * The user's preview dialog and this one show the same page at the same
 * size on purpose: an admin deciding whether to offer a template should be
 * looking at what a user would see, not at a row of text. What differs is
 * the panel beside it — the user gets "Use this template", the admin gets
 * the name shown in the picker, the description and whether it is offered
 * at all.
 *
 * Built on the native `<dialog>` element opened with `showModal()`, which
 * holds focus, closes on Escape and blocks the page underneath without any
 * of that being written by hand.
 *
 * @param {{template: object|null, onClose: () => void,
 *          onSave: (payload: object) => void, isSaving?: boolean,
 *          error?: string, isLastActive?: boolean}} props
 *   Rendered closed while `template` is null. `isLastActive` disables the
 *   deactivate button: the server refuses to switch off the last active
 *   template, and saying so before the click is kinder than an error after.
 */
export default function AdminTemplateDialog({
  template,
  onClose,
  onSave,
  isSaving = false,
  error,
  isLastActive = false,
}) {
  const dialogRef = useRef(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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

  // Refill the fields whenever a different template is opened, so the
  // dialog never shows the previous one's text.
  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setDescription(template.description);
  }, [template]);

  const category = CATEGORIES.find((entry) => entry.key === template?.category);
  const isEdited =
    template && (name.trim() !== template.name || description.trim() !== template.description);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="admin-template-title"
      className="w-[min(960px,calc(100vw-2rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      {template && (
        <div className="grid max-h-[calc(100vh-4rem)] md:grid-cols-[minmax(0,1fr)_20rem]">
          {/* The page itself, scrolling on its own if the window is short. */}
          <div className="overflow-y-auto bg-slate-100 p-4 sm:p-6 dark:bg-slate-800">
            <div className="mx-auto max-w-[520px] shadow-lg">
              <TemplateThumbnail cv={sampleFor(template.key)} eager />
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {category?.label ?? 'Template'}
                </p>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {template.key}
                </code>
              </div>
              <h2 id="admin-template-title" className="mt-1 text-xl font-bold">
                {template.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {template.usesPhoto ? 'Shows the photo' : 'No photo'} &middot;{' '}
                {template.isTwoColumn ? 'Two columns' : 'Single column'}
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSave({ name: name.trim(), description: description.trim() });
              }}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="admin-template-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Name in the picker
                </label>
                <input
                  id="admin-template-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={60}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-template-description"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Description
                </label>
                <textarea
                  id="admin-template-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
                />
              </div>

              <Button type="submit" size="sm" isLoading={isSaving} disabled={!isEdited}>
                Save wording
              </Button>
            </form>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {template.isActive
                  ? 'Offered to users in the picker.'
                  : 'Hidden from the picker. CVs already using it are unaffected.'}
              </p>
              {template.isActive && isLastActive && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This is the last active template, so it cannot be switched off.
                </p>
              )}
              <Button
                variant="secondary"
                isLoading={isSaving}
                disabled={template.isActive && isLastActive}
                onClick={() => onSave({ isActive: !template.isActive })}
              >
                {template.isActive ? 'Hide from users' : 'Offer to users'}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
