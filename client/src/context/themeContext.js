import { createContext } from 'react';

/**
 * The theme context object.
 *
 * Kept apart from the provider component so that ThemeContext.jsx exports
 * only components, which is what React Fast Refresh requires.
 *
 * @type {React.Context<null|object>}
 */
export const ThemeContext = createContext(null);

export default ThemeContext;
