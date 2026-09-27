/**
 * Holds the logged-in user for the whole application.
 *
 * The session itself lives in an httpOnly cookie that JavaScript cannot read,
 * so this context cannot simply look the user up locally. Instead it asks the
 * server once on start-up (`GET /api/auth/me`) and keeps the answer in state.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as authApi from '../api/auth.js';

import { AuthContext } from './authContext.js';

/**
 * Provides authentication state and actions to the component tree.
 * @param {{children: React.ReactNode}} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // True until the start-up check finishes. Routes must wait for this,
  // otherwise a logged-in user is briefly bounced to the login page on
  // every page refresh.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    authApi
      .getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {
        // A 401 here is the normal case for a visitor who is not logged in.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedIn = await authApi.login(credentials);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (details) => {
    const created = await authApi.register(details);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear local state even if the request failed, so the user is never
      // stuck looking logged in.
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      setUser,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
