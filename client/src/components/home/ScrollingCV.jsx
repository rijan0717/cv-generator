import { useEffect, useRef, useState } from 'react';
import CVPreview from '../cv/CVPreview.jsx';

/** How fast the page moves, in pixels per second. Slow enough to read. */
const SPEED = 30;

/** How long it rests at the top and at the bottom, in milliseconds. */
const PAUSE_MS = 2000;

/**
 * A CV shown in a fixed-height box that slowly scrolls from top to bottom
 * and back, so the whole page can be seen without the box taking up the
 * whole screen.
 *
 * How it works:
 *   1. The box has a fixed height and scrolls its content.
 *   2. Each animation frame moves the scroll position down by SPEED x the
 *      time since the last frame, so the speed is the same on fast and
 *      slow screens.
 *   3. At the bottom it waits, jumps back to the top, waits, and starts
 *      again.
 *
 * It stops while the pointer is over it, so a visitor can scroll it
 * themselves. It runs for everyone, including systems set to reduce
 * motion: the movement is slow and stays inside one small box, and
 * Windows turns that setting on whenever "Animation effects" is off,
 * which left the preview frozen for many visitors.
 *
 * @param {{cv: object, height?: number}} props - The CV and the box height in px.
 */
export default function ScrollingCV({ cv, height = 460 }) {
  const boxRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || isPaused) return undefined;

    let frame = 0;
    let timer = 0;
    let last = 0;
    // Fractions of a pixel are kept here, because the browser rounds
    // scrollTop and a slow speed would otherwise never move it.
    let position = box.scrollTop;

    /** Step 2: move down a little each frame. */
    function step(now) {
      const elapsed = last ? (now - last) / 1000 : 0;
      last = now;

      const bottom = box.scrollHeight - box.clientHeight;
      position = Math.min(bottom, position + SPEED * elapsed);
      box.scrollTop = position;

      if (position >= bottom) {
        // Step 3: rest at the bottom, go back to the top, rest, repeat.
        timer = window.setTimeout(() => {
          position = 0;
          box.scrollTop = 0;
          last = 0;
          timer = window.setTimeout(() => {
            frame = requestAnimationFrame(step);
          }, PAUSE_MS);
        }, PAUSE_MS);
        return;
      }

      frame = requestAnimationFrame(step);
    }

    // Start after a pause, so the top of the CV is read first.
    timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, PAUSE_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isPaused]);

  return (
    <div
      ref={boxRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ height }}
      className="mx-auto max-w-md overflow-y-auto rounded-md border border-slate-200 bg-white [scrollbar-width:none] dark:border-slate-700 [&::-webkit-scrollbar]:hidden"
    >
      <CVPreview cv={cv} />
    </div>
  );
}
