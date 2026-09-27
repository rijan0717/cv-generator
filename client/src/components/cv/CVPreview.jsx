import { useLayoutEffect, useRef, useState } from 'react';
import { getTemplate } from '../../templates/index.js';
import { buildTemplateVariables } from '../../templates/templateUtils.js';

/** An A4 page is 210mm wide, which is 793.7px at the CSS 96dpi reference. */
const A4_WIDTH_PX = 793.7;

/**
 * Renders a CV in its chosen template, scaled down to fit the space
 * available.
 *
 * The template itself is always laid out at true A4 size. Only a CSS
 * `transform: scale()` shrinks it for the screen, so what the user sees is
 * geometrically identical to the PDF — nothing reflows at a smaller size,
 * which is exactly the trap that makes previews disagree with their exports.
 *
 * @param {{cv: object, className?: string}} props
 */
export default function CVPreview({ cv, className = '' }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(0);
  const pageRef = useRef(null);

  // Measured in a layout effect so the first paint is already at the right
  // scale, rather than flashing at full size.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    /** Recomputes the scale factor from the container's current width. */
    function measure() {
      const available = container.clientWidth;
      const next = Math.min(1, available / A4_WIDTH_PX);
      setScale(next);

      if (pageRef.current) {
        setPageHeight(pageRef.current.offsetHeight * next);
      }
    }

    measure();

    // The panel can be resized by the window or by the layout changing, so
    // observe the container rather than only listening for window resizes.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (pageRef.current) observer.observe(pageRef.current);

    return () => observer.disconnect();
  }, [cv]);

  const { Component } = getTemplate(cv.templateKey);
  const variables = buildTemplateVariables(cv.settings);

  return (
    <div ref={containerRef} className={className}>
      {/* The outer box takes the scaled height, so the page that follows in
          the document flow is not overlapped by the un-scaled original. */}
      <div style={{ height: pageHeight || undefined, overflow: 'hidden' }}>
        <div
          ref={pageRef}
          style={{
            ...variables,
            width: `${A4_WIDTH_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Component cv={cv} />
        </div>
      </div>
    </div>
  );
}
