/**
 * The "open to work" marker.
 *
 * Green on purpose, and the same green everywhere it appears, because it
 * is the one thing an employer scans a directory for. The text says it in
 * words as well, so it does not rely on colour alone.
 *
 * @param {{className?: string, size?: 'sm'|'lg'}} props
 */
export default function OpenToWorkBadge({ className = '', size = 'sm' }) {
  const sizing = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900 ${sizing} ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Open to work
    </span>
  );
}
