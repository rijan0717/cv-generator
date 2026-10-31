/**
 * Holds the logged-in user for the whole application.
 *
 * The session itself lives in an httpOnly cookie that JavaScript cannot read,
 * so this context cannot simply look the user up locally. Instead it asks the
 * server on start-up (`GET /api/auth/me`) and keeps the answer in state. It
 * asks again when the user returns to the tab, and drops the user as soon as
 * any request is refused with 401, so an expired session never looks live.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as authApi from '../api/auth.js';
import { setSessionExpiredHandler } from '../api/axios.js';

import { AuthContext } from './authContext.js';
import { useToast } from './useToast.js';

/** How often, at most, returning to the tab re-checks the session (1 minute). */
const SESSION_RECHECK_MS = 60 * 1000;

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

  const toast = useToast();

  // Read inside event handlers that are set up once, so they always see the
  // current user without being re-registered on every change.
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * Ends a session the server no longer accepts: the cookie expired, the
   * account was blocked or deleted. Clearing the user sends guarded pages
   * to the login screen and the header back to its logged-out state.
   */
  const expireSession = useCallback(
    (message = 'Your session has expired. Please log in again.') => {
      if (userRef.current === null) return; // already logged out: say nothing
      userRef.current = null;
      setUser(null);
      toast.info(message);
    },
    [toast],
  );

  // Any API call answered with 401 means the session is over.
  useEffect(() => setSessionExpiredHandler(() => expireSession()), [expireSession]);

  // A tab left open for days still holds the user from when it was loaded.
  // When the user comes back to it, ask the server again whether the
  // session is still valid (at most once per SESSION_RECHECK_MS).
  useEffect(() => {
    let lastCheck = Date.now();

    const recheck = () => {
      if (document.visibilityState !== 'visible' || userRef.current === null) return;
      if (Date.now() - lastCheck < SESSION_RECHECK_MS) return;
      lastCheck = Date.now();

      authApi
        .getCurrentUser()
        .then((currentUser) => setUser(currentUser))
        .catch((error) => {
          // 401 is already handled by the axios interceptor. 403 means the
          // admin blocked the account; a network error leaves things as they are.
          if (error.response?.status === 403) expireSession(error.message);
        });
    };

    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [expireSession]);

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

  const loginWithGoogle = useCallback(async (credential) => {
    const result = await authApi.googleLogin(credential);
    setUser(result.user);
    return result;
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
      loginWithGoogle,
      logout,
      setUser,
    }),
    [user, isLoading, login, register, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
