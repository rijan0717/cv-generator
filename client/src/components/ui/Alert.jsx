/**
 * Coloured message box for errors, successes and information.
 *
 * Errors use `role="alert"` so a screen reader announces them as soon as
 * they appear, which matters for form validation messages.
 *
 * @param {{variant?: 'error'|'success'|'info', children: React.ReactNode,
 *          className?: string}} props
 */
const VARIANTS = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export default function Alert({ variant = 'info', children, className = '' }) {
  if (!children) return null;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-4 py-3 text-sm ring-1 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
