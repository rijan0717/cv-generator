import { createContext } from 'react';

/**
 * The confirm-dialog context object.
 *
 * Kept apart from the provider component so that ConfirmContext.jsx
 * exports only components, which is what React Fast Refresh requires —
 * the same arrangement as the toast and authentication contexts.
 *
 * @type {React.Context<null|Function>}
 */
export const ConfirmContext = createContext(null);

export default ConfirmContext;
