import { useEffect, useRef, useState } from 'react';

/**
 * Counts a number up from zero the first time it scrolls into view.
 *
 * Built on IntersectionObserver and requestAnimationFrame rather than an
 * animation library, for the same reason `Reveal` is: no dependency, and
 * no work done on every scroll event. It runs once and then stops
 * watching — a figure that re-counted every time it scrolled past would
 * be a distraction rather than an effect.
 *
 * Anyone whose system asks for reduced motion gets the final number
 * immediately, with no counting at all. So does anyone on a browser with
 * no IntersectionObserver.
 *
 * @param {number} target - The number to finish on.
 * @param {number} [durationMs] - How long the count takes.
 * @returns {{ref: React.RefObject<HTMLElement>, value: number}} Attach
 *   `ref` to the element holding the number, and render `value`.
 */
export default function useCountUp(target, durationMs = 900) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    // Zero never needs animating, and counting to it looks broken.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || target === 0 || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      return undefined;
    }

    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();

        const started = performance.now();

        const tick = (now) => {
          const elapsed = now - started;
          // Ease out, so it slows into the final number instead of
          // stopping dead on it.
          const progress = Math.min(1, elapsed / durationMs);
          const eased = 1 - (1 - progress) ** 3;

          setValue(Math.round(target * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      // Without this a figure still counting when the user navigates away
      // keeps setting state on an unmounted component.
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  return { ref, value };
}
