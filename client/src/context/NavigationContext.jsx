import { useState, useEffect } from 'react';
import { NavigationContext } from './navigationContext.js';
import * as contentApi from '../api/content.js';

/**
 * Loads the admin's published header and footer links.
 *
 * Fetched once for the whole application rather than in each of the two
 * components that need them: the header and the footer render together
 * on every page, and two requests for the same handful of links on
 * every navigation would be two too many.
 *
 * A failure is silent and leaves both lists empty. These links are an
 * addition to the navigation, not the navigation itself — an error
 * banner across the top of the site because a blog link could not load
 * would be worse than the link being absent.
 *
 * @param {{children: React.ReactNode}} props
 */
export function NavigationProvider({ children }) {
  const [links, setLinks] = useState({ header: [], footer: [] });

  useEffect(() => {
    let cancelled = false;

    contentApi
      .getNavigation()
      .then((data) => {
        if (!cancelled) setLinks({ header: data.header ?? [], footer: data.footer ?? [] });
      })
      .catch(() => {
        // Left empty on purpose. See above.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <NavigationContext.Provider value={links}>{children}</NavigationContext.Provider>;
}
