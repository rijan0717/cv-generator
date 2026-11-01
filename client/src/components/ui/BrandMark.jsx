/**
 * The SmartCV logo: the "AI" spark, then the wordmark.
 *
 * One component rather than markup repeated in the header, the footer and
 * the auth pages, because a logo that is pasted in three places is a logo
 * that is three slightly different logos by the third change.
 *
 * The spark is the same shape as the favicon in `index.html`. It is drawn
 * as an inline SVG rather than loaded as a file so it needs no request, can
 * take its size from the surrounding text, and keeps its gradient crisp at
 * any scale.
 *
 * The gradient is lightened in dark mode. Violet #7c3aed is a mid-tone that
 * reads well on white but sits too close to a slate-950 page to be legible,
 * so the dark theme starts the ramp two steps brighter instead.
 */

/** Pixel sizes for the spark tile, by `size`. */
const TILE = {
  sm: 'h-7 w-7 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

/** Type sizes for the wordmark, by `size`. */
const WORD = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-3xl',
};

/**
 * The gradient, as a text fill. Reused by the wordmark and by any heading
 * that wants the same accent.
 *
 * It is one authored class from `index.css`, not a string of Tailwind
 * utilities, and deliberately so: built from utilities, a theme that fails
 * to generate them leaves `text-transparent` behind on its own and the
 * text disappears. `.cvg-gradient-text` carries its own colour and its own
 * fallback for a browser that cannot clip a background to text.
 */
export const BRAND_TEXT_GRADIENT = 'cvg-gradient-text';

/**
 * The four-point spark on its gradient tile.
 * @param {{className?: string}} props
 */
export function BrandSpark({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'grid shrink-0 place-items-center cvg-gradient-bg shadow-sm shadow-fuchsia-500/30',
        className,
      ].join(' ')}
    >
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none" aria-hidden="true">
        {/* The large spark, and a small one beside it: two points of light
            rather than one is what reads as "generated" instead of
            "starred". */}
        <path d="M16 5.5l2.3 6.2L24.5 14l-6.2 2.3L16 22.5l-2.3-6.2L7.5 14l6.2-2.3z" fill="#fff" />
        <circle cx="24.6" cy="23.6" r="2.3" fill="#fff" fillOpacity="0.85" />
      </svg>
    </span>
  );
}

/**
 * The full logo.
 *
 * @param {{size?: 'sm'|'md'|'lg', withWordmark?: boolean, className?: string}} props
 *   `withWordmark` false leaves just the spark, for a narrow header.
 */
export default function BrandMark({ size = 'md', withWordmark = true, className = '' }) {
  return (
    <span className={['inline-flex items-center gap-2.5', className].join(' ')}>
      <BrandSpark className={TILE[size]} />

      {withWordmark && (
        <span className={['cvg-wordmark leading-none', WORD[size], BRAND_TEXT_GRADIENT].join(' ')}>
          SmartCV
        </span>
      )}
    </span>
  );
}
