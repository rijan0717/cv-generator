import { createContext } from 'react';

/**
 * The toast context object.
 *
 * Kept apart from the provider component so that ToastContext.jsx exports
 * only components, which is what React Fast Refresh requires — the same
 * arrangement as the authentication and theme contexts.
 *
 * @type {React.Context<null|object>}
 */
export const ToastContext = createContext(null);

export default ToastContext;
