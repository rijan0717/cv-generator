/**
 * The two themes: Light and Orange.
 *
 *   - **Light** (the default): wine and cream.
 *   - **Orange**: a light-grey page, white cards, black text and orange
 *     buttons.
 *
 * The Orange theme is switched on by a `theme-orange` class on <html>.
 * Tailwind's `dark:` variant is configured to respond to that class (see
 * `tailwind.config.js`), so every `dark:` utility in the application is
 * the Orange theme's styling; the colour values are in `src/index.css`.
 *
 * **Light is the default.** Neither theme is a dark mode, so there is no
 * operating-system setting to follow. Anyone who wants Orange has the
 * switch in the header, and the choice is remembered.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './themeContext.js';

/** Where the choice is remembered between visits. */
const STORAGE_KEY = 'cvg-theme';

/** The themes, in the order the Settings page lists them. */
const THEMES = ['light', 'orange'];

/**
 * Reads the saved preference.
 *
 * A saved `dark` is from before the Orange theme replaced the dark one, so
 * it becomes `orange`; anything else unknown (including the old `system`)
 * falls back to light. localStorage throws in a private window with site
 * data blocked, so the read is guarded: failing to remember a theme must
 * never stop the application rendering.
 *
 * @returns {'light'|'orange'}
 */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return 'orange';
    return THEMES.includes(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Adds or removes the `theme-orange` class on <html>.
 * @param {boolean} isOrange - Whether the Orange theme should be on.
 */
function applyThemeClass(isOrange) {
  document.documentElement.classList.toggle('theme-orange', isOrange);
}

/**
 * Provides the theme to the component tree.
 * @param {{children: React.ReactNode}} props
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const isOrange = theme === 'orange';

  useEffect(() => applyThemeClass(isOrange), [isOrange]);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembering the choice is survivable; the app still works.
    }
  }, []);

  /** Flips between the two themes. */
  const toggle = useCallback(() => {
    setTheme(isOrange ? 'light' : 'orange');
  }, [isOrange, setTheme]);

  const value = useMemo(
    () => ({ theme, isOrange, setTheme, toggle }),
    [theme, isOrange, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
