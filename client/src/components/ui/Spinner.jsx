/**
 * Small loading indicator used while a page or request is in flight.
 * @param {{label?: string, className?: string}} props
 */
export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
