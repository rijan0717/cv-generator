import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/useTheme.js';

/** How long the count-up takes, in milliseconds. */
const DURATION_MS = 1200;

/**
 * Turns a percentage into a colour on a red-to-green scale.
 *
 * The hue wheel runs red (0) → amber (60) → green (120), so multiplying the
 * percentage by 1.2 lands 0% on red, 50% on amber and 100% on green with no
 * lookup table. Dark mode keeps the same hue but lifts the lightness,
 * because a mid-lightness colour that reads well on white is too dim on a
 * near-black background.
 *
 * @param {number} percent - A value from 0 to 100.
 * @param {boolean} isDark - Whether dark mode is active.
 * @returns {string} A CSS colour.
 */
function scoreColour(percent, isDark) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = clamped * 1.2;
  return isDark ? `hsl(${hue} 80% 62%)` : `hsl(${hue} 72% 40%)`;
}

/**
 * Counts from 0 up to `target` once the component mounts.
 *
 * A mount happens on every fresh page load, so a manual reload replays the
 * animation rather than showing a static number. Someone who has asked their
 * system for reduced motion gets the final value immediately instead.
 *
 * @param {number} target - The value to count up to.
 * @returns {number} The value for this frame.
 */
function useCountUp(target) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setValue(target);
      return undefined;
    }

    const start = performance.now();

    /**
     * One animation frame: work out how far through we are and ease it.
     * @param {number} now - The timestamp the browser passes in.
     */
    function step(now) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      // Ease-out cubic, so the number slows as it approaches its value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    }

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return value;
}

/**
 * One headline figure on the landing page: a label, a number that counts up
 * from zero, and a bar underneath. Both the number and the bar are coloured
 * by the value itself — red at the bottom of the scale, amber in the middle,
 * green at the top — so the figure reads as good or bad before it is read
 * as a number.
 *
 * @param {{label: string, value: number, outOf?: number, suffix?: string}} props
 *   `value` is the figure itself; `outOf` shows a denominator (82/100) and
 *   `suffix` shows a unit (76%). The bar always represents value/outOf.
 */
export default function ScoreStat({ label, value, outOf = 100, suffix = '' }) {
  const { isDark } = useTheme();
  const current = useCountUp(value);

  const percent = (current / outOf) * 100;
  const colour = scoreColour(percent, isDark);

  return (
    <div className="min-w-[8.5rem] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>

      {/* The animated number is decorative detail on top of the same value,
          so a screen reader is given the final figure once, not every frame. */}
      <dd
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: colour }}
        aria-label={`${value}${suffix || ` out of ${outOf}`}`}
      >
        <span aria-hidden="true">
          {Math.round(current)}
          {suffix}
          {!suffix && (
            <span className="text-base font-medium text-slate-500 dark:text-slate-400">
              /{outOf}
            </span>
          )}
        </span>
      </dd>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: colour }}
        />
      </div>
    </div>
  );
}
