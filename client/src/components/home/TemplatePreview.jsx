import { getTemplate } from '../../templates/index.js';
import { buildTemplateVariables } from '../../templates/templateUtils.js';
import { sampleFor } from './sampleCv.js';

/** True A4 width in CSS pixels, matching the editor preview. */
const A4_WIDTH_PX = 793.7;

/** A4 is 1:√2, so the height follows from the width. */
const A4_RATIO = 297 / 210;

/**
 * A miniature of one template, rendered from the real component.
 *
 * Everything on this page that looks like a screenshot is actually the
 * live template at true A4 size, scaled down with a CSS transform. A
 * screenshot would go stale the moment a template changed; this cannot.
 *
 * @param {{templateKey: string, width?: number, className?: string,
 *          style?: object}} props
 */
export default function TemplatePreview({ templateKey, width = 240, className = '', style }) {
  const { Component } = getTemplate(templateKey);
  const cv = sampleFor(templateKey);

  const scale = width / A4_WIDTH_PX;

  return (
    <div
      className={`overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-900/10 ${className}`}
      style={{ width, height: Math.round(width * A4_RATIO), ...style }}
      // The CV is decorative here; the surrounding copy carries the
      // meaning, and reading a whole fictional CV aloud would be noise.
      aria-hidden="true"
    >
      <div
        style={{
          ...buildTemplateVariables(cv.settings),
          width: `${A4_WIDTH_PX}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <Component cv={cv} />
      </div>
    </div>
  );
}
