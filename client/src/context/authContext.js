import { createContext } from 'react';

/**
 * The authentication context object.
 *
 * It lives in its own file, apart from the provider component, because React
 * Fast Refresh can only update a module that exports components alone. Keep
 * the context here and the provider in AuthContext.jsx.
 *
 * @type {React.Context<null|object>}
 */
export const AuthContext = createContext(null);

export default AuthContext;
