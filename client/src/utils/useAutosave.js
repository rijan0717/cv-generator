import { useEffect, useRef, useState, useCallback } from 'react';

/** How long to wait after the last keystroke before saving. */
const DEBOUNCE_MS = 1500;

/**
 * Debounced autosave.
 *
 * Saving on every keystroke would flood the server, so changes are collected
 * and sent 1.5 seconds after typing stops. Three details make this behave
 * properly rather than merely work:
 *
 * - **The first render never saves.** Loading a CV sets state, and without
 *   this guard that would immediately save the CV back unchanged.
 * - **Only one request is in flight at a time.** If the user keeps typing
 *   while a save is running, the next save is queued rather than racing.
 * - **The pending timer is flushed on unmount**, so navigating away straight
 *   after typing does not silently lose the last edit.
 *
 * @param {*} value - The data to save; a change to it schedules a save.
 * @param {(value: *) => Promise<void>} onSave - Performs the save.
 * @returns {{status: 'idle'|'saving'|'saved'|'error', error: string,
 *            saveNow: () => Promise<void>}}
 */
export function useAutosave(value, onSave) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const isFirstRun = useRef(true);
  const isSavingRef = useRef(false);
  const pendingRef = useRef(false);

  // Keep the latest value and callback in refs so the save function does not
  // need to be rebuilt (and the timer restarted) on every render.
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);
  valueRef.current = value;
  onSaveRef.current = onSave;

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // A save is already running: mark that another is needed and let the
    // running one start it when it finishes.
    if (isSavingRef.current) {
      pendingRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');
    setError('');

    try {
      await onSaveRef.current(valueRef.current);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    } finally {
      isSavingRef.current = false;

      if (pendingRef.current) {
        pendingRef.current = false;
        saveNow();
      }
    }
  }, []);

  useEffect(() => {
    // Do not save the value we were just given on mount.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return undefined;
    }

    setStatus('idle');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, saveNow]);

  // Flush anything still pending when the component goes away.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        onSaveRef.current(valueRef.current).catch(() => {});
      }
    },
    [],
  );

  return { status, error, saveNow };
}

export default useAutosave;
