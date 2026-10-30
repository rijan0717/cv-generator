/**
 * Holds the transient messages shown in the bottom-right corner.
 *
 * Before this, every page kept its own `error` / `success` string and drew
 * its own coloured box somewhere in the layout, which meant the feedback
 * for the same kind of event appeared in a different place on every screen
 * — and on a long form, often above the fold the user was not looking at.
 * A toast always arrives in the same corner, says its piece and leaves.
 *
 * A message that the user must keep reading (a page that failed to load,
 * so there is nothing else on screen) is NOT a toast: it still uses
 * `<Alert>` in the body of the page, because a notice that disappears
 * would leave an empty page with no explanation.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ui/Toast.jsx';

import { ToastContext } from './toastContext.js';

/**
 * How long each kind of message stays, in milliseconds.
 *
 * An error gets longer than a success: "Saved" is confirming something the
 * user just did and already expects, while an error has to be read and
 * understood before it can be acted on.
 */
const DURATIONS = { success: 4000, info: 5000, error: 7000 };

/** Never stack more than this; older messages are dropped as new ones arrive. */
const MAX_VISIBLE = 4;

/**
 * Provides the toast queue and the functions that add to it.
 * @param {{children: React.ReactNode}} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // A counter rather than a random id: it is enough to be unique within one
  // page load, which is all a toast ever lives for.
  const lastId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  /**
   * Queues a message.
   *
   * @param {string} message What to say. An empty message is ignored, so a
   *   caller can pass a possibly-empty error string without checking first.
   * @param {'success'|'error'|'info'} [variant]
   * @param {{duration?: number}} [options] `duration: 0` keeps it until the
   *   user closes it.
   * @returns {string|null} The id, for dismissing it early.
   */
  const show = useCallback((message, variant = 'info', options = {}) => {
    const text = typeof message === 'string' ? message.trim() : String(message ?? '').trim();
    if (!text) return null;

    lastId.current += 1;
    const toast = {
      id: `toast-${lastId.current}`,
      message: text,
      variant: variant in DURATIONS ? variant : 'info',
      duration: options.duration ?? DURATIONS[variant] ?? DURATIONS.info,
    };

    setToasts((list) => {
      // The same message twice — a double-clicked button, a retry that
      // failed the same way — is one message said again, not two stacked
      // copies, so the earlier one is replaced and its clock restarts.
      const withoutDuplicate = list.filter(
        (existing) => !(existing.message === toast.message && existing.variant === toast.variant),
      );
      return [...withoutDuplicate, toast].slice(-MAX_VISIBLE);
    });

    return toast.id;
  }, []);

  const success = useCallback((message, options) => show(message, 'success', options), [show]);
  const error = useCallback((message, options) => show(message, 'error', options), [show]);
  const info = useCallback((message, options) => show(message, 'info', options), [show]);

  // The queue itself is deliberately not in the context value: only this
  // provider draws the toasts, so a new message must not re-render every
  // component that happens to use the hook.
  const value = useMemo(
    () => ({ show, success, error, info, dismiss, dismissAll }),
    [show, success, error, info, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
