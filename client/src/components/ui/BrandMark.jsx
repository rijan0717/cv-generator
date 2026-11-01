/**
 * The SmartCV logo: the CV mark, then the wordmark.
 *
 * One component rather than markup repeated in the header, the footer and
 * the auth pages, because a logo that is pasted in three places is a logo
 * that is three slightly different logos by the third change.
 *
 * The mark is the supplied CV artwork, `/public/cv-icon.jpg`. The same file
 * is the favicon in `index.html`, so the tab and the header show one image
 * rather than two drawings of it.
 */

/** Pixel sizes for the mark's tile, by `size`. */
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
 * The CV mark: the supplied artwork from `/public/cv-icon.jpg`.
 *
 * Still exported as `BrandSpark` — the name the rest of the codebase
 * imports it by — although it is no longer a spark.
 *
 * It is the file as given, not a redrawing of it. Two consequences worth
 * knowing: the artwork carries its own white background, so there is no
 * brand gradient behind it to see and none is applied; and it is a raster
 * image, so the tile is kept small enough that a 700px source has pixels
 * to spare at every size used here.
 *
 * `object-contain` rather than `cover`, because a square logo cropped to
 * fill a square is a logo with its edges cut off.
 *
 * @param {{className?: string}} props
 */
export function BrandSpark({ className = '' }) {
  return (
    <img
      src="/cv-icon.jpg"
      alt=""
      aria-hidden="true"
      className={['shrink-0 bg-white object-contain', className].join(' ')}
    />
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
