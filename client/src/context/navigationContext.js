import { createContext } from 'react';

/**
 * The admin's published header and footer links.
 *
 * The context object lives apart from its provider for the same reason
 * `authContext.js` does: Fast Refresh can only update a module that
 * exports components alone.
 *
 * The default is two empty lists, so anything rendered outside the
 * provider — a test mounting one component — reads the same shape as
 * everything else rather than crashing on `undefined.header`.
 */
export const NavigationContext = createContext({ header: [], footer: [] });

export default NavigationContext;
