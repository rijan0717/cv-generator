import Spinner from './Spinner.jsx';

/**
 * The single button used across the application, so every button has the same
 * focus ring, disabled state and loading behaviour.
 *
 * @param {{variant?: 'primary'|'secondary'|'ghost'|'danger',
 *          size?: 'sm'|'md'|'lg', isLoading?: boolean, className?: string,
 *          children: React.ReactNode}} props
 */
const VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-slate-900',
  secondary:
    'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-900',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      // A button that is loading must also be unclickable, or a slow network
      // lets the user submit the same form twice.
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}
