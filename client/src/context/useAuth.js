import { useContext } from 'react';
import { AuthContext } from './authContext.js';

/**
 * Reads the authentication context.
 *
 * Kept in its own file rather than beside the provider so that the provider
 * module only exports components, which is what React Fast Refresh needs to
 * update the tree without losing state.
 *
 * @returns {{user: object|null, isLoading: boolean, isAuthenticated: boolean,
 *            isAdmin: boolean, login: Function, register: Function,
 *            logout: Function, setUser: Function}}
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return context;
}

export default useAuth;
