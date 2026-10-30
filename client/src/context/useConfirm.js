import { useContext } from 'react';
import { ConfirmContext } from './confirmContext.js';

/**
 * Reads the confirm dialog.
 *
 * Returns a function that opens a centred "are you sure?" modal and
 * resolves to true (confirmed) or false (cancelled), so it reads like the
 * browser's own `window.confirm` but matches the rest of the application:
 *
 *   if (!(await confirm({ title: 'Delete CV?', message: '…', danger: true }))) return;
 *
 * @returns {(options: {title: string, message?: string, confirmLabel?: string,
 *            cancelLabel?: string, danger?: boolean}) => Promise<boolean>}
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (context === null) {
    throw new Error('useConfirm must be used inside a <ConfirmProvider>');
  }

  return context;
}

export default useConfirm;
