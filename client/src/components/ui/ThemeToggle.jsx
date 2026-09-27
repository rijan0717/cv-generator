import { useTheme } from '../../context/useTheme.js';

/**
 * The light/dark switch in the navigation bar.
 *
 * It is a single button rather than a three-way menu, because that is what
 * people expect. The underlying preference still supports `system`, and the
 * title text says which mode is currently in force so the `system` case is
 * not silently hidden.
 */
export default function ThemeToggle() {
  const { isDark, theme, toggle } = useTheme();

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const current = theme === 'system' ? `system (${isDark ? 'dark' : 'light'})` : theme;

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Theme: ${current}`}
      aria-label={label}
      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:outline-slate-100"
    >
      {/* The icon shows what you will get, not what you have: a moon means
          "go dark". */}
      {isDark ? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
          />
        </svg>
      )}
    </button>
  );
}
