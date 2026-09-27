import { useContext } from 'react';
import { ThemeContext } from './themeContext.js';

/**
 * Reads the theme context.
 * @returns {{theme: 'light'|'dark'|'system', isDark: boolean,
 *            setTheme: Function, toggle: Function}}
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error('useTheme must be used inside a <ThemeProvider>');
  }

  return context;
}

export default useTheme;
