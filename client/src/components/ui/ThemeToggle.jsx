import { useTheme } from '../../context/useTheme.js';

/**
 * The theme switch in the navigation bar: Light ⇄ Orange.
 *
 * Both themes are light themes, so the icon is a sun in both. What it
 * does is spelled out in the label and the tooltip.
 */
export default function ThemeToggle() {
  const { isOrange, toggle } = useTheme();

  const label = isOrange ? 'Switch to the light theme' : 'Switch to the orange theme';

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Theme: ${isOrange ? 'Orange' : 'Light'}`}
      aria-label={label}
      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:text-slate-100 dark:hover:bg-navy-800 dark:focus-visible:outline-slate-100"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
