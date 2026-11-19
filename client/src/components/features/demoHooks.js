import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * The timing behind the feature-page demos.
 *
 * Hooks only, kept apart from the components in `demoKit.jsx` so each
 * file exports one kind of thing — which is also what React's fast
 * refresh needs in order to reload a component without losing its state.
 *
 * Both hooks honour `prefers-reduced-motion`: they stop, and the demo
 * renders its finished state, which is the single most useful frame to
 * be left looking at.
 */

/**
 * Steps a demo through a fixed cycle of phases.
 *
 * The whole animation becomes "which phase are we on", which can be read
 * top to bottom in the component that uses it — the same shape as the
 * home page's hero demos, with the bookkeeping in one place.
 *
 * `durations` must be a constant defined outside the component: a fresh
 * array on every render would restart the timer on every render, and the
 * demo would never advance.
 *
 * @param {Array<number>} durations - How long each phase lasts, in ms.
 * @returns {number} The index of the current phase.
 */
export function useDemoCycle(durations) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;

    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % durations.length);
    }, durations[index]);

    return () => clearTimeout(timer);
  }, [index, durations, reduced]);

  return reduced ? durations.length - 1 : index;
}

/**
 * Types a string out, character by character, then holds and repeats.
 *
 * @param {string} text - The full string.
 * @param {{speed?: number, hold?: number}} [options] - Typing speed, and
 *   how long the finished string stays before it starts again.
 * @returns {{shown: string, isDone: boolean}} What to render now.
 */
export function useTypewriter(text, { speed = 45, hold = 2200 } = {}) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;

    const isDone = count >= text.length;
    const timer = setTimeout(() => setCount(isDone ? 0 : count + 1), isDone ? hold : speed);

    return () => clearTimeout(timer);
  }, [count, text, speed, hold, reduced]);

  if (reduced) return { shown: text, isDone: true };

  return { shown: text.slice(0, count), isDone: count >= text.length };
}
