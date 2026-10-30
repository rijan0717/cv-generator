import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmContext } from './confirmContext.js';
import Button from '../components/ui/Button.jsx';

/**
 * Provides `useConfirm()`: one centred confirmation modal for the whole app.
 *
 * It replaces `window.confirm`, which the browser draws at the top of the
 * window in its own style, with a modal in the middle of the screen that
 * looks like the rest of the application.
 *
 * Built on the native `<dialog>` opened with `showModal()`, as the template
 * preview is: the browser dims the page, keeps keyboard focus inside the
 * dialog, and closes it on Escape — which counts as "Cancel".
 *
 * Only one question is asked at a time. `confirm()` returns a promise, and
 * the answer is handed back by resolving it.
 *
 * @param {{children: React.ReactNode}} props
 */
export function ConfirmProvider({ children }) {
  const dialogRef = useRef(null);
  const resolveRef = useRef(null);
  const [request, setRequest] = useState(null);

  /** Opens the dialog and waits for the answer. */
  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        // A question still open is answered "no" before the new one is shown.
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setRequest(options);
      }),
    [],
  );

  /** Closes the dialog and hands the answer back to whoever asked. */
  const answer = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  // Open and close the native dialog in step with `request`. `showModal` is
  // missing in the test environment, where the `open` attribute stands in.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (request && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!request && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [request]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        aria-describedby={request?.message ? 'confirm-message' : undefined}
        // Escape fires `cancel`; it is treated exactly like pressing Cancel.
        onCancel={(event) => {
          event.preventDefault();
          answer(false);
        }}
        // A click on the dimmed backdrop lands on the dialog element itself.
        onClick={(event) => event.target === dialogRef.current && answer(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl ring-1 ring-slate-200 backdrop:bg-slate-900/50 dark:bg-slate-900 dark:ring-slate-700"
      >
        {request && (
          <div className="p-6">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {request.title}
            </h2>
            {request.message && (
              <p id="confirm-message" className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {request.message}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => answer(false)}>
                {request.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={request.danger ? 'danger' : 'primary'}
                onClick={() => answer(true)}
                autoFocus
              >
                {request.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
