/**
 * Light and dark theme.
 *
 * Three states are supported rather than two: `light`, `dark`, and `system`,
 * which follows the operating system and keeps following it if the user
 * changes that setting while the page is open. `system` is the default,
 * because an application that ignores the preference someone has already
 * expressed is being presumptuous.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './themeContext.js';

/** Where the choice is remembered between visits. */
const STORAGE_KEY = 'cvg-theme';

/**
 * Reads the saved preference.
 *
 * localStorage throws in a private window with site data blocked, so the
 * read is guarded: failing to remember a theme must never stop the
 * application rendering.
 *
 * @returns {'light'|'dark'|'system'}
 */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Adds or removes the `dark` class on <html>, which is what every
 * `dark:` utility in the application responds to.
 * @param {boolean} isDark - Whether dark mode should be active.
 */
function applyDarkClass(isDark) {
  document.documentElement.classList.toggle('dark', isDark);

  // Tells the browser to render built-in controls (scrollbars, form
  // widgets, the date picker) in the matching scheme.
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

/**
 * Provides the theme to the component tree.
 * @param {{children: React.ReactNode}} props
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  // Whether dark is actually showing right now, which is not the same as
  // the preference: `system` resolves to one or the other.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');

    /** Works out whether dark should be on, and applies it. */
    function resolve() {
      const next = theme === 'dark' || (theme === 'system' && query.matches);
      setIsDark(next);
      applyDarkClass(next);
    }

    resolve();

    // Only follow the system while the preference is actually `system`.
    if (theme !== 'system') return undefined;

    query.addEventListener('change', resolve);
    return () => query.removeEventListener('change', resolve);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembering the choice is survivable; the app still works.
    }
  }, []);

  /** Flips between light and dark, resolving `system` to its opposite. */
  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const value = useMemo(
    () => ({ theme, isDark, setTheme, toggle }),
    [theme, isDark, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
