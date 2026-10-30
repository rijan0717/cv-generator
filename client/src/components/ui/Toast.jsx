import { useEffect, useRef, useState } from 'react';

/**
 * The stack of toasts in the bottom-right corner, and one toast in it.
 *
 * Accessibility notes, because a message that appears on its own is easy to
 * get wrong for anyone not watching that corner:
 *
 * - An error is `role="alert"` (announced at once); anything else is
 *   `role="status"` (announced when the screen reader is next free). That
 *   is the same split `<Alert>` makes.
 * - The close button is a real button with a label, so the message can be
 *   dismissed from the keyboard rather than only waited out.
 * - Hovering or focusing a toast stops its clock. Reading a long error
 *   should not be a race.
 * - `print:hidden`, so a toast can never appear in a printed page or in a
 *   PDF rendered through the print route.
 */

/**
 * The message text itself carries the colour — green for something that
 * worked, red for something that did not — so the outcome is readable
 * without waiting for the words. The background stays a pale tint of the
 * same hue so the text keeps its contrast in both themes.
 */
const VARIANTS = {
  success: {
    box: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    // A tick.
    path: 'M4.5 12.5l5 5 10-11',
  },
  error: {
    box: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800',
    icon: 'text-red-600 dark:text-red-400',
    // An exclamation mark in a circle.
    path: 'M12 7v6m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  },
  info: {
    box: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800',
    icon: 'text-sky-600 dark:text-sky-400',
    // An "i" in a circle.
    path: 'M12 11v6m0-10h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  },
};

/**
 * One message.
 *
 * @param {{toast: {id: string, message: string, variant: string, duration: number},
 *          onDismiss: (id: string) => void}} props
 */
function Toast({ toast, onDismiss }) {
  const style = VARIANTS[toast.variant] ?? VARIANTS.info;

  const [isPaused, setIsPaused] = useState(false);

  // How much of the toast's life is left. It is a ref rather than state
  // because changing it must not redraw the toast — it is only read when a
  // pause ends and the clock is started again.
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    // `duration: 0` means "stay until the user closes it".
    if (isPaused || toast.duration <= 0) return undefined;

    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);

    return () => {
      clearTimeout(timer);
      // Keep what was left, so hovering pauses rather than restarts.
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [isPaused, toast.duration, toast.id, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`cvg-toast pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${style.box}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <svg
        className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={style.path} />
      </svg>

      <p className="min-w-0 flex-1 break-words">{toast.message}</p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss message"
        className="-mr-1 -mt-1 shrink-0 rounded p-1 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * The fixed corner the toasts live in.
 *
 * `pointer-events-none` on the container with `pointer-events-auto` on each
 * toast, so the empty space in the corner never swallows a click meant for
 * the page underneath. `flex-col-reverse` puts the newest message nearest
 * the corner, where the eye already is.
 *
 * @param {{toasts: Array<object>, onDismiss: (id: string) => void}} props
 */
export default function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col-reverse gap-2 print:hidden">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
