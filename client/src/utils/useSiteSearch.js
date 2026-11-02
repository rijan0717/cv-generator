import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import { searchSite } from '../api/search.js';
import {
  MIN_QUERY,
  SEARCH_GROUPS,
  mergeResults,
  searchStatic,
  serverResults,
} from './siteSearch.js';

/** How long typing has to pause before the server is asked. */
const DEBOUNCE_MS = 250;

/**
 * Searches the whole site as the user types.
 *
 * The static half answers on every keystroke. The server half waits for
 * a short pause in typing, and each new request cancels the one before,
 * so a slow answer to "re" can never arrive after — and overwrite — the
 * answer to "react".
 *
 * @param {string} query - What has been typed.
 * @param {string} scope - A key from SEARCH_SCOPES.
 * @param {number} perGroup - The most rows per group.
 * @returns {{groups: Array<object>, isLoading: boolean, isTooShort: boolean}}
 */
export function useSiteSearch(query, scope, perGroup) {
  const { user, isAuthenticated } = useAuth();
  const trimmed = query.trim();
  const isTooShort = trimmed.length < MIN_QUERY;

  const [remote, setRemote] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Only these scopes have anything on the server.
  const askServer =
    scope === 'all' || SEARCH_GROUPS.some((group) => group.server && group.key === scope);
  // "Pages" is both: the site's own pages here, the admin's on the server.
  const serverType = scope === 'all' ? 'all' : scope;

  useEffect(() => {
    if (isTooShort || !(askServer || scope === 'pages')) {
      setRemote({});
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = setTimeout(() => {
      searchSite(trimmed, serverType, { signal: controller.signal })
        .then((data) => {
          setRemote(
            serverResults(data, {
              canSeeDirectory: user?.role === 'admin' || user?.accountType === 'employer',
            }),
          );
          setIsLoading(false);
        })
        .catch((error) => {
          // A cancelled request is a newer one taking over, not a failure.
          if (error.name === 'CanceledError') return;
          setRemote({});
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, isTooShort, askServer, scope, serverType, user]);

  const local = useMemo(
    () => searchStatic(trimmed, { isAuthenticated }),
    [trimmed, isAuthenticated],
  );

  const groups = useMemo(
    () => (isTooShort ? [] : mergeResults(local, remote, scope, perGroup)),
    [isTooShort, local, remote, scope, perGroup],
  );

  return { groups, isLoading, isTooShort };
}

export default useSiteSearch;
