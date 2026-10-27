/**
 * A person's photo, falling back to the first letter of their name.
 *
 * Most accounts have no photo, so the fallback is the normal case rather
 * than an edge case, and a broken image icon in a directory of people
 * looks like a fault in the page.
 *
 * @param {{name: string, src?: string, size?: 'md'|'lg'}} props
 */
export default function Avatar({ name, src, size = 'md' }) {
  const dimensions = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-xl';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dimensions} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400`}
    >
      {name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}
