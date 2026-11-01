/**
 * Light and dark theme.
 *
 * Three states are supported rather than two: `light`, `dark`, and `system`,
 * which follows the operating system and keeps following it if the user
 * chooses it and then changes that setting while the page is open.
 *
 * **`light` is the default**, not `system`. This is a document tool, and a
 * CV is white paper whatever the interface around it is doing: starting
 * everybody on the light theme means the page and the thing being edited
 * agree on their first meeting. It also removes a flash — nothing can set
 * the `dark` class before React mounts, so a `system` default on a dark
 * machine painted light and then snapped dark. Anyone who wants dark has
 * the switch in the header, and the choice is remembered.
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
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light';
  } catch {
    return 'light';
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
