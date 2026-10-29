import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getTemplate } from '../../templates/index.js';
import {
  buildTemplateVariables,
  PAGE_GEOMETRY_MM,
  MM_TO_PX,
} from '../../templates/templateUtils.js';

/** An A4 page is 210mm wide, which is 793.7px at the CSS 96dpi reference. */
const A4_WIDTH_PX = PAGE_GEOMETRY_MM.width * MM_TO_PX;

/**
 * The first page of a CV in one template, drawn at thumbnail size.
 *
 * It is the real template, not a screenshot: the CV is laid out at full A4
 * width and shrunk with `transform: scale()`, which is the same technique
 * the editor's preview uses. A thumbnail therefore cannot drift from what
 * the template actually produces — there is no image to forget to update.
 *
 * Laying out a whole CV is not free, and the gallery shows every template
 * at once, so a thumbnail draws nothing until it is about to scroll into
 * view. After that it stays drawn; un-drawing it on the way back out would
 * only make scrolling up flicker.
 *
 * @param {{cv: object, eager?: boolean}} props - `eager` draws immediately,
 *   for a single large preview that is always on screen.
 */
export default function TemplateThumbnail({ cv, eager = false }) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [isNear, setIsNear] = useState(eager);

  // The scale depends on the card's width, which depends on the grid, so
  // it is measured rather than assumed — and re-measured when the window
  // or the sidebar changes size.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const measure = () => setWidth(frame.clientWidth);
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Start drawing a little before the card arrives, so a normal scroll
  // never shows a blank page.
  useEffect(() => {
    if (isNear) return undefined;

    // Without IntersectionObserver (an old browser, or the test
    // environment) every thumbnail is drawn straight away.
    if (typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [isNear]);

  const { Component } = getTemplate(cv.templateKey);
  const scale = width / A4_WIDTH_PX;

  return (
    <div
      ref={frameRef}
      // The A4 ratio is held by the frame itself, so the grid lines up
      // before any thumbnail has drawn.
      className="relative aspect-[210/297] w-full overflow-hidden bg-white"
    >
      {isNear && width > 0 && (
        <div
          // A picture of a CV, not part of the page: hidden from screen
          // readers (the card around it carries the name), and `inert` so
          // the links inside a template cannot be tabbed to.
          aria-hidden="true"
          inert=""
          style={{
            ...buildTemplateVariables(cv.settings),
            width: `${A4_WIDTH_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <Component cv={cv} />
        </div>
      )}
    </div>
  );
}
