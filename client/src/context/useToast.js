import { useContext } from 'react';
import { ToastContext } from './toastContext.js';

/**
 * Reads the toast context.
 *
 * Every message the application shows in passing — a login that worked, a
 * form the server refused, a CV that was deleted — goes through here, so
 * that feedback appears in one place on screen instead of a different box
 * on every page.
 *
 * @returns {{show: Function, success: Function, error: Function,
 *            info: Function, dismiss: Function, dismissAll: Function}}
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }

  return context;
}

export default useToast;
